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

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { toast } = useUI();
  const { t, tp } = useT();
  void tp;
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Registration failed");
      setUser(j.user);
      toast(t("register.toastWelcome"));
      router.push("/");
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <Backdrop />
      <div className="glass glass-sheen glass-pointer fade-up relative w-full max-w-[440px] overflow-hidden rounded-3xl p-8">
        <Logo />
        <h1 className="mt-6 text-[26px] font-bold tracking-tight">{t("register.title")}</h1>
        <p className="mt-1 text-sm text-(--tx3)">{t("register.subtitle")}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label={t("register.email")}>
            <Input
              type="email"
              required
              placeholder={t("register.emailPh")}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
          </Field>
          <Field label={t("register.username")}>
            <Input
              required
              minLength={3}
              maxLength={24}
              placeholder={t("register.userPh")}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
            />
          </Field>
          <Field label={t("register.password")}>
            <PasswordInput
              required
              minLength={6}
              placeholder={t("register.passPh")}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
            />
          </Field>
          {err && (
            <p role="alert" className="rounded-xl bg-[#fb7185]/10 border border-[#fb7185]/20 px-3.5 py-2.5 text-[13px] text-(--tx-danger)">
              {err}
            </p>
          )}
          <Button type="submit" loading={loading} variant="iris" className="w-full" size="lg">
            {t("register.submit")}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-(--tx3)">
          {t("register.footer")}{" "}
          <Link href="/login" className="font-semibold text-(--tx1) hover:underline">
            {t("register.loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
