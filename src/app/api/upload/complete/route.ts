import { NextResponse } from "next/server";
import { createReadStream, createWriteStream } from "fs";
import { mkdir, rm, stat } from "fs/promises";
import { pipeline } from "stream/promises";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { videoMetaSchema } from "@/lib/validations";
import { ACCEPTED_IMAGE_TYPES, ACCEPTED_VIDEO_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/constants";
import { saveUploadFile } from "@/lib/storage";
import { COMPRESSION_THRESHOLD_BYTES, maybeEnqueueCompression } from "@/lib/transcode";
import { limit, tooMany } from "@/lib/ratelimit";

const TMP_ROOT = path.join(process.cwd(), "public", "uploads", "tmp");
const VIDEOS_DIR = path.join(process.cwd(), "public", "uploads", "videos");

function safeId(id: string): boolean {
  return /^[A-Za-z0-9_-]{8,128}$/.test(id);
}

/** Bo'laklarni RAM'ga yuklamasdan ketma-ket bitta faylga oqizish. */
async function assemble(uploadId: string, total: number, destAbs: string): Promise<number> {
  const out = createWriteStream(destAbs);
  let bytes = 0;
  const done = new Promise<void>((resolve, reject) => {
    out.on("finish", () => resolve());
    out.on("error", reject);
  });
  try {
    for (let i = 0; i < total; i++) {
      const part = path.join(TMP_ROOT, uploadId, `chunk-${i}.part`);
      const st = await stat(part).catch(() => null);
      if (!st) throw new Error(`missing chunk ${i} — resume upload`);
      bytes += st.size;
      if (bytes > MAX_VIDEO_BYTES + 64 * 1024 * 1024) throw new Error("Video too large (max 2GB)");
      await pipeline(createReadStream(part), out, { end: false });
    }
    out.end();
    await done;
  } catch (e) {
    out.destroy();
    throw e;
  }
  return bytes;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.channel) return NextResponse.json({ error: "Login required" }, { status: 401 });
    // Disk/CPU himoyasi: har bir kanal soatiga 10 yuklash (chunk emas, yakuniy video uchun)
    if (!limit(`upload:${user.channel.id}`, 10, 3600_000)) return tooMany();

    const form = await req.formData();
    const uploadId = String(form.get("uploadId") ?? "");
    const fileName = String(form.get("fileName") ?? "video.mp4");
    const fileType = String(form.get("fileType") ?? "video/mp4");
    const total = Number(form.get("totalChunks") ?? 0);
    if (!safeId(uploadId)) return NextResponse.json({ error: "Bad uploadId" }, { status: 400 });
    if (!Number.isInteger(total) || total <= 0 || total > 512)
      return NextResponse.json({ error: "Bad chunk count" }, { status: 400 });

    const asBool = (k: string) => {
      const raw = form.get(k);
      return raw === "true" || raw === "1" || raw === "on";
    };
    const schedRaw = form.get("scheduledAt");
    const metaRaw = {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      category: String(form.get("category") ?? "General"),
      visibility: String(form.get("visibility") ?? "PUBLIC"),
      madeForKids: asBool("madeForKids"),
      ageRestricted: asBool("ageRestricted"),
      aiGenerated: asBool("aiGenerated"),
      scheduledAt: schedRaw ? String(schedRaw) : null,
    };
    const parsed = videoMetaSchema.safeParse(metaRaw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    // MIME + extension ikkalasi ham valid bo'lishi shart
    if (!ACCEPTED_VIDEO_TYPES.includes(fileType) || !fileName.match(/\.(mp4|webm|ogg|mov|mkv)$/i))
      return NextResponse.json({ error: "Unsupported video format. Use MP4/WebM/MOV/MKV." }, { status: 400 });

    const thumbRaw = form.get("thumbnail");
    let thumbnailUrl: string | null = null;
    if (thumbRaw instanceof File && thumbRaw.size > 0) {
      if (!ACCEPTED_IMAGE_TYPES.includes(thumbRaw.type))
        return NextResponse.json({ error: "Thumbnail must be JPG/PNG/WebP" }, { status: 400 });
      if (thumbRaw.size > MAX_IMAGE_BYTES)
        return NextResponse.json({ error: "Thumbnail too large (max 8MB)" }, { status: 400 });
      const tbuf = Buffer.from(await thumbRaw.arrayBuffer());
      const stored = await saveUploadFile(tbuf, thumbRaw.name, thumbRaw.type, "image");
      thumbnailUrl = stored.url;
    }

    await mkdir(VIDEOS_DIR, { recursive: true });
    const rawExt = path.extname(fileName).toLowerCase();
    const allowedExts = new Set([".mp4", ".webm", ".ogg", ".mov", ".mkv"]);
    const ext = allowedExts.has(rawExt) ? rawExt : ".mp4";
    const finalName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    const finalAbs = path.join(VIDEOS_DIR, finalName);
    let bytes = 0;
    try {
      bytes = await assemble(uploadId, total, finalAbs);
    } catch (e: unknown) {
      await rm(finalAbs, { force: true }).catch(() => undefined);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Assemble failed", resume: true },
        { status: 400 }
      );
    }
    if (bytes > MAX_VIDEO_BYTES) {
      await rm(finalAbs, { force: true }).catch(() => undefined);
      return NextResponse.json({ error: "Video too large (max 2GB)" }, { status: 413 });
    }
    await rm(path.join(TMP_ROOT, uploadId), { recursive: true, force: true }).catch(() => undefined);
    const videoUrl = `/uploads/videos/${finalName}`;

    const needsCompress = bytes > COMPRESSION_THRESHOLD_BYTES;
    let video;
    try {
      video = await db.video.create({
        data: {
          channelId: user.channel.id,
          title: parsed.data.title,
          description: parsed.data.description ?? "",
          category: parsed.data.category,
          visibility: parsed.data.visibility,
          status: needsCompress ? "PROCESSING" : "READY",
          videoUrl,
          thumbnailUrl,
          durationSec: Math.min(86400, Math.max(0, Math.floor(Number(form.get("durationSec") ?? 0) || 0))),
          madeForKids: parsed.data.madeForKids,
          ageRestricted: parsed.data.ageRestricted,
          aiGenerated: parsed.data.aiGenerated,
          scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        },
      });
    } catch (e) {
      // DB yozilmasa orphan fayl qoldirmaslik
      await rm(finalAbs, { force: true }).catch(() => undefined);
      if (thumbnailUrl) {
        await rm(path.join(process.cwd(), "public", thumbnailUrl.replace(/^\//, "")), { force: true }).catch(() => undefined);
      }
      throw e;
    }

    if (needsCompress) maybeEnqueueCompression(video.id, bytes);

    return NextResponse.json({ video });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
