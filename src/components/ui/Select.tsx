"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Glass dropdown replacing native <select> (whose OS popup ignores the dark
 * theme and renders white-on-white). Trigger uses the field material, the
 * list is an elevated glass popover. Fully keyboard operable.
 */
export function GlassSelect({
  value,
  onChange,
  options,
  label,
  variant = "field",
  direction = "auto",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly SelectOption[] | SelectOption[];
  label: string;
  variant?: "field" | "pill";
  direction?: "auto" | "up" | "down";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [justPicked, setJustPicked] = useState(false);

  const current = options.find((o) => o.value === value) ?? options[0];

  // Flip upward when there is not enough room below the trigger,
  // or always when direction="up" / never when direction="down".
  const updateDirection = useCallback(() => {
    if (direction === "up") {
      setDropUp(true);
      return;
    }
    if (direction === "down") {
      setDropUp(false);
      return;
    }
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const need = Math.min(options.length * 37 + 14, 244);
    const below = window.innerHeight - r.bottom;
    const above = r.top;
    setDropUp(below < need && above > below);
  }, [options.length, direction]);

  const toggle = (e?: React.SyntheticEvent) => {
    // Tanlash click'ining ortidan kelgan qayta ochilishni bloklash (bayroq taymer bilan o'chadi)
    if (justPicked) return;
    e?.stopPropagation();
    if (!open) updateDirection();
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open ]);

  useEffect(() => {
    if (open) setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => updateDirection();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, updateDirection]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const pick = (v: string, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    setJustPicked(true);
    window.setTimeout(() => setJustPicked(false), 300);
    onChange(v);
    setOpen(false);
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) updateDirection();
      setOpen(true);
    }
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + options.length) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(options[active].value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={toggle}
        onKeyDown={onTriggerKey}
        className={cn(
          "flex w-full items-center justify-between gap-2 text-left transition",
          variant === "pill"
            ? "glass-chip h-10 rounded-full px-4 text-[13px] text-(--tx2) hover:text-(--tx1)"
            : "glass-field h-11 rounded-2xl border-[rgb(var(--tint)/0.09)] px-4 text-sm text-(--tx1) hover:border-[rgb(var(--tint)/0.14)]"
        )}
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown size={15} className={cn("shrink-0 text-(--tx3) transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onListKey}
          className={cn(
            "glass-pop fade-up absolute z-50 max-h-60 w-full overflow-y-auto rounded-2xl p-1.5",
            dropUp ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={selected}
                data-active={i === active}
                onClick={(e) => pick(o.value, e)}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-[13.5px] transition",
                  selected ? "bg-[#7c5cff]/15 text-(--tx1)" : "text-(--tx2)",
                  i === active && !selected && "bg-[rgb(var(--tint)/0.06)] text-(--tx1)"
                )}
              >
                <span className="truncate">{o.label}</span>
                {selected && <Check size={15} className="shrink-0 text-[#9d86ff]" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
