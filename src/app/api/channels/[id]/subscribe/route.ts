import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { limit, tooMany } from "@/lib/ratelimit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: channelId } = await params;
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Login required" }, { status: 401 });
    if (!limit(`sub:${userId}`, 30, 60_000)) return tooMany();

    const channel = await db.channel.findUnique({ where: { id: channelId } });
    if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (channel.userId === userId) return NextResponse.json({ error: "You can't subscribe to yourself" }, { status: 400 });

    const existing = await db.subscription.findUnique({
      where: { subscriberUserId_channelId: { subscriberUserId: userId, channelId } },
    });
    if (existing) {
      await db.subscription.delete({ where: { id: existing.id } }).catch(() => undefined);
    } else {
      let created = true;
      try {
        await db.subscription.create({ data: { subscriberUserId: userId, channelId } });
      } catch (e: unknown) {
        // Parallel double-click poygasi: allaqachon yaratilgan bo'lsa — muvaffaqiyat deb hisoblash
        const isUnique =
          typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002";
        if (!isUnique) throw e;
        created = false;
      }
      // Re-subscribe spam bo'lmasligi uchun: notification faqat birinchi marta yaratilganda
      if (!created) {
        const count = await db.subscription.count({ where: { channelId } });
        return NextResponse.json({ subscribed: true, count });
      }
      const me = await db.user.findUnique({ where: { id: userId } });
      await db.notification
        .create({
          data: {
            userId: channel.userId,
            type: "SUBSCRIBE",
            title: `@${me?.username} subscribed to you`,
            body: channel.name,
            actorUserId: userId,
          },
        })
        .catch(() => undefined);
    }
    const count = await db.subscription.count({ where: { channelId } });
    return NextResponse.json({ subscribed: !existing, count });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
