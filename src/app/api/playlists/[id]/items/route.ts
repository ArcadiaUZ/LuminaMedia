import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Login required" }, { status: 401 });
    const pl = await db.playlist.findUnique({ where: { id } });
    if (!pl) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (pl.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    let videoId: unknown = null;
    try {
      videoId = (await req.json())?.videoId ?? null;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!videoId || typeof videoId !== "string")
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    const videoExists = await db.video.findUnique({ where: { id: videoId }, select: { id: true } });
    if (!videoExists) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    // Race-safe: position ni transaction ichida max+1 qilib hisoblash
    const item = await db.$transaction(async (tx) => {
      const existing = await tx.playlistItem.findUnique({
        where: { playlistId_videoId: { playlistId: id, videoId } },
      });
      if (existing) return existing;
      const last = await tx.playlistItem.findFirst({
        where: { playlistId: id },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      return tx.playlistItem.create({
        data: { playlistId: id, videoId, position: (last?.position ?? -1) + 1 },
      });
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const pl = await db.playlist.findUnique({ where: { id } });
    if (!pl) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (pl.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");
    if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });
    await db.playlistItem.deleteMany({ where: { playlistId: id, videoId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
