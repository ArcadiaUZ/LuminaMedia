"use client";
import { create } from "zustand";

export type Theme = "dark" | "light";

interface SettingsState {
  theme: Theme;
  notifsEnabled: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setNotifs: (v: boolean) => void;
  hydrate: () => void;
}

const LS_THEME = "lumina:theme";
const LS_NOTIFS = "lumina:notifs";

function applyTheme(t: Theme): void {
  try {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("light", t === "light");
    root.classList.toggle("dark", t !== "light");
    root.style.colorScheme = t === "light" ? "light" : "dark";
  } catch {
    /* ignore */
  }
}

function readTheme(): Theme {
  try {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem(LS_THEME) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function readNotifs(): boolean {
  try {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(LS_NOTIFS);
    return raw === null ? true : raw === "1";
  } catch {
    return true;
  }
}

export const useSettings = create<SettingsState>((set) => ({
  theme: "dark",
  notifsEnabled: true,
  setTheme: (theme) => {
    try {
      window.localStorage.setItem(LS_THEME, theme);
    } catch {
      /* ignore */
    }
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next: Theme = readTheme() === "light" ? "dark" : "light";
    try {
      window.localStorage.setItem(LS_THEME, next);
    } catch {
      /* ignore */
    }
    applyTheme(next);
    set({ theme: next });
  },
  setNotifs: (v) => {
    try {
      window.localStorage.setItem(LS_NOTIFS, v ? "1" : "0");
    } catch {
      /* ignore */
    }
    set({ notifsEnabled: v });
  },
  // Refresh'da paint'dan oldin tiklanadi — theme miltillamaydi
  hydrate: () => {
    const theme = readTheme();
    applyTheme(theme);
    set({ theme, notifsEnabled: readNotifs() });
  },
}));

// <html> class'larini joriy theme'ga moslash (store'dan tashqarida ham kerak)
export function currentTheme(): Theme {
  return readTheme();
}
