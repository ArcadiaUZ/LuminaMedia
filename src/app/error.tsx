"use client";
import { useEffect } from "react";
import { ErrorState } from "@/components/ui/States";
import { useT } from "@/i18n/core";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t, tp } = useT();
  void tp;
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-2xl pt-10">
      <ErrorState title={t("misc.errTitle")} hint={t("misc.errHint")} onRetry={reset} />
    </div>
  );
}
