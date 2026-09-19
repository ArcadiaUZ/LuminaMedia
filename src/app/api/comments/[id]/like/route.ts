import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { limit, tooMany } from "@/lib/ratelimit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Login required" }, { status: 401 });
    if (!limit(`clike:${userId}`, 60, 60_000)) return tooMany();
    const [comment, existing] = await Promise.all([
      db.comment.findUnique({ where: { id }, select: { id: true } }),
      db.commentLike.findUnique({
        where: { commentId_userId: { commentId: id, userId } },
      }),
    ]);
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    try {
      if (existing) await db.commentLike.delete({ where: { id: existing.id } });
      else await db.commentLike.create({ data: { commentId: id, userId } });
    } catch (e: unknown) {
      // Parallel double-tap poygasi (P2002 create / P2025 delete) — joriy holatni qayta o'qib qaytarish
      const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
      if (code !== "P2002" && code !== "P2025") throw e;
    }
    const [count, fresh] = await Promise.all([
      db.commentLike.count({ where: { commentId: id } }),
      db.commentLike.findUnique({ where: { commentId_userId: { commentId: id, userId } } }),
    ]);
    return NextResponse.json({ liked: !!fresh, count });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
