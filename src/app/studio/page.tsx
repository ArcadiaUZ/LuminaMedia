"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Film, Users, Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { formatViews, formatDuration, timeAgo } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { useT } from "@/i18n/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Vid = any;

export default function StudioPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t, tp } = useT();
  const [items, setItems] = useState<Vid[]>([]);
  const [stats, setStats] = useState<{ totalVideos: number; totalViews: number; subscribers: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/me/videos");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setItems(j.items ?? []);
      setStats(j.stats ?? null);
    } catch (e) {
      console.error("Studio load failed:", e);
      setItems([]);
      setStats(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  if (loading) return <StudioSkeleton />;

  if (!user)
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-10 text-center">
        <h1 className="text-xl font-bold">{t("studio.guestTitle")}</h1>
        <p className="mt-2 text-sm text-(--tx3)">{t("studio.guestHint")}</p>
        <Button className="mt-5" onClick={() => router.push("/login")}>
          {t("studio.loginBtn")}
        </Button>
      </div>
    );

  const cards = stats
    ? [
        { key: "videos", label: t("studio.cardVideos"), value: String(stats.totalVideos), icon: Film },
        { key: "views", label: t("studio.cardViews"), value: formatViews(stats.totalViews), icon: Eye },
        { key: "subs", label: t("studio.cardSubs"), value: formatViews(stats.subscribers), icon: Users },
      ]
    : [];

  void tp;

  const statusTone = (s: string) =>
    s === "READY" ? "mint" : s === "PROCESSING" ? "amber" : s === "FAILED" ? "rose" : "neutral";

  return (
    <div className="fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">{t("studio.title")}</h1>
          <p className="text-sm text-(--tx3)">{t("studio.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/subscriptions")}>
            <Bell size={15} /> {t("studio.alerts")}
          </Button>
          <Button size="sm" onClick={() => router.push("/upload")}>
            {t("studio.newVideo")}
          </Button>
        </div>
      </div>

      {loaded && stats && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {cards.map((c) => {
            const inner = (
              <>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#7c5cff]/12 text-[#9d86ff]">
                  <c.icon size={19} />
                </span>
                <span>
                  <span className="block text-[22px] font-bold leading-none">{c.value}</span>
                  <span className="text-[12.5px] text-(--tx3)">{c.label}</span>
                </span>
              </>
            );
            if (c.key === "subs")
              return (
                <button
                  key={c.key}
                  onClick={() => router.push("/studio/subscribers")}
                  aria-label={t("studio.viewSubs")}
                  className="card-hover glass-min flex cursor-pointer items-center gap-4 rounded-2xl p-5 text-left"
                >
                  {inner}
                </button>
              );
            return (
              <div key={c.key} className="card-hover glass-min flex items-center gap-4 rounded-2xl p-5">
                {inner}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-[15px] font-semibold">{t("studio.manager")}</h2>
        {!loaded ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Film}
            title={t("studio.emptyTitle")}
            hint={t("studio.emptyHint")}
            action={
              <Button onClick={() => router.push("/upload")} className="ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.06] active:scale-95">{t("studio.emptyAction")}</Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((v) => (
              <div
                key={v.id}
                onClick={() => router.push(`/studio/edit/${v.id}`)}
                className="card-hover glass-min flex cursor-pointer items-center gap-4 rounded-2xl p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.thumbnailUrl ?? "/placeholder.svg"}
                  alt=""
                  className="h-[52px] w-[92px] shrink-0 rounded-lg object-cover bg-[rgb(var(--tint)/0.05)]"
                />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">
                    {v.title}
                  </span>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-(--tx3)">
                    <span>{t("studio.views", { n: formatViews(v.views) })}</span>
                    <span>{formatDuration(v.durationSec)}</span>
                    <span>{timeAgo(v.createdAt)}</span>
                    <Badge tone={statusTone(v.status) as never}>{v.status}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StudioSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-52" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
