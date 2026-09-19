"use client";
import Link from "next/link";
import { Compass } from "lucide-react";
import { useT } from "@/i18n/core";

export default function NotFound() {
  const { t, tp } = useT();
  void tp;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#7c5cff]/12 text-[#9d86ff]">
        <Compass size={28} />
      </span>
      <h1 className="mt-5 text-[46px] font-bold tracking-tight">404</h1>
      <p className="mt-1 text-[16px] font-semibold">{t("misc.nfTitle")}</p>
      <p className="mt-2 max-w-sm text-sm text-(--tx3)">
        {t("misc.nfHint")}
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black hover:bg-white/90"
      >
        {t("misc.nfHome")}
      </Link>
    </div>
  );
}
