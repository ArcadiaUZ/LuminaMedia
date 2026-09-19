import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  try {
    const { handle } = await params;
    const userId = await getSessionUserId();
    const channel = await db.channel.findUnique({
      where: { handle },
      include: {
        user: { select: { id: true, username: true, createdAt: true } },
        _count: { select: { subscribers: true, videos: true } },
      },
    });
    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    const subscribed = userId
      ? !!(await db.subscription.findUnique({
          where: { subscriberUserId_channelId: { subscriberUserId: userId, channelId: channel.id } },
        }))
      : false;
    const isOwner = userId === channel.userId;
    return NextResponse.json({ channel, subscribed, isOwner });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
