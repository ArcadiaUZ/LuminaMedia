"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Home, Compass, Upload, Library, User } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/core";

const items = [
  { href: "/", key: "mob.home", icon: Home },
  { href: "/explore", key: "mob.explore", icon: Compass },
  { href: "/upload", key: "mob.create", icon: Upload, fab: true },
  { href: "/library", key: "mob.library", icon: Library },
  { href: "/profile", key: "mob.you", icon: User },
];

export function MobileNav() {
  const { t } = useT();
  const path = usePathname();
  const router = useRouter();
  // Raketa uchishi: Upload bosilganda tugma avval animatsiya bilan
  // tepaga "uchadi", keyin /upload ga o'tadi — YouTube'dagidek jonli his.
  const [launching, setLaunching] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );
  // Sahifa almashganda FAB holati taymer bilan tozalanadi (pastga qarang) —
  // /upload ga darhol o'tilgani uchun path o'zgarishi animatsiyani
  // o'chirmasligi kerak, aks holda raketa ucholmay qoladi.
  const reduceMotion = useReducedMotion();
  // Hidden while watching a video — immersive playback, no overlap with
  // the player or comment composer. Visible everywhere else.
  if (path.startsWith("/watch/")) return null;

  const handleUpload = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (launching || path === "/upload") return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return; // oddiy Link navigatsiya, animatsiyasiz
    e.preventDefault();
    // Upload sahifa xira + bloklangan ochiladi, raketa uning ustida uchadi,
    // 2.2s'dan keyin sahifa silliq tiniqlashadi (flag sessionStorage'da).
    try {
      sessionStorage.setItem("lumina:upload-enter", String(Date.now()));
    } catch {
      /* ignore */
    }
    setLaunching(true);
    router.push("/upload");
    timer.current = window.setTimeout(() => setLaunching(false), 2200);
  };
  return (
    // Tashqi o'ram fixed — hech qanday transform'siz markazlash, scroll'da qimirlamaydi.
    // Pastdan safe-area + tayanch joy (min 28px) — Android gesture pill/home
    // indicator bosmaydi, sahifa kalta (scroll yo'q) yoki uzunligidan qat'i nazar
    // dock har doim skeleton holatidagi kabi bir xil balandlikda turadi.
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 md:hidden"
      style={{
        paddingBottom: "max(49px, calc(env(safe-area-inset-bottom, 0px) + 29px))",
        paddingLeft: "max(12px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(12px, env(safe-area-inset-right, 0px))",
      }}
    >
      <nav
        aria-label={t("mob.label")}
        className="glass-nav pointer-events-auto w-[min(94vw,420px)] rounded-full border border-[rgb(var(--tint)/0.08)] shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
      >
      <ul className="grid grid-cols-5 px-2">
        {items.map((it) => {
          const active = path === it.href;
          if (it.fab)
            return (
              <li key={it.href} className="grid place-items-center py-1.5">
                <Link
                  href={it.href}
                  aria-label={t(it.key)}
                  onClick={handleUpload}
                  className={cn(
                    "relative grid h-11 w-11 place-items-center rounded-full border border-[rgb(var(--tint)/0.12)] bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.25)] active:scale-95",
                    launching && "fab-launch"
                  )}
                >
                  <it.icon size={20} />
                </Link>
              </li>
            );
          return (
            <li key={it.href} className="relative grid place-items-center py-1.5">
              {/* Bitta umumiy bubble (layoutId) — bo'lim almashganda eski
                  joyidan o'chib yangisida paydo bo'lmaydi, balki prujina
                  bilan silliq suzib o'tadi */}
              {active && (
                <motion.span
                  aria-hidden
                  layoutId="mnav-active-pill"
                  initial={false}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 550, damping: 38 }
                  }
                  className="absolute inset-x-2 inset-y-1 rounded-full border border-[rgb(var(--tint)/0.14)] bg-gradient-to-br from-[rgb(var(--tint)/0.16)] to-[rgb(var(--tint)/0.05)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
                />
              )}
              <Link
                href={it.href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 text-[10.5px] font-medium",
                  active ? "text-(--tx1)" : "text-(--tx4)"
                )}
              >
                <it.icon size={20} />
                {t(it.key)}
              </Link>
            </li>
          );
        })}
      </ul>
      </nav>
    </div>
  );
}