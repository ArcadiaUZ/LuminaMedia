"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { LiquidBackground } from "@/components/ui/glass/LiquidBackground";
import { useUI } from "@/store/ui";
import { useAuth } from "@/store/auth";
import { useSettings } from "@/store/settings";
import { useLocaleStore } from "@/store/locale";
import { useIsoLayoutEffect } from "@/lib/iso-layout";
import { useT } from "@/i18n/core";
import { cn } from "@/lib/utils";

const CHROMELESS = ["/login", "/register"];

// Fixed sidebar kengliklari + chetlar: yopiq 12+76+8=96, ochiq 12+240+8=260
const CONTENT_ML = { open: "md:ml-[260px]", closed: "md:ml-[96px]" } as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { t } = useT();
  const { sidebarOpen } = useUI();
  const { refresh: refreshAuth } = useAuth();
  const { hydrate: hydrateSettings } = useSettings();
  const { hydrate: hydrateLocale } = useLocaleStore();
  const bare = CHROMELESS.some((p) => path.startsWith(p));

  // Admin ko'rish rejimi: admin biror kanalni tanlagan bo'lsa, oddiy
  // foydalanuvchi chrome'ining o'rniga cheklangan qobiq chiqadi —
  // faqat Studio (+ /admin) ko'rinadi, akkauntga oid hech narsa yo'q.
  const [viewing, setViewing] = useState<{ username: string; channel: { name: string } | null } | null>(null);
  useEffect(() => {
    fetch("/api/admin/impersonate")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setViewing(j?.user ?? null))
      .catch(() => setViewing(null));
  }, [path]);
  const adminView = viewing !== null;

  // Cheklangan rejimda Studio/Admin'dan boshqa sahifa ochilmaydi
  useEffect(() => {
    if (adminView && !path.startsWith("/studio") && !path.startsWith("/admin")) {
      router.replace("/studio");
    }
  }, [adminView, path, router]);

  const stopViewing = async () => {
    await fetch("/api/admin/impersonate", { method: "DELETE" }).catch(() => {});
    setViewing(null);
    await refreshAuth();
    router.push("/admin");
  };

  const adminBanner = adminView && (
    <div className="glass-min mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#7c5cff]/30 bg-[#7c5cff]/10 px-4 py-2 text-[13px]">
      <ShieldCheck size={15} className="shrink-0 text-[#9d86ff]" />
      <span className="font-semibold">
        {t("admin.viewingAs", { name: viewing?.channel?.name ?? viewing?.username ?? "" })}
      </span>
      <span className="flex-1" />
      <button
        onClick={() => router.push("/admin")}
        className="rounded-full px-3 py-1.5 font-medium text-(--tx2) transition hover:bg-white/10 hover:text-(--tx1)"
      >
        {t("admin.backToAdmin")}
      </button>
      <button
        onClick={stopViewing}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium text-(--tx2) transition hover:bg-white/10 hover:text-(--tx1)"
      >
        <X size={14} /> {t("admin.stopViewing")}
      </button>
    </div>
  );

  // Theme + til paint'dan oldin qo'llanadi — miltillash bo'lmaydi
  useIsoLayoutEffect(() => {
    hydrateSettings();
    hydrateLocale();
  }, [hydrateSettings, hydrateLocale]);

  if (bare)
    return (
      <div className="relative">
        <LiquidBackground />
        <div className="app-content">{children}</div>
      </div>
    );

  return (
    <div className="relative min-h-screen">
      <LiquidBackground />
      {/* Suzuvchi yumaloq navbar — sticky o'ramda, tepada masofa bilan */}
      <div className="sticky top-0 z-40 px-2 pt-3 md:px-3 md:pt-3">
        {adminBanner}
        <Navbar adminView={adminView} />
      </div>
      <div className="flex">
        {!adminView && <Sidebar />}
        <div
          className={cn(
            "app-content flex min-w-0 flex-1 flex-col pl-2 transition-[margin] duration-300 md:pl-0",
            !adminView && (sidebarOpen ? CONTENT_ML.open : CONTENT_ML.closed)
          )}
        >
          {/* Mobil'da pastki dock (~130px) kontentni bosmasligi uchun pb-40;
              desktop'da MobileNav yo'q — md:pb-12 yetadi */}
          <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 pb-40 pt-5 md:px-6 md:pb-12">
            {children}
          </main>
        </div>
      </div>
      {!adminView && <MobileNav />}
    </div>
  );
}
