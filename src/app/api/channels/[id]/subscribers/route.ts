import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: channelId } = await params;
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Login required" }, { status: 401 });
    const channel = await db.channel.findUnique({ where: { id: channelId } });
    if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Obunachilar ro'yxati maxfiy — faqat kanal egasi ko'radi (count public API'da ochiq)
    if (channel.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const subs = await db.subscription.findMany({
      where: { channelId },
      include: {
        subscriber: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            channel: { select: { handle: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      items: subs.map((s) => ({
        userId: s.subscriber.id,
        username: s.subscriber.username,
        avatarUrl: s.subscriber.avatarUrl,
        handle: s.subscriber.channel?.handle ?? null,
        channelName: s.subscriber.channel?.name ?? null,
        subscribedAt: s.createdAt,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
