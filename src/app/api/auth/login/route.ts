import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { clientIp, limit, tooMany } from "@/lib/ratelimit";

export async function POST(req: Request) {
  // Brute-force himoyasi: bitta IP dan 1 daqiqada 10 urinish
  if (!limit(`login:${clientIp(req)}`, 10, 60_000)) return tooMany();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Enter valid email and password" }, { status: 400 });

    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
      include: { channel: true },
    });
    if (!user) {
      // Timing oracle himoyasi: user topilmasa ham bcrypt compare ishga tushsin
      await verifyPassword(
        "dummy-password",
        "$2b$10$dummyhashdummyhashdummyhashdummyha12"
      ).catch(() => false);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    await setSessionCookie(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        channel: user.channel
          ? { id: user.channel.id, handle: user.channel.handle, name: user.channel.name }
          : null,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
