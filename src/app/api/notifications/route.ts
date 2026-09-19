import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ items: [], unread: 0 });
    const { searchParams } = new URL(req.url);
    const raw = Number(searchParams.get("limit") ?? 15);
    const limit = Number.isFinite(raw) ? Math.min(30, Math.max(1, Math.floor(raw))) : 15;
  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.notification.count({ where: { userId, read: false } }),
  ]);
  return NextResponse.json({ items, unread });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
