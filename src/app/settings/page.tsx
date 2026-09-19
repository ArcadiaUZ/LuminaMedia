"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, MoonStar, LogOut, Languages, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { useAuth } from "@/store/auth";
import { useSettings } from "@/store/settings";
import { useLocaleStore, type Locale } from "@/store/locale";
import { useT } from "@/i18n/core";
import { useUI } from "@/store/ui";
import { cn } from "@/lib/utils";

const LANGS: { id: Locale; label: string; sub: string }[] = [
  { id: "en", label: "English", sub: "Default" },
  { id: "uz", label: "O'zbekcha", sub: "Uzbek" },
  { id: "ru", label: "Русский", sub: "Russian" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { theme, notifsEnabled, setTheme, setNotifs } = useSettings();
  const { locale, setLocale } = useLocaleStore();
  const { t, tp } = useT();
  void tp;
  const { toast } = useUI();
  // Tanlangan til faqat Save bosilganda qo'llanadi
  const [pending, setPending] = useState<Locale | null>(null);

  const activeLang = pending ?? locale;

  const saveLanguage = () => {
    if (!pending || pending === locale) return;
    setLocale(pending);
    setPending(null);
    toast(t("settings.language.saved"));
  };

  if (!loading && !user)
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-10 text-center">
        <h1 className="text-xl font-bold">{t("settings.guestTitle")}</h1>
        <p className="mt-2 text-sm text-(--tx3)">{t("settings.guestHint")}</p>
        <Button className="mt-5" onClick={() => router.push("/login")}>
          {t("settings.loginBtn")}
        </Button>
      </div>
    );

  const row = (icon: React.ReactNode, title: string, hint: string, control: React.ReactNode) => (
    <div className="flex items-center gap-4 rounded-2xl border border-[rgb(var(--tint)/0.07)] bg-[rgb(var(--tint)/0.03)] p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#7c5cff]/12 text-[#9d86ff]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-(--tx3)">{hint}</span>
      </span>
      {control}
    </div>
  );

  return (
    <div className="mr-auto w-full max-w-2xl fade-up">
      <h1 className="text-[24px] font-bold tracking-tight">{t("settings.title")}</h1>
      <p className="text-sm text-(--tx3)">{t("settings.subtitle")}</p>

      <h2 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-widest text-(--tx4)">{t("settings.appearance")}</h2>
      <div className="space-y-3">
        {row(
          <MoonStar size={19} />,
          t("settings.darkTitle"),
          theme === "dark"
            ? t("settings.darkHintDark")
            : t("settings.darkHintLight"),
          <Toggle
            checked={theme === "dark"}
            onChange={(v) => {
              setTheme(v ? "dark" : "light");
              toast(v ? t("settings.darkOn") : t("settings.darkOff"));
            }}
            label={t("settings.darkTitle")}
          />
        )}
      </div>

      <h2 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-widest text-(--tx4)">{t("settings.notifSection")}</h2>
      <div className="space-y-3">
        {row(
          <Bell size={19} />,
          t("settings.notifTitle"),
          notifsEnabled
            ? t("settings.notifHintOn")
            : t("settings.notifHintOff"),
          <Toggle
            checked={notifsEnabled}
            onChange={(v) => {
              setNotifs(v);
              toast(v ? t("settings.notifOn") : t("settings.notifOff"));
            }}
            label={t("settings.notifTitle")}
          />
        )}
      </div>

      <h2 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-widest text-(--tx4)">{t("settings.account")}</h2>
      <div className="space-y-3">
        <div className="flex items-center gap-4 rounded-2xl border border-[rgb(var(--tint)/0.07)] bg-[rgb(var(--tint)/0.03)] p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fb7185]/12 text-[#fb7185]">
            <LogOut size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">{t("settings.signout")}</span>
            <span className="mt-0.5 block text-[13px] text-(--tx3)">@{user?.username ?? "…"}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={logout}>
            {t("settings.signout")}
          </Button>
        </div>
      </div>

      <h2 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-widest text-(--tx4)">
        {t("settings.language.title")}
      </h2>
      <div className="rounded-2xl border border-[rgb(var(--tint)/0.07)] bg-[rgb(var(--tint)/0.03)] p-4">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#7c5cff]/12 text-[#9d86ff]">
            <Languages size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">{t("settings.language.title")}</span>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-(--tx3)">
              {t("settings.language.hint")}
            </span>
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {LANGS.map((l) => {
            const selected = activeLang === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setPending(l.id)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                  selected
                    ? "border-[#7c5cff]/50 bg-[#7c5cff]/10"
                    : "border-[rgb(var(--tint)/0.07)] hover:bg-[rgb(var(--tint)/0.05)]"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold">{l.label}</span>
                  <span className="block text-[12px] text-(--tx4)">{l.sub}</span>
                </span>
                {selected && (
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#7c5cff] text-white">
                    <Check size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            variant="iris"
            size="sm"
            disabled={!pending || pending === locale}
            onClick={saveLanguage}
          >
            {t("settings.language.save")}
          </Button>
        </div>
      </div>

    </div>
  );
}
