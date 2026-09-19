import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { playlistSchema } from "@/lib/validations";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    const pl = await db.playlist.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          video: {
            include: {
              channel: { select: { id: true, name: true, handle: true, avatarUrl: true, verified: true } },
            },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!pl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // PRIVATE/UNLISTED playlist faqat egasiga ko'rinadi
  if (pl.visibility !== "PUBLIC" && pl.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ playlist: pl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const pl = await db.playlist.findUnique({ where: { id } });
    if (!pl) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (pl.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = playlistSchema.partial().safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    const updated = await db.playlist.update({
      where: { id },
      data: {
        title: parsed.data.title ?? undefined,
        description: parsed.data.description ?? undefined,
        visibility: parsed.data.visibility ?? undefined,
      },
    });
    return NextResponse.json({ playlist: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const pl = await db.playlist.findUnique({ where: { id } });
    if (!pl) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (pl.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await db.playlist.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
