"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIsoLayoutEffect } from "@/lib/iso-layout";
import { VideoCard, type CardVideo } from "@/components/video/VideoCard";
import { VideoCardSkeleton } from "@/components/ui/Skeleton";
import { Chips } from "@/components/ui/Tabs";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { CATEGORIES } from "@/lib/constants";
import { feedKey, getFeed, setFeed } from "@/lib/feed-cache";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n/core";

const keyFor = (c: string) => feedKey("home", c, "newest");

export default function HomePage() {
  const { t } = useT();
  const [cat, setCat] = useState("All");
  const [items, setItems] = useState<CardVideo[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Mount'da keshni paint'dan oldin tiklash — skeleton miltillamaydi
  useIsoLayoutEffect(() => {
    const cached = getFeed(keyFor("All"));
    if (cached) {
      setItems(cached.items as CardVideo[]);
      setPages(cached.pages);
      setLoading(false);
    }
  }, []);

  const load = useCallback(async (c: string, p: number, append: boolean) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const key = keyFor(c);
    // Kesh bo'lsa — eski ro'yxat ekranda qoladi, orqa fonda yangilanadi (miltillash yo'q)
    const cached = !append && p === 1 ? getFeed(key) : null;
    if (append) setLoadingMore(true);
    else if (cached) {
      setItems(cached.items as CardVideo[]);
      setPages(cached.pages);
      setError("");
    } else {
      setLoading(true);
      setError("");
    }
    try {
      // Fail fast instead of hanging on skeletons when the network stalls
      // (e.g. phone off the dev machine's Wi-Fi).
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(`/api/videos?category=${encodeURIComponent(c)}&page=${p}&limit=12&sort=newest`, {
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`Server responded ${r.status}`);
      const j = await r.json();
      if (ctrl.signal.aborted) return;
      setItems((prev) => (append ? [...prev, ...(j.items ?? [])] : (j.items ?? [])));
      if (!append && p === 1) setFeed(key, j.items ?? [], j.pages ?? 1);
      setPages(j.pages ?? 1);
      setPage(p);
    } catch (e: unknown) {
      if (ctrl.signal.aborted) return;
      // Kesh ko'rinib turgan bo'lsa xato bilan almashtirmaymiz
      if (!append && !cached) setError(e instanceof Error ? e.message : "Failed to load videos");
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    load(cat, 1, false);
  }, [cat, load]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Sichqoncha kategoriya ustiga borganda oldindan keshlash —
  // bosilganda ro'yxat darhol (miltillashsiz) almashadi
  const prefetch = useCallback((c: string) => {
    const key = keyFor(c);
    if (getFeed(key)) return;
    fetch(`/api/videos?category=${encodeURIComponent(c)}&page=1&limit=12&sort=newest`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j) setFeed(key, j.items ?? [], j.pages ?? 1);
      })
      .catch(() => {});
  }, []);

  const refreshing = loading && items.length > 0;

  return (
    <div className="fade-up">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight md:text-[26px]">{t('home.title')}</h1>
          <p className="text-sm text-(--tx3)">{t('home.subtitle')}</p>
        </div>
      </div>

      <Chips items={CATEGORIES} active={cat} onChange={setCat} onPrefetch={prefetch} />

      {loading && items.length === 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : error && items.length === 0 ? (
        <div className="mt-5">
          <ErrorState
            title={t('home.errTitle')}
            hint={t('home.errHint')}
            onRetry={() => load(cat, 1, false)}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title={t('home.emptyTitle')}
            hint={t('home.emptyHint')}
            action={
              <Link href="/upload" className="glass-pill block rounded-full px-5 py-2.5 text-center text-sm font-semibold text-black transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.06] hover:-translate-y-0.5 active:scale-95">
              {t('home.upload')}
            </Link>
            }
          />
        </div>
      ) : (
        <>
          <div
            className={`mt-5 grid grid-cols-1 gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 ${refreshing ? "opacity-60" : "opacity-100"}`}
          >
            {items.map((v) => (
              <VideoCard key={v.id} v={v as CardVideo} />
            ))}
          </div>

          {page < pages && (
            <div className="mt-8 grid place-items-center">
              <Button variant="ghost" loading={loadingMore} onClick={() => load(cat, page + 1, true)}>
                {t('home.loadMore')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
