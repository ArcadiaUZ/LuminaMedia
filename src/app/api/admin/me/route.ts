import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ admin: false }, { status: 401 });
  return NextResponse.json({ admin: true });
}
