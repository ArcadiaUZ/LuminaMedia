import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ items: [] });
    const likes = await db.videoLike.findMany({
      where: { userId, value: 1 },
      include: {
        video: {
          include: {
            channel: { select: { id: true, name: true, handle: true, avatarUrl: true, verified: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    return NextResponse.json({ items: likes.map((l) => l.video) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load likes" }, { status: 500 });
  }
}
