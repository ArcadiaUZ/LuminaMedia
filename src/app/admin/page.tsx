"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Search, LogOut, ArrowUpRight, BadgeCheck, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { Backdrop } from "@/components/ui/Backdrop";
import { useUI } from "@/store/ui";
import { useAuth } from "@/store/auth";
import { useT } from "@/i18n/core";

type AdminUser = {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  channel: {
    id: string;
    handle: string;
    name: string;
    avatarUrl: string | null;
    verified: boolean;
    _count: { videos: number; subscribers: number };
  } | null;
};

type ViewingAs = { id: string; username: string; channel: { name: string } | null } | null;

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useUI();
  const { refresh } = useAuth();
  const { t } = useT();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Login form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Accounts list
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState("");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<ViewingAs>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => setIsAdmin(r.ok))
      .catch(() => setIsAdmin(false))
      .finally(() => setChecking(false));
  }, []);

  const loadUsers = useCallback(async () => {
    setListLoading(true);
    setListErr("");
    try {
      const r = await fetch("/api/admin/users");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      setUsers(j.users ?? []);
    } catch {
      setListErr(t("admin.loadFail"));
    } finally {
      setListLoading(false);
    }
  }, [t]);

  const loadViewing = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/impersonate");
      if (!r.ok) return;
      const j = await r.json();
      setViewing(j.user ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    loadViewing();
  }, [isAdmin, loadUsers, loadViewing]);

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr("");
    setLoginLoading(true);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok) throw new Error(t("admin.badCreds"));
      setIsAdmin(true);
    } catch (e: unknown) {
      setLoginErr(e instanceof Error ? e.message : t("admin.badCreds"));
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    setIsAdmin(false);
    setUsers([]);
    setViewing(null);
    setUsername("");
    setPassword("");
  };

  // Kanal tanlash → shu kanal nomidan Studio'ga kirish.
  // refresh: sessiya-store impersonate cookie bilan yangilanadi,
  // keyin Studio o'sha user'i bilan ochiladi.
  const openStudio = async (userId: string) => {
    setActingId(userId);
    try {
      const r = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!r.ok) throw new Error("Failed");
      await refresh();
      router.push("/studio");
    } catch {
      toast(t("admin.loadFail"), "err");
    } finally {
      setActingId(null);
    }
  };

  const stopViewing = async () => {
    await fetch("/api/admin/impersonate", { method: "DELETE" }).catch(() => {});
    setViewing(null);
    await refresh();
    router.push("/admin");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.channel?.handle.toLowerCase().includes(q) ?? false) ||
        (u.channel?.name.toLowerCase().includes(q) ?? false)
    );
  }, [users, query]);

  if (checking) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // —— Admin login (sayt stilida: glass card + Backdrop) ——
  if (!isAdmin) {
    return (
      <div className="relative grid place-items-center overflow-hidden px-4 py-10">
        <Backdrop />
        <div className="glass glass-sheen glass-pointer fade-up relative w-full max-w-[420px] overflow-hidden rounded-3xl p-8">
          <Logo />
          <div className="mt-6 flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#7c5cff]/12 text-[#9d86ff]">
              <ShieldCheck size={19} />
            </span>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight">{t("admin.loginTitle")}</h1>
              <p className="text-[13px] text-(--tx3)">{t("admin.loginHint")}</p>
            </div>
          </div>
          <form onSubmit={submitLogin} className="mt-6 space-y-4">
            <Field label={t("admin.username")} error={undefined}>
              <Input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("admin.usernamePh")}
                autoComplete="username"
              />
            </Field>
            <Field label={t("admin.password")} error={undefined}>
              <PasswordInput
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("admin.passwordPh")}
                autoComplete="current-password"
              />
            </Field>
            {loginErr && (
              <p
                role="alert"
                className="rounded-xl bg-[#fb7185]/10 border border-[#fb7185]/20 px-3.5 py-2.5 text-[13px] text-(--tx-danger)"
              >
                {loginErr}
              </p>
            )}
            <Button type="submit" loading={loginLoading} className="w-full" size="lg">
              {t("admin.submit")}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // —— Akkauntlar ro'yxati ——
  return (
    <div className="fade-up mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#7c5cff]/12 text-[#9d86ff]">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight">{t("admin.title")}</h1>
            <p className="text-sm text-(--tx3)">{t("admin.subtitle")}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut size={15} /> {t("admin.logout")}
        </Button>
      </div>

      {viewing && (
        <div className="glass-min mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#7c5cff]/30 bg-[#7c5cff]/10 px-4 py-3 text-sm">
          <span className="font-semibold">{t("admin.viewingAs", { name: viewing.channel?.name ?? viewing.username })}</span>
          <span className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => router.push("/studio")}>
            {t("admin.studioBtn")}
          </Button>
          <button
            onClick={stopViewing}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium text-(--tx2) hover:bg-white/10 hover:text-(--tx1)"
          >
            <X size={14} /> {t("admin.stopViewing")}
          </button>
        </div>
      )}

      <div className="glass-chip mt-4 flex items-center gap-2 rounded-full border-[rgb(var(--tint)/0.09)] px-4 py-2">
        <Search size={16} className="shrink-0 text-(--tx4)" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("admin.searchPh")}
          className="w-full bg-transparent text-[14px] outline-none placeholder:text-(--tx4)"
        />
      </div>

      <div className="mt-4">
        {listLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : listErr ? (
          <div className="glass-min rounded-2xl p-6 text-center text-sm text-(--tx-danger)">
            {listErr}
            <div className="mt-3">
              <Button size="sm" onClick={loadUsers}>
                Retry
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ShieldCheck} title={t("admin.empty")} hint="" />
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="card-hover glass-min flex items-center gap-3.5 rounded-2xl p-3.5"
              >
                <Avatar src={u.channel?.avatarUrl ?? u.avatarUrl} name={u.channel?.name ?? u.username} size={46} />
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-[14.5px] font-semibold">
                    {u.channel?.name ?? u.username}
                    {u.channel?.verified && <BadgeCheck size={15} className="shrink-0 text-[#7c5cff]" />}
                  </span>
                  <span className="block truncate text-[12.5px] text-(--tx3)">
                    {u.channel ? `@${u.channel.handle} · ${u.email}` : u.email}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-(--tx4)">
                    {u.channel
                      ? `${t("admin.videos", { n: u.channel._count.videos })} · ${t("admin.subs", { n: u.channel._count.subscribers })}`
                      : t("admin.noChannel")}
                  </span>
                </div>
                <Button
                  size="sm"
                  loading={actingId === u.id}
                  disabled={!u.channel}
                  onClick={() => openStudio(u.id)}
                  title={!u.channel ? t("admin.noChannel") : undefined}
                >
                  {t("admin.studioBtn")} <ArrowUpRight size={15} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
