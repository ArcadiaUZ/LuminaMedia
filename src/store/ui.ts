"use client";
import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebar: (v: boolean) => void;
  hydrateSidebar: () => void;
  toasts: { id: number; msg: string; tone: "ok" | "err" }[];
  toast: (msg: string, tone?: "ok" | "err") => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

const LS_SIDEBAR = "lumina:ui:sidebar";

function readSidebar(): boolean | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(LS_SIDEBAR);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

function writeSidebar(v: boolean): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_SIDEBAR, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export const useUI = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () =>
    set((s) => {
      writeSidebar(!s.sidebarOpen);
      return { sidebarOpen: !s.sidebarOpen };
    }),
  setSidebar: (v) => {
    writeSidebar(v);
    set({ sidebarOpen: v });
  },
  // Refresh'da paint'dan oldin tiklanadi — sidebar kengligi sakramaydi
  hydrateSidebar: () => {
    const v = readSidebar();
    if (v !== null) set({ sidebarOpen: v });
  },
  toasts: [],
  toast: (msg, tone = "ok") => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, msg, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
