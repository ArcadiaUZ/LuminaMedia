"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { VideoCard, type CardVideo } from "@/components/video/VideoCard";
import { SubscriptionsPageSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { Avatar } from "@/components/ui/Avatar";
import { Users } from "lucide-react";
import { useT } from "@/i18n/core";

export default function SubscriptionsPage() {
  const { t } = useT();
  const [videos, setVideos] = useState<CardVideo[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const s = await fetch("/api/me/subscriptions", { signal: ctrl.signal }).then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        });
        if (ctrl.signal.aborted) return;
        setChannels(s.items ?? []);
        const ids = (s.items ?? []).map((x: { channelId: string }) => x.channelId);
        // N+1 ketma-ketlik o'rniga parallel fetch (20 kanal uchun parallel)
        const results = await Promise.all(
          ids.slice(0, 20).map((id: string) =>
            fetch(`/api/videos?channelId=${id}&limit=4&sort=newest`, { signal: ctrl.signal })
              .then(async (r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
              })
              .catch(() => ({ items: [] }))
          )
        );
        if (ctrl.signal.aborted) return;
        const all: CardVideo[] = results.flatMap((v) => v.items ?? []);
        all.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        setVideos(all);
      } catch (e) {
        if (!ctrl.signal.aborted) console.error("Subscriptions load failed:", e);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  return (
    <div className="fade-up">
      <h1 className="text-[22px] font-bold tracking-tight">{t('subs.title')}</h1>
      <p className="text-sm text-(--tx3)">{t('subs.sub')}</p>
      {!loading && channels.length > 0 && (
        <div className="mt-4 flex gap-4 overflow-x-auto no-scrollbar pb-1">
          {channels.map((s) => (
            <Link key={s.id} href={`/channel/${s.channel.handle}`} className="flex shrink-0 flex-col items-center gap-1.5">
              <Avatar src={s.channel.avatarUrl} name={s.channel.name} size={56} />
              <span className="max-w-[80px] truncate text-[12px] text-(--tx2)">{s.channel.name}</span>
            </Link>
          ))}
        </div>
      )}
      {!loading && channels.length > 6 && (
        <p className="mt-2 text-xs text-(--tx3)">
          Showing videos from the first 20 of {channels.length} channels — oldest subscriptions may be hidden.
        </p>
      )}
      {loading ? (
        <SubscriptionsPageSkeleton />
      ) : videos.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={Users} title={t('subs.emptyTitle')} hint={t('subs.emptyHint')} action={<Link href="/explore" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">{t('subs.exploreBtn')}</Link>} />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {videos.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}
