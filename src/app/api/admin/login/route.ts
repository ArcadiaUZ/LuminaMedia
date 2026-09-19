import { NextResponse } from "next/server";
import { checkAdminCredentials, setAdminCookie } from "@/lib/admin";
import { clientIp, limit, tooMany } from "@/lib/ratelimit";

export async function POST(req: Request) {
  // Brute-force himoyasi: bitta IP dan 1 daqiqada 10 urinish
  if (!limit(`admin-login:${clientIp(req)}`, 10, 60_000)) return tooMany();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const { username, password } = (body as { username?: unknown; password?: unknown }) ?? {};
    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Enter username and password" }, { status: 400 });
    }
    if (!checkAdminCredentials(username, password)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    await setAdminCookie();
    return NextResponse.json({ admin: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
