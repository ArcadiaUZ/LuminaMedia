// Sahifalararo o'tishda va kategoriya almashganda miltillashni oldini olish
// uchun kesh (stale-while-revalidate):
// - xotira (tez) + sessionStorage (page refresh'dan keyin ham saqlanadi)
// - remount'da eski ro'yxat darhol ko'rinadi, orqa fonda yangilanadi —
//   skeleton faqat birinchi yuklanishda (kesh bo'shligida) chiqadi.
export interface FeedSnapshot {
  items: unknown[];
  pages: number;
  at: number;
}

const TTL_MS = 5 * 60_000; // 5 daqiqa
const LS_PREFIX = "lumina:feed:";
const store = new Map<string, FeedSnapshot>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readLS(key: string): FeedSnapshot | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const s = JSON.parse(raw) as FeedSnapshot;
    if (!s || !Array.isArray(s.items) || typeof s.at !== "number") return null;
    if (Date.now() - s.at > TTL_MS) {
      window.sessionStorage.removeItem(LS_PREFIX + key);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function writeLS(key: string, snap: FeedSnapshot): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(LS_PREFIX + key, JSON.stringify(snap));
  } catch {
    // quota to'lsa — jim o'tkazamiz, xotira keshi baribir ishlaydi
  }
}

export function feedKey(...parts: Array<string | number>): string {
  return parts.join("|");
}

export function getFeed(key: string): FeedSnapshot | null {
  const s = store.get(key);
  if (s) {
    if (Date.now() - s.at > TTL_MS) store.delete(key);
    else return s;
  }
  // Refresh'dan keyin xotira bo'sh — sessionStorage'dan tiklaymiz
  const ls = readLS(key);
  if (ls) store.set(key, ls);
  return ls;
}

export function setFeed(key: string, items: unknown[], pages = 1): void {
  const snap: FeedSnapshot = { items, pages, at: Date.now() };
  store.set(key, snap);
  writeLS(key, snap);
}
