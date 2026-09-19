"use client";
import Link from "next/link";
import { History, Clock, ThumbsUp, ListVideo } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useT } from "@/i18n/core";

export default function LibraryPage() {
  const { t } = useT();
  const { user, loading } = useAuth();
  const rows = [
    { href: "/history", icon: History, label: t('library.history'), hint: t('library.historyHint') },
    { href: "/watch-later", icon: Clock, label: t('library.wlater'), hint: t('library.wlaterHint') },
    { href: "/liked", icon: ThumbsUp, label: t('library.liked'), hint: t('library.likedHint') },
    { href: "/playlists", icon: ListVideo, label: t('library.playlists'), hint: t('library.playlistsHint') },
  ];
  if (loading)
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-[rgb(var(--tint)/0.04)]" />
        ))}
      </div>
    );
  return (
    <div className="fade-up">
      <h1 className="text-[22px] font-bold tracking-tight">{t('library.title')}</h1>
      <p className="text-sm text-(--tx3)">{t('library.sub')}</p>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <Link key={r.href} href={r.href} className="card-hover glass-min flex items-center gap-3.5 rounded-2xl p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#7c5cff]/12 text-[#9d86ff]">
              <r.icon size={18} />
            </span>
            <span>
              <span className="block text-[14px] font-semibold">{r.label}</span>
              <span className="text-[12.5px] text-(--tx3)">{r.hint}</span>
            </span>
          </Link>
        ))}
        {!user && (
          <Link href="/login" className="card-hover glass-min col-span-full rounded-2xl p-6 text-center text-sm text-(--tx3)">
            {t('library.loginPrompt')}
          </Link>
        )}
      </div>
    </div>
  );
}