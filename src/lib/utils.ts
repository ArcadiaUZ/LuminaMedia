import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useLocaleStore } from "@/store/locale";
import { tFor } from "@/i18n/core";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatViews(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n) || n < 0) return "0";
  if (n < 1000) return `${Math.floor(n)}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}K`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const locale = useLocaleStore.getState().locale;
  const t = (k: string, v?: Record<string, string | number>) => tFor(locale, k, v);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return t("time.now");
  const m = Math.floor(s / 60);
  if (m < 60) return t("time.min", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("time.hour", { n: h });
  const days = Math.floor(h / 24);
  if (days < 7) return t("time.day", { n: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return t("time.week", { n: weeks });
  const months = Math.floor(days / 30);
  if (months < 12) return t("time.month", { n: months });
  return t("time.year", { n: Math.floor(days / 365) });
}

export function formatDuration(totalSec: number): string {
  if (!totalSec || totalSec < 0) return "0:00";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function handleFromUsername(username: string): string {
  return username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) || `user${Date.now().toString(36)}`;
}
