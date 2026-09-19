import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  isAdmin,
  getImpersonatedUserId,
  setImpersonateCookie,
  clearImpersonateCookie,
} from "@/lib/admin";

// Hozir qaysi kanal ko'rilayotgani (admin panel + Studio banner uchun)
export async function GET() {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const userId = await getImpersonatedUserId();
    if (!userId) return NextResponse.json({ user: null });
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        channel: { select: { id: true, handle: true, name: true } },
      },
    });
    return NextResponse.json({ user });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Kanal tanlash — keyingi so'rovlar shu user nomidan ishlaydi
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { userId } = await req.json();
    if (typeof userId !== "string" || !userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    await setImpersonateCookie(user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Ko'rishni to'xtatish — yana admin holatiga qaytish
export async function DELETE() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await clearImpersonateCookie();
  return NextResponse.json({ ok: true });
}
