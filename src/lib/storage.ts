import { createWriteStream } from "fs";
import { mkdir, rm, stat, writeFile } from "fs/promises";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Storage abstraction — MVP uses local disk (public/uploads).
 * Future: implement S3Storage with the same interface + FFmpeg transcoding,
 * adaptive renditions, CDN URLs. Callers must only use saveUploadFile().
 */
export interface StoredFile {
  url: string; // public URL
  bytes: number;
  mime: string;
}

const UPLOAD_ROOT =
  process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), "public", "uploads");

const ALLOWED_VIDEO_EXTS = new Set([".mp4", ".webm", ".ogg", ".mov", ".mkv"]);
const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function sanitizeExt(originalName: string, kind: "video" | "image"): string {
  const ext = path.extname(originalName).toLowerCase();
  const allowed = kind === "video" ? ALLOWED_VIDEO_EXTS : ALLOWED_IMAGE_EXTS;
  if (allowed.has(ext)) return ext;
  return kind === "video" ? ".mp4" : ".jpg";
}

export async function saveUploadFile(
  buf: Buffer,
  originalName: string,
  mime: string,
  kind: "video" | "image"
): Promise<StoredFile> {
  const dir = path.join(UPLOAD_ROOT, kind === "video" ? "videos" : "thumbnails");
  await mkdir(dir, { recursive: true });
  const ext = sanitizeExt(originalName, kind);
  const name = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  await writeFile(path.join(dir, name), buf);
  const url = `/uploads/${kind === "video" ? "videos" : "thumbnails"}/${name}`;
  return { url, bytes: buf.length, mime };
}

/**
 * Katta videolar uchun: File oqimini RAM'ga to'liq yuklamasdan diskka yozadi.
 * Bir vaqtda ko'p yuklashda OOM bo'lmasligi uchun kritik.
 * maxBytes oshsa qisman yozilgan fayl o'chiriladi va xato otadi (disk-fill DoS himoyasi).
 */
export async function saveUploadStream(
  webStream: ReadableStream<Uint8Array>,
  originalName: string,
  mime: string,
  kind: "video" | "image" = "video",
  maxBytes: number = 2 * 1024 * 1024 * 1024 + 64 * 1024 * 1024
): Promise<StoredFile> {
  const dir = path.join(UPLOAD_ROOT, kind === "video" ? "videos" : "thumbnails");
  await mkdir(dir, { recursive: true });
  const ext = sanitizeExt(originalName, kind);
  const name = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  const abs = path.join(dir, name);
  try {
    await pipeline(Readable.fromWeb(webStream as never), createWriteStream(abs));
  } catch (e) {
    await rm(abs, { force: true }).catch(() => undefined);
    throw e;
  }
  const { size } = await stat(abs);
  if (size > maxBytes) {
    await rm(abs, { force: true }).catch(() => undefined);
    throw new Error("Video too large (max 2GB)");
  }
  const url = `/uploads/${kind === "video" ? "videos" : "thumbnails"}/${name}`;
  return { url, bytes: size, mime };
}

// Architecture-ready stubs (not wired in MVP, kept to avoid TODO sprawl)
export type TranscodeJob = { videoId: string; status: "queued" | "done" };
export async function queueTranscode(_videoId: string): Promise<TranscodeJob> {
  // Future: push to queue (BullMQ / Inngest), generate 360p/720p/1080p + HLS.
  return { videoId: _videoId, status: "queued" };
}
