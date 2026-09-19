import { NextResponse } from "next/server";
import { mkdir, readdir, rm, stat, writeFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";

// Resumable upload: katta video 8MB bo'laklarda keladi.
// POST — bitta bo'lakni saqlash; GET — yetgan bo'laklar ro'yxati (resume uchun);
// DELETE — bekor qilish (vaqtinchalik bo'laklarni o'chirish).
const TMP_ROOT = path.join(process.cwd(), "public", "uploads", "tmp");
const MAX_CHUNK_BYTES = 16 * 1024 * 1024;

function safeId(id: string): boolean {
  return /^[A-Za-z0-9_-]{8,128}$/.test(id);
}

function tmpDir(uploadId: string): string {
  return path.join(TMP_ROOT, uploadId);
}

// Eskirgan (24 soatdan eski) tugallanmagan yuklashlarni tozalash — best-effort
async function sweepStale(): Promise<void> {
  try {
    const entries = await readdir(TMP_ROOT);
    const cutoff = Date.now() - 24 * 3600 * 1000;
    for (const e of entries.slice(0, 50)) {
      const p = path.join(TMP_ROOT, e);
      try {
        const st = await stat(p);
        if (st.isDirectory() && st.mtimeMs < cutoff) await rm(p, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* tmp yo'q bo'lsa o'tkazamiz */
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.channel) return NextResponse.json({ error: "Login required" }, { status: 401 });

    const form = await req.formData();
    const uploadId = String(form.get("uploadId") ?? "");
    const index = Number(form.get("index") ?? -1);
    const total = Number(form.get("total") ?? 0);
    const chunk = form.get("chunk");

    if (!safeId(uploadId)) return NextResponse.json({ error: "Bad uploadId" }, { status: 400 });
    if (!Number.isInteger(index) || index < 0 || !Number.isInteger(total) || total <= 0 || index >= total || total > 512)
      return NextResponse.json({ error: "Bad chunk range" }, { status: 400 });
    if (!(chunk instanceof File) || chunk.size === 0)
      return NextResponse.json({ error: "Chunk required" }, { status: 400 });
    if (chunk.size > MAX_CHUNK_BYTES)
      return NextResponse.json({ error: "Chunk too large" }, { status: 400 });

    const dir = tmpDir(uploadId);
    await mkdir(dir, { recursive: true });
    const buf = Buffer.from(await chunk.arrayBuffer());
    await writeFile(path.join(dir, `chunk-${index}.part`), buf);
    void sweepStale();
    return NextResponse.json({ ok: true, index });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Chunk save failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.channel) return NextResponse.json({ error: "Login required" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const uploadId = searchParams.get("uploadId") ?? "";
    if (!safeId(uploadId)) return NextResponse.json({ error: "Bad uploadId" }, { status: 400 });
    let received: number[] = [];
    try {
      const files = await readdir(tmpDir(uploadId));
      received = files
        .map((f) => /^chunk-(\d+)\.part$/.exec(f)?.[1])
        .filter((n): n is string => n !== undefined)
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 0)
        .sort((a, b) => a - b);
    } catch {
      received = [];
    }
    return NextResponse.json({ received });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.channel) return NextResponse.json({ error: "Login required" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const uploadId = searchParams.get("uploadId") ?? "";
    if (!safeId(uploadId)) return NextResponse.json({ error: "Bad uploadId" }, { status: 400 });
    await rm(tmpDir(uploadId), { recursive: true, force: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
