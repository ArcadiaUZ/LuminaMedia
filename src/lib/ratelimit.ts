// Simple in-process token-bucket rate limiter (per instance).
// Protects auth + upload + write endpoints from brute-force / spam loops
// when many users hit the platform at once. For multi-instance production,
// replace with Redis (e.g. @upstash/ratelimit) keeping the same `limit()` API.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Memory hygiene: prune idle buckets every 5 minutes
if (typeof setInterval !== "undefined") {
  const t = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    if (buckets.size > 20000) buckets.clear();
  }, 5 * 60 * 1000);
  t.unref?.();
}

export function clientIp(req: Request): string {
  // Spoof'ni kamaytirish uchun: x-forwarded-for dagi faqat birinchi IP, trim qilib.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Returns true when allowed, false when the bucket is exhausted. */
export function limit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}

export function tooMany(): Response {
  return Response.json({ error: "Too many requests, slow down" }, { status: 429 });
}
