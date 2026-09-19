"use client";
import { useEffect } from "react";

/**
 * Decorative liquid environment: slow ambient light orbs and rising glass
 * bubbles that live behind the interface. Pointer tracking drives the
 * `--px` / `--py` CSS variables used by `.glass-sheen` surfaces.
 *
 * Reduced-motion environments receive a calm, static field instead.
 */
export function LiquidBackground() {
  useEffect(() => {
    const fine =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        document.querySelectorAll<HTMLElement>(".glass-pointer").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;
          const x = ((e.clientX - r.left) / r.width) * 100;
          const y = ((e.clientY - r.top) / r.height) * 100;
          el.style.setProperty("--px", `${Math.max(0, Math.min(100, x))}%`);
          el.style.setProperty("--py", `${Math.max(0, Math.min(100, y))}%`);
        });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden md:block" aria-hidden>
      <div className="orb h-[540px] w-[540px] -left-40 -top-32 bg-[#7c5cff]/28" style={{ animation: "orbFloat 26s var(--ease-fluid) infinite" }} />
      <div className="orb h-[420px] w-[420px] -right-32 top-1/4 bg-[#34d399]/16" style={{ animation: "orbFloat 32s var(--ease-fluid) infinite reverse" }} />
      <div className="orb h-[520px] w-[520px] left-1/3 -bottom-56 bg-[#fb7185]/14" style={{ animation: "orbFloat 38s var(--ease-fluid) infinite" }} />

      <div className="bubble h-24 w-24 left-[8%] top-[72%]" style={{ "--drift": "18px", animation: "bubbleRise 22s linear infinite" } as React.CSSProperties} />
      <div className="bubble h-14 w-14 left-[16%] top-[82%]" style={{ "--drift": "-14px", animation: "bubbleRise 18s linear 3s infinite" } as React.CSSProperties} />
      <div className="bubble hidden h-16 w-16 left-[62%] top-[78%] md:block" style={{ "--drift": "22px", animation: "bubbleRise 26s linear 6s infinite" } as React.CSSProperties} />
      <div className="bubble hidden h-10 w-10 left-[78%] top-[86%] lg:block" style={{ "--drift": "-10px", animation: "bubbleRise 20s linear 9s infinite" } as React.CSSProperties} />
      <div className="bubble h-9 w-9 left-[88%] top-[70%]" style={{ "--drift": "12px", animation: "bubbleRise 24s linear 12s infinite" } as React.CSSProperties} />
      <div className="bubble h-12 w-12 left-[34%] top-[88%]" style={{ "--drift": "-20px", animation: "bubbleRise 28s linear 15s infinite" } as React.CSSProperties} />
    </div>
  );
}