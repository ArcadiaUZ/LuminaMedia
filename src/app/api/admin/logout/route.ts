import { NextResponse } from "next/server";
import { clearAdminCookies } from "@/lib/admin";

export async function POST() {
  await clearAdminCookies();
  return NextResponse.json({ ok: true });
}
