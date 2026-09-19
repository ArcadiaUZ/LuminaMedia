"use client";
import { create } from "zustand";

export type Locale = "en" | "uz" | "ru";

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  hydrate: () => void;
}

const LS_LOCALE = "lumina:locale";

function readLocale(): Locale {
  try {
    if (typeof window === "undefined") return "en";
    const raw = window.localStorage.getItem(LS_LOCALE);
    return raw === "uz" || raw === "ru" ? raw : "en";
  } catch {
    return "en";
  }
}

function applyLocale(l: Locale): void {
  try {
    if (typeof document === "undefined") return;
    document.documentElement.lang = l === "uz" ? "uz" : l === "ru" ? "ru" : "en";
  } catch {
    /* ignore */
  }
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: "en",
  setLocale: (locale) => {
    try {
      window.localStorage.setItem(LS_LOCALE, locale);
    } catch {
      /* ignore */
    }
    applyLocale(locale);
    set({ locale });
  },
  // Refresh'da paint'dan oldin tiklanadi — til miltillamaydi
  hydrate: () => {
    const locale = readLocale();
    applyLocale(locale);
    set({ locale });
  },
}));
