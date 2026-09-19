import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ items: [] });
    const subs = await db.subscription.findMany({
      where: { subscriberUserId: userId },
      include: { channel: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ items: subs });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load subscriptions" }, { status: 500 });
  }
}
