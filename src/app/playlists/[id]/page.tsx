"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ListVideo, Trash2 } from "lucide-react";
import { VideoCard, type CardVideo } from "@/components/video/VideoCard";
import { VideoCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useUI } from "@/store/ui";
import { useT } from "@/i18n/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pl = any;

export default function PlaylistDetail({ params }: { params: Promise<{ id: string }> }) {
  const { t, tp } = useT();
  const { id } = use(params);
  const { toast } = useUI();
  const [pl, setPl] = useState<Pl | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/playlists/${id}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Playlist not found");
      setPl(j.playlist);
      const me = await fetch("/api/auth/me").then((x) => x.json());
      setMine(me.user?.id === j.playlist.userId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const remove = async (videoId: string) => {
    const r = await fetch(`/api/playlists/${id}/items?videoId=${videoId}`, { method: "DELETE" });
    if (r.ok) {
      toast(t('pld.removed'));
      load();
    }
  };

  if (error)
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState title={t('pld.unavailable')} hint={error} onRetry={load} />
      </div>
    );
  if (loading || !pl)
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );

  const videos = (pl.items ?? []).map((it: { video: CardVideo }) => it.video);

  return (
    <div className="fade-up">
      <h1 className="text-[22px] font-bold tracking-tight">{pl.title}</h1>
      <p className="text-sm text-(--tx3)">
        {tp('pld.count', videos.length, { desc: pl.description ? ` · ${pl.description}` : "" })}
      </p>
      {videos.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={ListVideo} title={t('pld.emptyTitle')} hint={t('pld.emptyHint')} />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {videos.map((v: CardVideo) => (
            <div key={v.id} className="relative">
              <VideoCard v={v} />
              {mine && (
                <button
                  onClick={() => remove(v.id)}
                  aria-label={t('pld.removeAria')}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-[#fda4af] backdrop-blur hover:bg-[#fb7185]/80 hover:text-white"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <Link href="/playlists" className="mt-6 inline-block text-sm font-medium text-[#9d86ff] hover:text-(--tx1)">
        {t('pld.allPlaylists')}
      </Link>
    </div>
  );
}