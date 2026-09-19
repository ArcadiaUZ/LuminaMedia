import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function POST() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ ok: true });
    await db.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
