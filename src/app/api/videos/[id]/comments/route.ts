import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { commentSchema } from "@/lib/validations";
import { limit, tooMany } from "@/lib/ratelimit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    const comments = await db.comment.findMany({
      where: { videoId: id, parentId: null },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { likes: true, replies: true } },
        replies: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } },
            _count: { select: { likes: true } },
          },
          orderBy: { createdAt: "asc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    let myLikes: Set<string> = new Set();
    if (userId) {
      const likes = await db.commentLike.findMany({
        where: { userId, comment: { videoId: id } },
        select: { commentId: true },
      });
      myLikes = new Set(likes.map((l) => l.commentId));
    }

    return NextResponse.json({
      items: comments.map((c) => ({
        ...c,
        liked: myLikes.has(c.id),
        replies: c.replies.map((r) => ({ ...r, liked: myLikes.has(r.id) })),
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Login required" }, { status: 401 });
    if (!limit(`comment:${userId}`, 20, 60_000)) return tooMany();
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    // parentId shu videoga tegishli bo'lishi shart (boshqa videodagi comment'ga yopishib ketmasligi uchun)
    const videoExists = await db.video.findUnique({ where: { id }, select: { id: true } });
    if (!videoExists) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    if (parsed.data.parentId) {
      const parentCheck = await db.comment.findUnique({ where: { id: parsed.data.parentId }, select: { videoId: true } });
      if (!parentCheck || parentCheck.videoId !== id)
        return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 });
    }

    const comment = await db.comment.create({
      data: { videoId: id, userId, text: parsed.data.text, parentId: parsed.data.parentId ?? null },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    });

    // notify owner / parent author — must never fail the comment itself
    try {
      const video = await db.video.findUnique({ where: { id }, include: { channel: true } });
      const me = await db.user.findUnique({ where: { id: userId } });
      if (video) {
        if (parsed.data.parentId) {
          const parent = await db.comment.findUnique({ where: { id: parsed.data.parentId } });
          if (parent && parent.userId !== userId) {
            await db.notification.create({
              data: {
                userId: parent.userId,
                type: "REPLY",
                title: `@${me?.username} replied to your comment`,
                body: parsed.data.text.slice(0, 120),
                actorUserId: userId,
                videoId: id,
              },
            });
          }
        } else if (video.channel.userId !== userId) {
          await db.notification.create({
            data: {
              userId: video.channel.userId,
              type: "COMMENT",
              title: `@${me?.username} commented on your video`,
              body: parsed.data.text.slice(0, 120),
              actorUserId: userId,
              videoId: id,
            },
          });
        }
      }
    } catch {
      /* notification is best-effort */
    }

    return NextResponse.json({ comment: { ...comment, _count: { likes: 0, replies: 0 }, liked: false, replies: [] } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
