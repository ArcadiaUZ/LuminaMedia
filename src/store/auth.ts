"use client";
import { create } from "zustand";

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  channel?: { id: string; handle: string; name: string; avatarUrl?: string | null } | null;
}

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: SessionUser | null) => void;
  logout: () => Promise<void>;
  hydrate: () => void;
}

const LS_USER = "lumina:session:user";

function readCachedUser(): SessionUser | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(LS_USER);
    if (!raw) return null;
    const u = JSON.parse(raw) as SessionUser;
    if (!u || typeof u.id !== "string") return null;
    return u;
  } catch {
    return null;
  }
}

function writeCachedUser(u: SessionUser | null): void {
  try {
    if (typeof window === "undefined") return;
    if (u) window.localStorage.setItem(LS_USER, JSON.stringify(u));
    else window.localStorage.removeItem(LS_USER);
  } catch {
    /* ignore */
  }
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => {
    writeCachedUser(user);
    set({ user });
  },
  // Refresh'dan keyin paint'dan oldin chaqiriladi — avatar/tugmalar
  // darhol joyida turadi, keyin server bilan tekshiriladi (siljish yo'q)
  hydrate: () => {
    const cached = readCachedUser();
    if (cached) set({ user: cached, loading: false });
  },
  refresh: async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      if (r.status === 401) {
        writeCachedUser(null);
        set({ user: null, loading: false });
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json().catch(() => ({ user: null }));
      writeCachedUser(j.user ?? null);
      set({ user: j.user ?? null, loading: false });
    } catch {
      // Tarmoq xatosi — keshdagi user tursin (bo'shliqqa almashib siljimaydi)
      set({ loading: false });
    }
  },
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    writeCachedUser(null);
    set({ user: null });
    // full reload intentionally resets all client state after logout
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  },
}));
