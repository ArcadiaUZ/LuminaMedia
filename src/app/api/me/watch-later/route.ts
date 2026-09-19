import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ items: [], watchLater: [] });
    const history = await db.watchHistory.findMany({
      where: { userId, watchLater: true },
      include: {
        video: {
          include: {
            channel: { select: { id: true, name: true, handle: true, avatarUrl: true, verified: true } },
          },
        },
      },
      orderBy: { watchedAt: "desc" },
      take: 100,
    });
    const watchLater = history.map((h) => h.video);
    return NextResponse.json({ items: history, watchLater });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load watch later" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Login required" }, { status: 401 });
    let videoId: unknown = null;
    try {
      videoId = (await req.json())?.videoId ?? null;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!videoId || typeof videoId !== "string")
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    const videoExists = await db.video.findUnique({ where: { id: videoId }, select: { id: true } });
    if (!videoExists) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    const existing = await db.watchHistory.findUnique({ where: { userId_videoId: { userId, videoId } } });
    if (existing && existing.watchLater) {
      await db.watchHistory.update({ where: { id: existing.id }, data: { watchLater: false } });
      return NextResponse.json({ watchLater: false });
    }
    if (existing) {
      await db.watchHistory.update({ where: { id: existing.id }, data: { watchLater: true } });
      return NextResponse.json({ watchLater: true });
    }
    try {
      await db.watchHistory.create({ data: { userId, videoId, watchLater: true } });
    } catch (e: unknown) {
      // Parallel toggle poygasi (P2002) — upsert sifatida qayta urinish
      const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
      if (code === "P2002") {
        await db.watchHistory.update({
          where: { userId_videoId: { userId, videoId } },
          data: { watchLater: true },
        });
        return NextResponse.json({ watchLater: true });
      }
      throw e;
    }
    return NextResponse.json({ watchLater: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}