import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { playlistSchema } from "@/lib/validations";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ items: [] });
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId") ?? undefined;
    const items = await db.playlist.findMany({
      where: { userId },
      include: {
        _count: { select: { items: true } },
        ...(videoId
          ? { items: { where: { videoId }, select: { id: true } } }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
    // videoId berilsa har bir playlist'da hasVideo bayrog'i qaytadi
    const shaped = items.map((p) => ({
      ...p,
      items: undefined,
      hasVideo: videoId ? (p as unknown as { items: unknown[] }).items.length > 0 : undefined,
    }));
    return NextResponse.json({ items: shaped });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load playlists" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Login required" }, { status: 401 });
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = playlistSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    const pl = await db.playlist.create({ data: { userId, ...parsed.data } });
    return NextResponse.json({ playlist: pl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 });
  }
}
