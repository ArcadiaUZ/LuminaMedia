import { db as prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "up" }, { status: 200 });
  } catch {
    return Response.json({ ok: false, db: "down" }, { status: 503 });
  }
}
