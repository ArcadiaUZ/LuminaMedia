import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        channel: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
            verified: true,
            _count: { select: { videos: true, subscribers: true } },
          },
        },
      },
    });
    return NextResponse.json({ users });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
