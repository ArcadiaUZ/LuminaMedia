"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { User, ListVideo, ThumbsUp, History, Clock, Palette, Bell } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/auth";
import { useT } from "@/i18n/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pl = any;

export default function ProfilePage() {
  const { t, tp } = useT();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [playlists, setPlaylists] = useState<Pl[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((j) => setPlaylists(j.items ?? []))
      .catch(() => {});
  }, [user]);

  if (loading)
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-32 w-full" />
      </div>
    );

  if (!user)
    return (
      <div className="mx-auto max-w-xl pt-10">
        <EmptyState
          icon={User}
          title={t('profile.notSigned')}
          hint={t('profile.notSignedHint')}
          action={
            <Button onClick={() => router.push("/login")}>{t('profile.login')}</Button>
          }
        />
      </div>
    );

  const menu = [
    { href: "/studio", icon: Palette, label: t('profile.studio'), hint: t('profile.studioHint') },
    { href: "/history", icon: History, label: t('profile.history'), hint: t('profile.historyHint') },
    { href: "/watch-later", icon: Clock, label: t('profile.wlater'), hint: t('profile.wlaterHint') },
    { href: "/liked", icon: ThumbsUp, label: t('profile.liked'), hint: t('profile.likedHint') },
    { href: "/playlists", icon: ListVideo, label: t('profile.playlists'), hint: tp('profile.plCount', playlists.length) },
    { href: "/subscriptions", icon: Bell, label: t('profile.subs'), hint: t('profile.subsHint') },
  ];

  return (
    <div className="mx-auto max-w-3xl fade-up">
      {/* Mobil'da ustma-ust (avatar + matn + tugma bir qatorda sig'maydi,
          yozuvlar bir-biriga kiradi) — shuning uchun telefonda column,
          desktop'da row. Tugma mobil'da to'liq qatorga tushadi. */}
      <div className="glass flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <Avatar src={user.avatarUrl} name={user.username} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[20px] font-bold tracking-tight sm:text-[24px]">{user.username}</h1>
            <p className="truncate text-sm text-(--tx3)">{user.email}</p>
            <Link href={`/channel/${user.channel?.handle}`} className="mt-1 inline-block max-w-full truncate rounded-full bg-[rgb(var(--tint)/0.07)] px-3 py-1 text-[12.5px] font-medium text-(--tx2) hover:bg-[rgb(var(--tint)/0.12)]">
              @{user.channel?.handle ?? t('profile.noChannel')}
            </Link>
          </div>
        </div>
        {user.channel && (
          <Button variant="ghost" size="sm" className="w-full shrink-0 sm:ml-auto sm:w-auto" onClick={() => router.push(`/channel/${user.channel?.handle}`)}>
            {t('profile.viewChannel')}
          </Button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {menu.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="card-hover glass-min flex items-center gap-3.5 rounded-2xl p-4"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#7c5cff]/12 text-[#9d86ff]">
              <m.icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">{m.label}</span>
              <span className="block truncate text-[12.5px] text-(--tx3)">{m.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}