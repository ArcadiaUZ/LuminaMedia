"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, Upload, Bell, Menu, X, User as UserIcon, LogOut, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { useUI } from "@/store/ui";
import { useAuth } from "@/store/auth";
import { useSettings } from "@/store/settings";
import { useIsoLayoutEffect } from "@/lib/iso-layout";
import { timeAgo } from "@/lib/utils";
import { useT } from "@/i18n/core";

interface Notif {
  id: string;
  title: string;
  body?: string | null;
  read: boolean;
  createdAt: string;
  videoId?: string | null;
}

export function Navbar({ adminView = false }: { adminView?: boolean }) {
  const { toggleSidebar } = useUI();
  const { user, refresh, logout, loading, hydrate } = useAuth();
  const { notifsEnabled } = useSettings();
  const { t } = useT();
  // Yangilanayotganda shakli ko'rinadi (kontentsiz shimmer) —
  // tayyor bo'lganda geometriya bir xil bo'lgani uchun joyidan qimirlamaydi
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [openMenu, setOpenMenu] = useState<"notif" | "user" | null>(null);
  const [mSearch, setMSearch] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const wrapRef = useRef<HTMLDivElement>(null);
  const mInputRef = useRef<HTMLInputElement>(null);

  // URL'dagi qidiruv so'rovi inputda saqlanadi — refresh'dan keyin ham
  // yozilgan narsa yo'qolmaydi (Suspense talab qilmasdan, location orqali)
  useEffect(() => {
    const sync = () => {
      try {
        setQ(new URLSearchParams(window.location.search).get("q") ?? "");
      } catch {
        /* ignore */
      }
    };
    sync();
    // Back/forward'da bir xil path'da query almashganda
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [pathname]);

  useIsoLayoutEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setReady(true);
  }, []);

  // Mobil qidiruv ochilganda klaviatura avtomatik chiqishi uchun fokus
  useEffect(() => {
    if (!mSearch) return;
    mInputRef.current?.focus({ preventScroll: true });
    const t = requestAnimationFrame(() => mInputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(t);
  }, [mSearch]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user || !notifsEnabled) return;
    fetch("/api/notifications?limit=8")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j) {
          setNotifs(j.items ?? []);
          setUnread(j.unread ?? 0);
        }
      })
      .catch(() => {});
  }, [user, notifsEnabled]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    // Bo'sh qidiruv yuborilmaydi — hech narsa yozilmagan bo'lsa qidirmaydi
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const markRead = async () => {
    await fetch("/api/notifications/read", { method: "POST" });
    setUnread(0);
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
  };

  if (!ready) {
    return (
      <header className="glass-nav rounded-2xl border border-[rgb(var(--tint)/0.08)] shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        <div className="grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:px-6">
          <div className="flex items-center gap-3 justify-self-start" aria-hidden="true">
            <div className="skeleton-shimmer hidden h-10 w-10 rounded-full md:block" />
            <div className="skeleton-shimmer h-8 w-8 rounded-xl" />
            <div className="skeleton-shimmer h-5 w-28 rounded-md" />
          </div>
          <div className="hidden w-full max-w-xl justify-self-center md:block" aria-hidden="true">
            <div className="skeleton-shimmer h-11 w-full rounded-full" />
          </div>
          <div className="flex items-center gap-1.5 justify-self-end" aria-hidden="true">
            <div className="skeleton-shimmer h-10 w-10 rounded-full md:hidden" />
            {!adminView && <div className="skeleton-shimmer hidden h-9 w-24 rounded-full sm:block" />}
            <div className="skeleton-shimmer h-10 w-10 rounded-full" />
            <div className="skeleton-shimmer h-[34px] w-[34px] rounded-full" />
          </div>
        </div>
      </header>
    );
  }

  // Admin ko'rish rejimi: akkauntga oid HECH NARSA ko'rinmaydi —
  // qo'ng'iroq, avatar menyu, create, login/signup yo'q. Faqat logo + shield.
  if (adminView) {
    return (
      <header className="glass-nav relative rounded-2xl border border-[rgb(var(--tint)/0.08)] shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        <div className="grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:px-6">
          <div className="col-start-1 flex items-center gap-3 justify-self-start">
            <Logo compact={false} />
          </div>
          <div className="col-start-3 justify-self-end">
            <Link
              href="/admin"
              aria-label={t("admin.backToAdmin")}
              className="grid h-10 w-10 place-items-center rounded-full bg-[#7c5cff]/12 text-[#9d86ff] transition hover:bg-[#7c5cff]/20"
            >
              <ShieldCheck size={19} />
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`glass-nav relative rounded-2xl border border-[rgb(var(--tint)/0.08)] shadow-[0_12px_40px_rgba(0,0,0,0.45)] ${mSearch ? "msearch-open" : ""}`}>
      {/* Mobil qidiruv overlay: lupa tomondan (o'ngdan) logo oldiga silliq sirg'alib chiqadi.
          Har doim mounted — yopiqda ko'rinmas, ochiqda joyiga sirg'aladi */}
      <div
        aria-hidden={!mSearch}
        className={`absolute inset-0 z-10 items-center gap-2 px-4 transition-all duration-300 md:hidden ${mSearch ? "flex translate-x-0 opacity-100" : "pointer-events-none flex translate-x-8 opacity-0"}`}
      >
        <form onSubmit={submit} className="ml-[44px] min-w-0 flex-1" role="search">
          <div className="relative w-full overflow-hidden rounded-full">
            <input
              ref={mInputRef}
              tabIndex={mSearch ? 0 : -1}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("nav.searchPlaceholderMobile")}
              aria-label={t("nav.search")}
              className="glass-field h-11 w-full rounded-full border-transparent px-4 pr-20 text-sm outline-none transition placeholder:text-(--tx4) focus:border-[#7c5cff]/50"
            />
            <button
              type="submit"
              tabIndex={mSearch ? 0 : -1}
              className="glass-pill absolute right-1.5 top-1/2 z-10 h-8 -translate-y-1/2 rounded-full px-4 text-[13px] font-semibold text-black transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              {t("nav.search")}
            </button>
          </div>
        </form>
        <button
          onClick={() => setMSearch(false)}
          aria-label={t("nav.searchClose")}
          tabIndex={mSearch ? 0 : -1}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-(--tx3) hover:text-(--tx1)"
        >
          <X size={19} />
        </button>
      </div>
      {/* 3 ustunli grid: search har doim rostan markazda — yon tomonlar
          (auth tugmalari) o'zgarganda chapga-o'ngga siljimaydi */}
      <div className="grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:grid md:px-6">
        {/* Chap: sidebar tugma + logo (1-ustun) */}
        <div className="col-start-1 flex items-center gap-3 justify-self-start">
          <button
            onClick={toggleSidebar}
            aria-label={t("nav.toggleSidebar")}
            className="hidden h-10 w-10 place-items-center rounded-full text-(--tx3) hover:bg-[rgb(var(--tint)/0.07)] hover:text-(--tx1) md:grid"
          >
            <Menu size={19} />
          </button>
          <Logo compact={false} />
        </div>

        {/* Markaz: desktop search (2-ustun). Mobil'da yashirin — o'ng blok
            3-ustunda qoladi, o'rtaga tushib ketmaydi */}
        <form onSubmit={submit} className="col-start-2 hidden w-full max-w-xl justify-self-center md:block" role="search">
          <div className="relative w-full overflow-hidden rounded-full">
            <Search size={16} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-(--tx4)" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("nav.searchPlaceholder")}
              aria-label={t("nav.search")}
              className="glass-field h-11 w-full rounded-full border-transparent pl-11 pr-24 text-sm outline-none transition placeholder:text-(--tx4) focus:border-[#7c5cff]/50"
            />
            <button
              type="submit"
              className="glass-pill absolute right-1.5 top-1/2 z-10 h-8 -translate-y-1/2 rounded-full px-4 text-[13px] font-semibold text-black transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              {t("nav.search")}
            </button>
          </div>
        </form>

        {/* O'ng: har doim 3-ustun chetida. Mobil qidiruv ochilganda sekin yo'qoladi (X shu yerda chiqadi) */}
        <div className={`col-start-3 flex items-center gap-1.5 justify-self-end transition-all duration-300 ${mSearch ? "max-md:pointer-events-none max-md:scale-90 max-md:opacity-0" : ""}`} ref={wrapRef}>
          <button
            onClick={() => {
              setOpenMenu(null);
              setMSearch(true);
            }}
            aria-label={t("nav.search")}
            className="grid h-10 w-10 place-items-center rounded-full text-(--tx2) hover:bg-[rgb(var(--tint)/0.07)] hover:text-(--tx1) md:hidden"
          >
            <Search size={19} />
          </button>
          <Link
            href={user ? "/upload" : "/login"}
            className="glass-chip hidden items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-(--tx2) transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.06] hover:-translate-y-0.5 hover:text-(--tx1) hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 sm:flex"
          >
            <Upload size={15} />
            {t("nav.create")}
          </Link>

          {loading ? (
            // Auth tekshirilayotganda — real holat bilan PIXEL-MA-PIXEL bir xil:
            // qo'ng'iroq o'rni (h-10 w-10) + avatar o'rni (34px), gap-1.5.
            // O'lcham bir xil bo'lgani uchun grid qayta hisoblanmaydi, hech narsa siljimaydi.
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <div className="skeleton-shimmer h-10 w-10 rounded-full" />
              <div className="skeleton-shimmer h-[34px] w-[34px] rounded-full" />
            </div>
          ) : user ? (
            <>
              {notifsEnabled && (
              <div className="relative">
                <button
                  onClick={() => setOpenMenu(openMenu === "notif" ? null : "notif")}
                  aria-label={t("nav.notifications")}
                  className="relative grid h-10 w-10 place-items-center rounded-full text-(--tx2) hover:bg-[rgb(var(--tint)/0.07)] hover:text-(--tx1)"
                >
                  <Bell size={19} />
                  {unread > 0 && (
                    <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full border border-[#9d86ff]/50 bg-[#7c5cff]/85 px-1 text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
                {openMenu === "notif" && (
                  <div className="glass-pop absolute right-0 top-12 w-[min(calc(100vw-32px),340px)] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl">
                    <div className="flex items-center justify-between border-b border-[rgb(var(--tint)/0.08)] px-4 py-3">
                      <span className="text-sm font-semibold">{t("nav.notifications")}</span>
                      <button onClick={markRead} className="text-[12px] text-[#9d86ff] hover:text-(--tx1)">
                        {t("nav.markRead")}
                      </button>
                    </div>
                    <div className="max-h-[340px] overflow-y-auto">
                      {notifs.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-(--tx4)">{t("nav.empty")}</p>
                      )}
                      {notifs.map((n) => (
                        <Link
                          key={n.id}
                          href={n.videoId ? `/watch/${n.videoId}` : "/library"}
                          onClick={() => setOpenMenu(null)}
                          className="block border-b border-[rgb(var(--tint)/0.05)] px-4 py-3 transition hover:bg-[rgb(var(--tint)/0.06)]"
                        >
                          <p className="text-[13px] font-medium">{n.title}</p>
                          {n.body && <p className="mt-0.5 line-clamp-2 text-[12.5px] text-(--tx3)">{n.body}</p>}
                          <p className="mt-1 text-[11.5px] text-(--tx4)">{timeAgo(n.createdAt)}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              )}

              <div className="relative">
                <button onClick={() => setOpenMenu(openMenu === "user" ? null : "user")} aria-label={t("nav.profileMenu")}>
                  <Avatar src={user.avatarUrl} name={user.username} size={34} />
                </button>
                {openMenu === "user" && (
                  <div className="glass-pop user-menu absolute right-0 top-12 w-56 max-w-[calc(100vw-32px)] rounded-2xl p-1.5">
                    <div className="mb-1 border-b border-[rgb(var(--tint)/0.08)] px-3 py-2.5">
                      <p className="text-sm font-semibold">@{user.username}</p>
                      <p className="truncate text-[12px] text-(--tx4)">{user.email}</p>
                    </div>
                    <MenuLink href="/profile" icon={<UserIcon size={16} />} label={t("nav.profile")} onClick={() => setOpenMenu(null)} />
                    <MenuLink href="/settings" icon={<SettingsIcon size={16} />} label={t("nav.settings")} onClick={() => setOpenMenu(null)} />
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-[13.5px] text-(--tx-danger) transition hover:bg-[#fb7185]/10"
                    >
                      <LogOut size={16} /> {t("nav.signout")}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Telefonda navbar'da login so'ralmaydi (login MobileNav "You" orqali) —
            // o'ng tomonda faqat qidiruv ikonka qoladi
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="rounded-full px-4 py-2 text-[13.5px] font-medium text-(--tx2) transition hover:text-(--tx1)">
                {t("nav.login")}
              </Link>
              <Link href="/register" className="glass-pill rounded-full px-4 py-2 text-[13.5px] font-semibold text-black">
                {t("nav.signup")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-[13.5px] text-(--tx2) transition-all duration-300 hover:translate-x-1 hover:bg-[rgb(var(--tint)/0.06)] hover:text-(--tx1) hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
    >
      {icon} {label}
    </Link>
  );
}
