import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { limit, tooMany } from "@/lib/ratelimit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Login required" }, { status: 401 });
    if (!limit(`like:${userId}`, 60, 60_000)) return tooMany();
    let value: unknown = 0;
    try {
      value = (await req.json())?.value ?? 0;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const v = value === -1 ? -1 : value === 1 ? 1 : 0;

    const videoExists = await db.video.findUnique({ where: { id }, select: { id: true } });
    if (!videoExists) return NextResponse.json({ error: "Video not found" }, { status: 404 });

    if (v === 0) {
      await db.videoLike.deleteMany({ where: { videoId: id, userId } });
    } else {
      const prev = await db.videoLike.findUnique({
        where: { videoId_userId: { videoId: id, userId } },
        select: { value: true },
      });
      await db.videoLike.upsert({
        where: { videoId_userId: { videoId: id, userId } },
        create: { videoId: id, userId, value: v },
        update: { value: v },
      });
      // notification to channel owner — must never fail the like itself.
      // Faqat yangi like'da notify (takroriy bosishda spam bo'lmasligi uchun).
      if (!prev) {
        const [video, actor] = await Promise.all([
          db.video.findUnique({ where: { id }, include: { channel: true } }),
          db.user.findUnique({ where: { id: userId } }),
        ]);
        if (video && video.channel.userId !== userId) {
          await db.notification
            .create({
              data: {
                userId: video.channel.userId,
                type: "LIKE",
                title: `@${actor?.username ?? "someone"} liked your video`,
                body: video.title,
                actorUserId: userId,
                videoId: id,
              },
            })
            .catch(() => undefined);
        }
      }
    }

    const [likes, dislikes] = await Promise.all([
      db.videoLike.count({ where: { videoId: id, value: 1 } }),
      db.videoLike.count({ where: { videoId: id, value: -1 } }),
    ]);
    return NextResponse.json({ likes, dislikes, myVote: v });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
