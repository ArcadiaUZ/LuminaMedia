import { spawn } from "child_process";
import { rename, stat, unlink } from "fs/promises";
import path from "path";
import { db } from "./db";

// CPU-based, visually-lossless compression for large uploads.
// Research basis: FFmpeg wiki treats CRF 17–18 as "visually lossless" for
// libx264; true-mathematical-lossless (CRF 0) barely saves space, so CRF 18
// + preset slow is the correct quality-first tradeoff. Pure CPU (libx264),
// no GPU required. faststart keeps web playback instant.

export const COMPRESSION_THRESHOLD_BYTES = 1024 * 1024 * 1024; // 1GB
const MAX_PARALLEL_JOBS = 1; // preset slow saturates CPU — serialize jobs

function ffmpegPath(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const p = require("ffmpeg-static") as string | null;
  if (!p) throw new Error("ffmpeg binary missing (ffmpeg-static not installed)");
  return p;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const child = spawn(ffmpegPath(), args, { windowsHide: true });
    let tail = "";
    child.stderr.on("data", (d: Buffer) => {
      tail = `${tail}${d.toString()}`.slice(-2000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${tail.slice(-500)}`));
    });
    // Safety: never let a stuck encode run forever (default 6h for huge files)
    const maxMs = Number(process.env.TRANSCODE_TIMEOUT_MS ?? 6 * 3600 * 1000);
    const killer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`ffmpeg timed out after ${Math.round((Date.now() - t0) / 1000)}s`));
    }, maxMs);
    killer.unref?.();
    child.on("close", () => clearTimeout(killer));
  });
}

export interface CompressResult {
  compressed: boolean;
  beforeBytes: number;
  afterBytes: number;
}

/** Visually-lossless H.264 re-encode. Keeps original unless output is smaller. */
export async function compressVideoFile(inputAbs: string): Promise<CompressResult> {
  const before = (await stat(inputAbs)).size;
  const outAbs = `${inputAbs}.compressed.mp4`;
  await runFfmpeg([
    "-y",
    "-i",
    inputAbs,
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-movflags",
    "+faststart",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "48000",
    outAbs,
  ]);
  const after = (await stat(outAbs)).size;
  if (after > 0 && after < before) {
    await rename(outAbs, inputAbs);
    return { compressed: true, beforeBytes: before, afterBytes: after };
  }
  await unlink(outAbs).catch(() => {});
  return { compressed: false, beforeBytes: before, afterBytes: after };
}

// ---- background job queue (in-process, serialized) ----

const queue: string[] = [];
let running = 0;

function publicToAbs(urlPath: string): string {
  const rel = urlPath.replace(/^\/+/, "");
  return path.join(process.cwd(), "public", rel);
}

async function processQueue(): Promise<void> {
  if (running >= MAX_PARALLEL_JOBS) return;
  const videoId = queue.shift();
  if (!videoId) return;
  running++;
  try {
    const video = await db.video.findUnique({ where: { id: videoId } });
    if (!video) return;
    const abs = publicToAbs(video.videoUrl);
    try {
      const r = await compressVideoFile(abs);
      console.log(
        `[transcode] ${videoId}: ${Math.round(r.beforeBytes / 1048576)}MB -> ${Math.round(r.afterBytes / 1048576)}MB ${r.compressed ? "(replaced)" : "(kept original)"}`
      );
    } catch (e) {
      console.error(`[transcode] ${videoId} failed, keeping original:`, e);
    }
    await db.video.update({ where: { id: videoId }, data: { status: "READY" } }).catch(() => {});
  } finally {
    running--;
    void processQueue();
  }
}

/** Returns true when a background compression job was queued. */
export function maybeEnqueueCompression(videoId: string, bytes: number): boolean {
  if (bytes <= COMPRESSION_THRESHOLD_BYTES) return false;
  queue.push(videoId);
  void processQueue();
  return true;
}
