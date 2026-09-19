"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Input";
import { useAuth } from "@/store/auth";
import { useUI } from "@/store/ui";
import { Backdrop } from "@/components/ui/Backdrop";
import { useT } from "@/i18n/core";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { toast } = useUI();
  const { t, tp } = useT();
  void tp;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Login failed");
      setUser(j.user);
      toast(t("login.toastWelcome"));
      router.push("/");
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <Backdrop />
      <div className="glass glass-sheen glass-pointer fade-up relative w-full max-w-[420px] overflow-hidden rounded-3xl p-8">
        <Logo />
        <h1 className="mt-6 text-[26px] font-bold tracking-tight">{t("login.title")}</h1>
        <p className="mt-1 text-sm text-(--tx3)">{t("login.subtitle")}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label={t("login.email")} error={undefined}>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.emailPh")}
              autoComplete="email"
            />
          </Field>
          <Field label={t("login.password")} error={undefined}>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("login.passPh")}
              autoComplete="current-password"
            />
          </Field>
          {err && (
            <p role="alert" className="rounded-xl bg-[#fb7185]/10 border border-[#fb7185]/20 px-3.5 py-2.5 text-[13px] text-(--tx-danger)">
              {err}
            </p>
          )}
          <Button type="submit" loading={loading} className="w-full" size="lg">
            {t("login.submit")}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-(--tx3)">
          {t("login.footer")}{" "}
          <Link href="/register" className="font-semibold text-(--tx1) hover:underline">
            {t("login.create")}
          </Link>
        </p>
      </div>
    </div>
  );
}

// Re-export for backward compatibility (register page previously imported from here)
export { Backdrop as LoginBackdrop } from "@/components/ui/Backdrop";
