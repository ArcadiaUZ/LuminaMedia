"use client";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { useUI } from "@/store/ui";

export function Toaster() {
  const { toasts, dismissToast } = useUI();
  return (
    <div className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 w-[min(92vw,380px)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass-pop fade-up flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm"
        >
          {t.tone === "ok" ? (
            <CheckCircle2 size={17} className="text-[#34d399] shrink-0" />
          ) : (
            <AlertCircle size={17} className="text-[#fb7185] shrink-0" />
          )}
          <span className="flex-1">{t.msg}</span>
          <button
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
            className="text-(--tx3) hover:text-(--tx1)"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
