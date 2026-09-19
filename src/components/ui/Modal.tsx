"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  // Portal orqali body'ga chiqariladi — aks holda app-content stacking
  // context'i (z-index:1) ichida qolib navbar/sidebar (z-40/z-30) tagiga
  // tushadi va backdrop blur ularga tegmaydi.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[90] grid place-items-center p-4 bg-black/70 backdrop-blur-xl fade-up"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "glass-pop glass-sheen glass-pointer relative w-full overflow-hidden rounded-2xl p-6",
          wide ? "max-w-2xl" : "max-w-md"
        )}
      >
        <div className="-m-6 mb-4 flex items-center justify-between rounded-t-2xl border-b border-[rgb(var(--tint)/0.07)] px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="glass-chip h-8 w-8 grid place-items-center rounded-lg text-(--tx3) hover:text-(--tx1) active:scale-90"
          >
            <X size={16} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
}

// Styled confirmation dialog — use instead of native confirm()
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  busy = false,
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
            danger ? "bg-[#f43f5e]/12 text-[#fb7185]" : "bg-[#7c5cff]/12 text-[#9d86ff]"
          )}
        >
          <AlertTriangle size={20} />
        </span>
        <p className="pt-1 text-[14px] leading-relaxed text-(--tx2)">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={busy}
          className={cn(danger && "bg-[#f43f5e] text-white hover:bg-[#e11d48]")}
        >
          {busy ? "Deleting…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
