import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { videoMetaSchema } from "@/lib/validations";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";
import { saveUploadFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    const video = await db.video.findUnique({
      where: { id },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatarUrl: true,
            verified: true,
            description: true,
            _count: { select: { subscribers: true, videos: true } },
          },
        },
      },
    });
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    // UNLISTED link orqali ochiq; PRIVATE va hali tayyor bo'lmaganlar faqat egasiga
    if (video.visibility === "PRIVATE" || video.status !== "READY") {
      // owner can preview own non-public
      const owner = userId
        ? await db.channel.findFirst({ where: { id: video.channelId, userId } })
        : null;
      if (!owner) return NextResponse.json({ error: "Video unavailable" }, { status: 403 });
    }

    const [likes, dislikes, myLike, subscribed, commentsCount] = await Promise.all([
      db.videoLike.count({ where: { videoId: id, value: 1 } }),
      db.videoLike.count({ where: { videoId: id, value: -1 } }),
      userId ? db.videoLike.findUnique({ where: { videoId_userId: { videoId: id, userId } } }) : null,
      userId
        ? db.subscription.findUnique({
            where: { subscriberUserId_channelId: { subscriberUserId: userId, channelId: video.channelId } },
          })
        : null,
      db.comment.count({ where: { videoId: id } }),
    ]);

    return NextResponse.json({
      video,
      stats: { likes, dislikes, comments: commentsCount, subscribed: !!subscribed, myVote: myLike?.value ?? 0 },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load video" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const video = await db.video.findUnique({ where: { id }, include: { channel: true } });
    if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (video.channel.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // JSON (faqat meta) yoki FormData (meta + thumbnail fayl) — ikkalasi ham qabul qilinadi
    let meta: unknown;
    let thumbFile: File | null = null;
    let removeThumbnail = false;
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const asBool = (k: string) => {
        const raw = form.get(k);
        return raw === "true" || raw === "1" || raw === "on";
      };
      meta = {
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        category: String(form.get("category") ?? "General"),
        visibility: String(form.get("visibility") ?? "PUBLIC"),
        madeForKids: asBool("madeForKids"),
        ageRestricted: asBool("ageRestricted"),
        aiGenerated: asBool("aiGenerated"),
      };
      const tf = form.get("thumbnail");
      if (tf instanceof File && tf.size > 0) thumbFile = tf;
      removeThumbnail = asBool("removeThumbnail");
    } else {
      try {
        meta = await req.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
    }
    const parsed = videoMetaSchema.safeParse(meta);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    // Yangi thumbnail bo'lsa saqlash (upload sahifasidagi kabi validatsiya bilan)
    let thumbnailUrl: string | null | undefined = undefined;
    if (thumbFile) {
      if (!ACCEPTED_IMAGE_TYPES.includes(thumbFile.type))
        return NextResponse.json({ error: "Thumbnail must be JPG/PNG/WebP" }, { status: 400 });
      if (thumbFile.size > MAX_IMAGE_BYTES)
        return NextResponse.json({ error: "Thumbnail too large (max 8MB)" }, { status: 400 });
      const buf = Buffer.from(await thumbFile.arrayBuffer());
      const stored = await saveUploadFile(buf, thumbFile.name, thumbFile.type || "image/jpeg", "image");
      thumbnailUrl = stored.url;
    } else if (removeThumbnail) {
      thumbnailUrl = null;
    }

    const { scheduledAt, ...rest } = parsed.data;
    const { premiere: _omit, ...data } = rest as typeof rest & { premiere?: boolean };
    void _omit;
    const updated = await db.video.update({
      where: { id },
      data: {
        ...data,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
      },
    });
    // Eski thumbnail fayl almashtirilsa/o'chirilsa diskda yetim qolmasin (faqat /uploads/ ichidagilar)
    if (thumbnailUrl !== undefined && video.thumbnailUrl?.startsWith("/uploads/")) {
      const abs = path.join(process.cwd(), "public", video.thumbnailUrl.replace(/^\/+/, ""));
      await unlink(abs).catch(() => undefined);
    }
    return NextResponse.json({ video: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const video = await db.video.findUnique({ where: { id }, include: { channel: true } });
    if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (video.channel.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await db.video.delete({ where: { id } });
    // Diskda yetim fayl qolmasligi uchun best-effort tozalash (xato delete'ni to'xtatmaydi)
    for (const url of [video.videoUrl, video.thumbnailUrl]) {
      if (!url || !url.startsWith("/uploads/")) continue;
      const abs = path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
      await unlink(abs).catch(() => undefined);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
