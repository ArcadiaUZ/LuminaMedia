import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ items: [] });
    // Faqat ko'rilganlar: Watch Later tugmasi bilan yaratilgan (progress 0) qatorlar chiqmasin
    const items = await db.watchHistory.findMany({
      where: { userId, OR: [{ progressSec: { gt: 0 } }, { watchLater: false }] },
      include: {
        video: {
          include: {
            channel: { select: { id: true, name: true, handle: true, avatarUrl: true, verified: true } },
          },
        },
      },
      orderBy: { watchedAt: "desc" },
      take: 60,
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ ok: true });
    // Watch Later ro'yxati saqlanib qoladi — faqat tarix tozalanadi
    await db.watchHistory.deleteMany({ where: { userId, watchLater: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to clear history" }, { status: 500 });
  }
}
