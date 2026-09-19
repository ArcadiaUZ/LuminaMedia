import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { clearImpersonateCookie } from "@/lib/admin";

export async function POST() {
  await clearSessionCookie();
  // Admin biror kanalni ko'rayotgan bo'lsa — ko'rish ham to'xtaydi,
  // bo'lmasa impersonate cookie tirik qolib "chiqib ketmaslik" bug'i bo'ladi.
  // Admin sessiyasi (lumina_admin) saqlanadi — /admin baribir ochiladi.
  await clearImpersonateCookie();
  return NextResponse.json({ ok: true });
}
