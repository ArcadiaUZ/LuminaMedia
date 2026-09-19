"use client";
import { cn } from "@/lib/utils";

export interface RadioChoice {
  value: string;
  label: string;
  hint?: string;
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: RadioChoice[];
}) {
  return (
    <div role="radiogroup" aria-label={name} className="space-y-1">
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(o.value)}
            className="flex w-full items-start gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-[rgb(var(--tint)/0.04)]"
          >
            <span
              className={cn(
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition",
                checked ? "border-[#7c5cff]" : "border-[rgb(var(--tint)/0.25)]"
              )}
            >
              {checked && <span className="h-2.5 w-2.5 rounded-full bg-[#7c5cff]" />}
            </span>
            <span className="min-w-0">
              <span className={cn("block text-[14px] font-medium", checked ? "text-(--tx1)" : "text-(--tx2)")}>
                {o.label}
              </span>
              {o.hint && <span className="mt-0.5 block text-[12.5px] leading-relaxed text-(--tx3)">{o.hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
