import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Cookie-auth (Lax) ni kuchaytirish: mutation'larda Origin/Referer tekshiruvi.
// Safe methodlar (GET/HEAD/OPTIONS) va /api/health tekshirilmaydi.
export function middleware(req: NextRequest) {
  const m = req.method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return NextResponse.next();
  if (req.nextUrl.pathname === "/api/health") return NextResponse.next();

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const source = origin ?? referer;
  if (source) {
    try {
      const u = new URL(source);
      if (u.host !== host) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
