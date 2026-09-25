import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";

// Admin panel kirish ma'lumotlari — env orqali o'zgartiriladi:
//   ADMIN_USERNAME / ADMIN_PASSWORD (fly: `fly secrets set ADMIN_USERNAME=... ADMIN_PASSWORD=...`)
// Placeholder only — prod'da env bo'lmasa boot `throw` qiladi (pastga qarang).
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin@example.com";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "CHANGE-ME-set-ADMIN_PASSWORD-env";

const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

if (!process.env.ADMIN_PASSWORD) {
  if (process.env.NODE_ENV === "production" && !IS_BUILD) {
    throw new Error("[admin] FATAL: ADMIN_PASSWORD is not set. Refusing to boot with default credentials.");
  }
  console.warn(
    "[admin] WARNING: ADMIN_PASSWORD is not set — using default. Change it via `fly secrets set`."
  );
}

const JWT_SECRET_RAW =
  process.env.JWT_SECRET ?? "dev-only-change-me-lumina-32chars-minimum-secret";
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production" && !IS_BUILD) {
  throw new Error("[admin] FATAL: JWT_SECRET is not set. Refusing to boot with insecure default.");
}
const SECRET = new TextEncoder().encode(JWT_SECRET_RAW);

export const ADMIN_COOKIE = "lumina_admin";
export const IMPERSONATE_COOKIE = "lumina_impersonate";
const MAX_AGE = 60 * 60 * 12; // 12 hours

export function checkAdminCredentials(username: string, password: string) {
  const aUser = Buffer.from(username);
  const bUser = Buffer.from(ADMIN_USERNAME);
  const aPass = Buffer.from(password);
  const bPass = Buffer.from(ADMIN_PASSWORD);
  if (aUser.length !== bUser.length || aPass.length !== bPass.length) return false;
  return timingSafeEqual(aUser, bUser) && timingSafeEqual(aPass, bPass);
}

export async function setAdminCookie() {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminCookies() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  jar.delete(IMPERSONATE_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

// Admin biror kanalni "ko'rayotgan" bo'lsa — o'sha user id qaytadi.
// Faqat admin sessiyasi bilan birga amal qiladi.
// Impersonate cookie imzolangan JWT sifatida saqlanadi (xom userId emas).
export async function getImpersonatedUserId(): Promise<string | null> {
  if (!(await isAdmin())) return null;
  const jar = await cookies();
  const token = jar.get(IMPERSONATE_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.role !== "impersonate" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function setImpersonateCookie(userId: string) {
  const token = await new SignJWT({ role: "impersonate", sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);
  const jar = await cookies();
  jar.set(IMPERSONATE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearImpersonateCookie() {
  const jar = await cookies();
  jar.delete(IMPERSONATE_COOKIE);
}
