import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ items: [], stats: null });
    const channel = await db.channel.findUnique({ where: { userId } });
    if (!channel) return NextResponse.json({ items: [], stats: null });
    const [items, totalViews, subs] = await Promise.all([
      db.video.findMany({
        where: { channelId: channel.id },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { likes: true, comments: true } } },
      }),
      db.video.aggregate({ where: { channelId: channel.id }, _sum: { views: true } }),
      db.subscription.count({ where: { channelId: channel.id } }),
    ]);
    return NextResponse.json({
      items,
      stats: {
        totalVideos: items.length,
        totalViews: totalViews._sum.views ?? 0,
        subscribers: subs,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load videos" }, { status: 500 });
  }
}
