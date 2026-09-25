import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

const JWT_SECRET_RAW = process.env.JWT_SECRET ?? "dev-only-change-me-lumina-32chars-minimum-secret";

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("[auth] FATAL: JWT_SECRET is not set. Refusing to boot with insecure default.");
  }
  console.warn("[auth] WARNING: JWT_SECRET is not set — using insecure dev default. Set it before going live.");
}

const SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const COOKIE = "lumina_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function signSession(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);
}

export async function setSessionCookie(userId: string) {
  const token = await signSession(userId);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  // Admin impersonation: admin biror kanalni tanlagan bo'lsa — hamma
  // sessiya-API (/api/me/*, upload, Studio) o'sha user nomidan ishlaydi.
  // Faqat admin cookie bilan birga amal qiladi.
  const { getImpersonatedUserId } = await import("./admin");
  const impersonated = await getImpersonatedUserId();
  if (impersonated) return impersonated;
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const id = await getSessionUserId();
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    include: { channel: true },
  });
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
