"use client";
import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
}) {
  return (
    <div className="glass-chip flex gap-1 rounded-full border-[rgb(var(--tint)/0.09)] p-1 w-fit max-w-full overflow-x-auto no-scrollbar" role="tablist">
      {tabs.map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={active === t}
          onClick={() => onChange(t)}
          className={cn(
            "rounded-full px-4 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.05] active:scale-95 hover:-translate-y-0.5",
            active === t
              ? "glass-pill text-[#55555f] shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
              : "text-(--tx3) hover:text-(--tx1)"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function Chips({
  items,
  active,
  onChange,
  onPrefetch,
}: {
  items: readonly string[];
  active: string;
  onChange: (c: string) => void;
  onPrefetch?: (c: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1" role="tablist" aria-label="Categories">
      {items.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          onMouseEnter={() => onPrefetch?.(c)}
          onFocus={() => onPrefetch?.(c)}
          className={cn(
            "glass-chip shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.06] hover:-translate-y-0.5 active:scale-95",
            active === c
              ? "glass-pill scale-[1.04] border-transparent text-[#55555f]"
              : "border-[rgb(var(--tint)/0.08)] text-(--tx2) hover:text-(--tx1)"
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
