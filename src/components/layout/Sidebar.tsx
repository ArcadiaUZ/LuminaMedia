"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Users, Library, History, Clock, ThumbsUp, ListVideo, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUI } from "@/store/ui";
import { useIsoLayoutEffect } from "@/lib/iso-layout";
import { useT } from "@/i18n/core";

const main = [
  { href: "/", key: "side.home", icon: Home },
  { href: "/explore", key: "side.explore", icon: Compass },
  { href: "/subscriptions", key: "side.subs", icon: Users },
  { href: "/library", key: "side.library", icon: Library },
];

const personal = [
  { href: "/history", key: "side.history", icon: History },
  { href: "/watch-later", key: "side.watchLater", icon: Clock },
  { href: "/liked", key: "side.liked", icon: ThumbsUp },
  { href: "/playlists", key: "side.playlists", icon: ListVideo },
  { href: "/studio", key: "side.studio", icon: BarChart3 },
];

export function Sidebar() {
  const { t } = useT();
  const path = usePathname();
  const { sidebarOpen, hydrateSidebar } = useUI();
  const collapsed = !sidebarOpen;
  // Yangilanayotganda shakli ko'rinib turadi (nomlarsiz shimmer) —
  // tayyor bo'lganda geometriya bir xil bo'lgani uchun joyidan qimirlamaydi
  const [ready, setReady] = useState(false);

  // Refresh'da paint'dan oldin tiklanadi — kenglik animatsiyalanib siljimaydi
  useIsoLayoutEffect(() => {
    hydrateSidebar();
  }, [hydrateSidebar]);

  useEffect(() => {
    setReady(true);
  }, []);

  const asideClass = cn(
    // Fixed: scroll'da ham har doim bir joyda (88px tepa + 12px past).
    // Kontent AppShell'da chapdan suriladi, ustma-ust tushmaydi.
    // transition faqat tayyor bo'lgandan keyin ulanadi — refresh'da
    // saqlangan holatga o'tishda "qayta qisqarish" animatsiyasi bo'lmaydi.
    "glass-nav fixed left-2 md:left-3 top-[88px] bottom-3 z-30 hidden shrink-0 flex-col overflow-hidden rounded-2xl border border-[rgb(var(--tint)/0.08)] shadow-[0_12px_40px_rgba(0,0,0,0.45)] md:flex",
    ready && "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
    collapsed ? "w-[76px]" : "w-60"
  );

  if (!ready) {
    return (
      <aside className={asideClass} aria-label={t("side.primary")}>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-3" aria-hidden="true">
          <SideSkeleton rows={4} collapsed={collapsed} />
          {!collapsed && <div className="skeleton-shimmer mx-3 h-4 w-10 rounded-md" />}
          <SideSkeleton rows={5} collapsed={collapsed} />
        </nav>
      </aside>
    );
  }

  return (
    <aside className={asideClass} aria-label={t("side.primary")}>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-3">
        <Section items={main} path={path} collapsed={collapsed} />
        {!collapsed && (
          <p className="fade-up px-3 text-[11px] font-semibold uppercase tracking-widest text-(--tx4)">
            {t("side.you")}
          </p>
        )}
        <Section items={personal} path={path} collapsed={collapsed} />
      </nav>
    </aside>
  );
}

function SideSkeleton({ rows, collapsed }: { rows: number; collapsed: boolean }) {
  return (
    <ul className="space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className={cn(
            "flex items-center rounded-2xl",
            collapsed ? "flex-col gap-1 px-1 py-2.5" : "flex-row gap-3 px-3 py-2.5"
          )}
        >
          <span aria-hidden className="skeleton-shimmer h-[19px] w-[19px] shrink-0 rounded-full" />
          {collapsed ? (
            <span aria-hidden className="skeleton-shimmer h-3 w-6 rounded-md" />
          ) : (
            <span aria-hidden className="skeleton-shimmer h-5 min-w-0 flex-1 rounded-md" />
          )}
        </li>
      ))}
    </ul>
  );
}

function Section({
  items,
  path,
  collapsed,
}: {
  items: typeof main;
  path: string;
  collapsed: boolean;
}) {
  const { t } = useT();
  return (
    <ul className="space-y-1">
      {items.map((it) => {
        const active = path === it.href;
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? t(it.key) : undefined}
              className={cn(
                "group relative flex items-center rounded-2xl font-medium transition-all duration-300 outline-none hover:translate-x-1 focus:outline-none focus-visible:outline-none",
                collapsed
                  ? "flex-col gap-1 px-1 py-2.5 text-[9px] leading-tight"
                  : "flex-row gap-3 px-3 py-2.5 text-[13.5px]",
                active
                  ? "text-(--tx1)"
                  : "text-(--tx3) hover:bg-[rgb(var(--tint)/0.06)] hover:text-(--tx1) hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-2xl border border-[rgb(var(--tint)/0.14)] bg-gradient-to-br from-[rgb(var(--tint)/0.14)] to-[rgb(var(--tint)/0.05)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                />
              )}
              <it.icon size={19} className={cn("relative shrink-0 transition-transform duration-300 group-hover:scale-125", active && "text-[#b7a6ff]")} />
              {/* Yig'ilganda katta yozuv sekin g'oyib bo'ladi, kichigi silliq chiqadi */}
              <span
                className={cn(
                  "relative truncate transition-all duration-200",
                  collapsed ? "max-w-0 opacity-0" : "max-w-[180px] opacity-100"
                )}
              >
                {t(it.key)}
              </span>
              {collapsed && (
                <span className="fade-up relative text-[9px] leading-tight">{t(it.key)}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}