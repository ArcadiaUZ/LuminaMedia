import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { handleFromUsername } from "@/lib/utils";
import { clientIp, limit, tooMany } from "@/lib/ratelimit";

export async function POST(req: Request) {
  // Spam-akkount himoyasi: bitta IP dan soatiga 10 ro'yxat
  if (!limit(`register:${clientIp(req)}`, 10, 3600_000)) return tooMany();
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

    const { email, username, password } = parsed.data;
    const exists = await db.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (exists)
      return NextResponse.json({ error: "Email or username already taken" }, { status: 409 });

    const passwordHash = await hashPassword(password);
    // Bir xil millisekundda bir xil username bilan urinish kolliziyasi uchun retry
    let user = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3 && !user; attempt++) {
      try {
        user = await db.user.create({
          data: {
            email,
            username,
            passwordHash,
            channel: {
              create: {
                handle: `${handleFromUsername(username)}${Date.now().toString(36).slice(-4)}${attempt > 0 ? Math.random().toString(36).slice(2, 6) : ""}`,
                name: username,
              },
            },
          },
          include: { channel: true },
        });
      } catch (e) {
        // Faqat unique-kolliziyada qayta urinish; boshqa xato darhol chiqadi
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
        lastErr = e;
      }
    }
    if (!user) {
      // Poyga holatida email/username band bo'lib qolgan bo'lishi mumkin
      const taken = await db.user.findFirst({ where: { OR: [{ email }, { username }] } });
      if (taken) return NextResponse.json({ error: "Email or username already taken" }, { status: 409 });
      throw lastErr ?? new Error("create failed");
    }

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
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
