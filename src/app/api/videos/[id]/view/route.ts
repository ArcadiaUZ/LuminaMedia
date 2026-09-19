import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { clientIp, limit } from "@/lib/ratelimit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();

    let watchedSec = 0;
    try {
      const body = await req.json();
      watchedSec = Number(body.watchedSec ?? body.progressSec ?? body.sec ?? 0) || 0;
    } catch {
      watchedSec = 0;
    }
    // Clientdan kelgan qiymatni chegaralash (manfiy / cheksiz qiymatlar DB'ni buzmasligi uchun)
    watchedSec = Number.isFinite(watchedSec) ? Math.min(86400, Math.max(0, Math.floor(watchedSec))) : 0;

    const video = await db.video.findUnique({ where: { id }, select: { id: true, durationSec: true } });
    if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const duration = video.durationSec ?? 0;
    const required = duration > 0 && duration < 120 ? duration : 120;

    if (watchedSec < required) {
      if (userId) {
        await db.watchHistory
          .upsert({
            where: { userId_videoId: { userId, videoId: id } },
            create: { userId, videoId: id, progressSec: Math.floor(watchedSec), watchedAt: new Date() },
            update: { progressSec: Math.floor(watchedSec), watchedAt: new Date() },
          })
          .catch(() => {});
      }
      return NextResponse.json({ ok: true, counted: false });
    }

    if (!userId) {
      // Anon spam himoyasi: bitta IP/videodan daqiqasiga 1 count
      if (!limit(`view:${clientIp(req)}:${id}`, 1, 60_000))
        return NextResponse.json({ ok: true, counted: false, throttled: true });
      await db.video.update({ where: { id }, data: { views: { increment: 1 } } });
      return NextResponse.json({ ok: true, counted: true });
    }

    const existing = await db.videoView.findUnique({
      where: { userId_videoId: { userId, videoId: id } },
    });
    if (existing) {
      await db.watchHistory
        .upsert({
          where: { userId_videoId: { userId, videoId: id } },
          create: { userId, videoId: id, progressSec: Math.floor(watchedSec), watchedAt: new Date() },
          update: { progressSec: Math.floor(watchedSec), watchedAt: new Date() },
        })
        .catch(() => {});
      return NextResponse.json({ ok: true, counted: false, already: true });
    }

    try {
      await db.$transaction([
        db.videoView.create({ data: { userId, videoId: id } }),
        db.video.update({ where: { id }, data: { views: { increment: 1 } } }),
        db.watchHistory.upsert({
          where: { userId_videoId: { userId, videoId: id } },
          create: { userId, videoId: id, progressSec: Math.floor(watchedSec), watchedAt: new Date() },
          update: { progressSec: Math.floor(watchedSec), watchedAt: new Date() },
        }),
      ]);
    } catch (e: unknown) {
      // Parallel birinchi view poygasi (P2002) — allaqachon sanalgan deb hisoblash
      const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
      if (code !== "P2002") throw e;
      await db.watchHistory
        .upsert({
          where: { userId_videoId: { userId, videoId: id } },
          create: { userId, videoId: id, progressSec: Math.floor(watchedSec), watchedAt: new Date() },
          update: { progressSec: Math.floor(watchedSec), watchedAt: new Date() },
        })
        .catch(() => {});
      return NextResponse.json({ ok: true, counted: false, already: true });
    }

    return NextResponse.json({ ok: true, counted: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, counted: false, error: "View tracking failed" }, { status: 500 });
  }
}
