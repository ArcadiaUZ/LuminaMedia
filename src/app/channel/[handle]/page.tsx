"use client";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CalendarDays } from "lucide-react";
import { VideoCard, type CardVideo } from "@/components/video/VideoCard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton, VideoCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { formatViews, timeAgo } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { useUI } from "@/store/ui";
import { useT } from "@/i18n/core";

export default function ChannelPage({ params }: { params: Promise<{ handle: string }> }) {
  const { t, tp } = useT();
  const { handle } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useUI();
  const [data, setData] = useState<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel: any;
    subscribed: boolean;
    isOwner: boolean;
  } | null>(null);
  const [videos, setVideos] = useState<CardVideo[]>([]);
  const [tabId, setTabId] = useState("videos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/channels/by-handle/${handle}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Channel not found");
      setData(j);
      const v = await fetch(`/api/videos?channelId=${j.channel.id}&limit=24&sort=newest`).then((x) => x.json());
      setVideos(v.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    load();
  }, [load]);

  const subscribe = async () => {
    if (!user) {
      toast(t('channel.loginSubscribe'), "err");
      return;
    }
    if (!data) return;
    const r = await fetch(`/api/channels/${data.channel.id}/subscribe`, { method: "POST" });
    const j = await r.json();
    if (r.ok) {
      setData({
        ...data,
        subscribed: j.subscribed,
        channel: { ...data.channel, _count: { ...data.channel._count, subscribers: j.count } },
      });
    } else toast(j.error ?? "Failed", "err");
  };

  if (error)
    return (
      <div className="mx-auto max-w-2xl pt-10">
        <ErrorState title={t('channel.notFound')} hint={error} onRetry={load} />
      </div>
    );

  if (loading || !data)
    return (
      <div className="space-y-5">
        <Skeleton className="h-36 w-full md:h-48" />
        <div className="flex gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-60" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );

  const c = data.channel;
  const tabs = [
    { id: "videos", label: t('channel.tabVideos') },
    { id: "about", label: t('channel.tabAbout') },
  ];

  return (
    <div className="fade-up">
      <div className="relative h-36 overflow-hidden rounded-3xl border border-[rgb(var(--tint)/0.07)] bg-gradient-to-br from-[#7c5cff]/30 via-[#1b1b27] to-[#0c0c13] md:h-52">
        {c.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.bannerUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Avatar src={c.avatarUrl} name={c.name} size={76} />
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight">
            {c.name}
            {c.verified && <BadgeCheck size={20} className="text-[#7c5cff]" />}
          </h1>
          <p className="truncate text-sm text-(--tx3)">
            @{c.handle} · {tp('channel.subscribers', c._count.subscribers)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        {data.isOwner ? (
          <>
            <Button variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={() => router.push("/studio")}>
              {t('channel.manage')}
            </Button>
            <Button size="sm" className="flex-1 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.06] active:scale-95 sm:flex-none" onClick={() => router.push("/upload")}>
              {t('channel.upload')}
            </Button>
          </>
        ) : (
          <Button variant={data.subscribed ? "ghost" : "primary"} className="w-full sm:w-auto" onClick={subscribe}>
            {data.subscribed ? t('channel.subscribed') : t('channel.subscribe')}
          </Button>
        )}
      </div>

      <div className="mt-5">
        <Tabs
          tabs={tabs.map((tb) => tb.label)}
          active={tabs.find((tb) => tb.id === tabId)?.label ?? tabs[0].label}
          onChange={(label) => {
            const found = tabs.find((tb) => tb.label === label);
            if (found) setTabId(found.id);
          }}
        />
      </div>

      {tabId === "videos" && (
        <div className="mt-5">
          {videos.length === 0 ? (
            <EmptyState title={t('channel.emptyTitle')} hint={t('channel.emptyHint')} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {videos.map((v) => (
                <VideoCard key={v.id} v={v} />
              ))}
            </div>
          )}
        </div>
      )}
      {tabId === "about" && (
        <div className="glass-min mt-5 max-w-2xl space-y-4 rounded-2xl p-5 text-sm">
          <p className="leading-relaxed text-(--tx2)">{c.description || t('channel.noDesc')}</p>
          <div className="space-y-2 border-t border-[rgb(var(--tint)/0.07)] pt-4 text-(--tx3)">
            <p>
              <span className="font-semibold text-(--tx1)">{c._count.videos}</span> {tp('channel.videos', c._count.videos).replace(/^[0-9\s., ]+/, "").trim() || t('channel.tabVideos')}
            </p>
            <p>
              <span className="font-semibold text-(--tx1)">{formatViews(c._count.subscribers)}</span> {tp('channel.subscribers', c._count.subscribers).replace(/^[0-9\s., ]+/, "").trim()}
            </p>
            <p className="flex items-center gap-1.5">
              <CalendarDays size={13} /> {t('channel.joined', { ago: timeAgo(c.user.createdAt) })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
