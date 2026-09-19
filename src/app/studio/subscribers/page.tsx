"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { useT } from "@/i18n/core";

interface Sub {
  userId: string;
  username: string;
  avatarUrl: string | null;
  handle: string | null;
  channelName: string | null;
  subscribedAt: string;
}

export default function SubscribersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, tp } = useT();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    const channelId = user?.channel?.id;
    if (!channelId) {
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/channels/${channelId}/subscribers`, { signal: ctrl.signal })
      .then(async (r) => ({ ok: r.ok, j: await r.json().catch(() => ({})) }))
      .then(({ ok, j }) => {
        if (ctrl.signal.aborted) return;
        if (!ok) throw new Error((j as { error?: string }).error ?? "Failed to load subscribers");
        setSubs((j as { items?: Sub[] }).items ?? []);
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Failed to load subscribers");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [authLoading, user, retryKey]);

  if (!authLoading && !user)
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-10 text-center">
        <h1 className="text-xl font-bold">{t("ssubs.guestTitle")}</h1>
        <p className="mt-2 text-sm text-(--tx3)">{t("ssubs.guestHint")}</p>
        <Button className="mt-5" onClick={() => router.push("/login")}>
          {t("ssubs.loginBtn")}
        </Button>
      </div>
    );

  return (
    <div className="fade-up w-full">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label={t("ssubs.back")}
          className="glass-chip grid h-10 w-10 shrink-0 place-items-center rounded-full text-(--tx2) hover:text-(--tx1)"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight">
            {t("ssubs.title")}
            {!loading && !error && <Badge tone="iris">{tp("ssubs.count", subs.length)}</Badge>}
          </h1>
          <p className="text-sm text-(--tx3)">{t("ssubs.subtitle")}</p>
        </div>
      </div>

      <div className="mt-5">
        {loading || authLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState title={t("ssubs.errorTitle")} hint={error} onRetry={() => setRetryKey((k) => k + 1)} />
        ) : subs.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("ssubs.emptyTitle")}
            hint={t("ssubs.emptyHint")}
          />
        ) : (
          <div className="glass-min divide-y divide-[rgb(var(--tint)/0.06)] overflow-hidden rounded-2xl">
            {subs.map((s) => (
              <button
                key={s.userId}
                disabled={!s.handle}
                onClick={() => s.handle && router.push(`/channel/${s.handle}`)}
                className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-[rgb(var(--tint)/0.05)] disabled:cursor-default disabled:hover:bg-transparent"
              >
                <Avatar src={s.avatarUrl} name={s.username} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {s.channelName ?? s.username}
                  </span>
                  <span className="block truncate text-[12.5px] text-(--tx3)">
                    @{s.username} · {t("ssubs.subscribed", { ago: timeAgo(s.subscribedAt) })}
                  </span>
                </span>
                {s.handle && <ChevronRight size={18} className="shrink-0 text-(--tx4)" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
