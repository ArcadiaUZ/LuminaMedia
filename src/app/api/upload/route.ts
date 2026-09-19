import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { videoMetaSchema } from "@/lib/validations";
import { ACCEPTED_IMAGE_TYPES, ACCEPTED_VIDEO_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/constants";
import { saveUploadFile, saveUploadStream } from "@/lib/storage";
import { COMPRESSION_THRESHOLD_BYTES, maybeEnqueueCompression } from "@/lib/transcode";
import { limit, tooMany } from "@/lib/ratelimit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.channel) return NextResponse.json({ error: "Login required" }, { status: 401 });
    // Disk/CPU himoyasi: har bir kanal soatiga 10 yuklash
    if (!limit(`upload:${user.channel.id}`, 10, 3600_000)) return tooMany();

    // Early guard: reject oversized bodies before buffering them into RAM
    const contentLen = Number(req.headers.get("content-length") ?? 0);
    if (contentLen > MAX_VIDEO_BYTES + MAX_IMAGE_BYTES + 2 * 1024 * 1024)
      return NextResponse.json({ error: "Video too large (max 2GB)" }, { status: 413 });

    const form = await req.formData();
    const videoFile = form.get("video") as File | null;
    const thumbFile = form.get("thumbnail") as File | null;
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
    if (!videoFile || videoFile.size === 0) return NextResponse.json({ error: "Video file required" }, { status: 400 });
    // MIME + extension ikkalasi ham valid bo'lishi shart (biri soxtalansa ikkinchisi tutadi)
    if (!ACCEPTED_VIDEO_TYPES.includes(videoFile.type) || !videoFile.name.match(/\.(mp4|webm|ogg|mov|mkv)$/i))
      return NextResponse.json({ error: "Unsupported video format. Use MP4/WebM/MOV/MKV." }, { status: 400 });
    if (videoFile.size > MAX_VIDEO_BYTES) return NextResponse.json({ error: "Video too large (max 2GB)" }, { status: 413 });

    let thumbnailUrl: string | null = null;
    if (thumbFile && thumbFile.size > 0) {
      if (!ACCEPTED_IMAGE_TYPES.includes(thumbFile.type))
        return NextResponse.json({ error: "Thumbnail must be JPG/PNG/WebP" }, { status: 400 });
      if (thumbFile.size > MAX_IMAGE_BYTES)
        return NextResponse.json({ error: "Thumbnail too large (max 8MB)" }, { status: 413 });
      const tbuf = Buffer.from(await thumbFile.arrayBuffer());
      const stored = await saveUploadFile(tbuf, thumbFile.name, thumbFile.type, "image");
      thumbnailUrl = stored.url;
    }

    const vbuf = videoFile.stream();
    let storedVideo;
    try {
      storedVideo = await saveUploadStream(vbuf, videoFile.name, videoFile.type || "video/mp4", "video", MAX_VIDEO_BYTES + 64 * 1024 * 1024);
    } catch (e) {
      // Orphan thumbnail qolmasligi uchun tozalash
      if (thumbnailUrl) {
        const { rm } = await import("fs/promises");
        const path = await import("path");
        await rm(path.join(process.cwd(), "public", thumbnailUrl.replace(/^\//, "")), { force: true }).catch(() => undefined);
      }
      const msg = e instanceof Error ? e.message : "Upload failed";
      const tooLarge = msg.toLowerCase().includes("too large");
      return NextResponse.json({ error: msg }, { status: tooLarge ? 413 : 500 });
    }

    if (storedVideo.bytes > MAX_VIDEO_BYTES) {
      const { rm } = await import("fs/promises");
      const path = await import("path");
      await rm(path.join(process.cwd(), "public", storedVideo.url.replace(/^\//, "")), { force: true }).catch(() => undefined);
      if (thumbnailUrl) {
        await rm(path.join(process.cwd(), "public", thumbnailUrl.replace(/^\//, "")), { force: true }).catch(() => undefined);
      }
      return NextResponse.json({ error: "Video too large (max 2GB)" }, { status: 413 });
    }

    // 1GB+ videolar fonga CPU-compression'ga yuboriladi (CRF18, sifat yo'qolmaydi);
    // original fayl joyida qoladi, shuning uchun PROCESSING paytida ham ko'rsa bo'ladi
    const needsCompress = storedVideo.bytes > COMPRESSION_THRESHOLD_BYTES;

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
          videoUrl: storedVideo.url,
          thumbnailUrl,
          durationSec: Math.min(86400, Math.max(0, Math.floor(Number(form.get("durationSec") ?? 0) || 0))),
          madeForKids: parsed.data.madeForKids,
          ageRestricted: parsed.data.ageRestricted,
          aiGenerated: parsed.data.aiGenerated,
          scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        },
      });
    } catch (e) {
      // DB yozilmasa orphan fayl qoldirmaslik uchun tozalash
      const { rm } = await import("fs/promises");
      const path = await import("path");
      await rm(path.join(process.cwd(), "public", storedVideo.url.replace(/^\//, "")), { force: true }).catch(() => undefined);
      if (thumbnailUrl) {
        await rm(path.join(process.cwd(), "public", thumbnailUrl.replace(/^\//, "")), { force: true }).catch(() => undefined);
      }
      throw e;
    }

    if (needsCompress) maybeEnqueueCompression(video.id, storedVideo.bytes);

    return NextResponse.json({ video });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
