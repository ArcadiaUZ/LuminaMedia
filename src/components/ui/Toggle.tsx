"use client";
import { cn } from "@/lib/utils";

// Liquid toggle switch — Settings'dagi yoqish/o'chirish uchun
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition-all duration-300",
        checked
          ? "border-[#7c5cff]/60 bg-gradient-to-b from-[#8d71ff] to-[#6d4dff] shadow-[0_4px_16px_rgba(124,92,255,0.45),inset_0_1px_0_rgba(255,255,255,0.35)]"
          : "border-[rgb(var(--tint)/0.14)] bg-[rgb(var(--tint)/0.08)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-all duration-300",
          checked ? "left-[22px]" : "left-[3px]"
        )}
      />
    </button>
  );
}
