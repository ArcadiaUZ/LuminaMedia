import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const category = searchParams.get("category") ?? "All";
    const sort = searchParams.get("sort") ?? "newest"; // newest | views | relevance
    const channelId = searchParams.get("channelId") ?? undefined;
    const rawPage = Number(searchParams.get("page") ?? 1);
    const rawLimit = Number(searchParams.get("limit") ?? 12);
    const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
    const limit = Number.isFinite(rawLimit) ? Math.min(24, Math.max(1, Math.floor(rawLimit))) : 12;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      visibility: "PUBLIC",
      status: "READY",
    };
    if (channelId) (where as Record<string, unknown>).channelId = channelId;
    if (category && category !== "All") (where as Record<string, unknown>).category = category;
    if (q) {
      // Postgres LIKE is case-sensitive — explicit insensitive mode keeps
      // search behavior identical to the old SQLite build.
      (where as Record<string, unknown>).OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { channel: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const orderBy =
      sort === "views"
        ? [{ views: "desc" as const }]
        : sort === "relevance" && q
          ? [{ views: "desc" as const }]
          : [{ createdAt: "desc" as const }];

    const [items, total] = await Promise.all([
      db.video.findMany({
        where: where as never,
        include: {
          channel: { select: { id: true, name: true, handle: true, avatarUrl: true, verified: true } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.video.count({ where: where as never }),
    ]);

    return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load videos" }, { status: 500 });
  }
}
