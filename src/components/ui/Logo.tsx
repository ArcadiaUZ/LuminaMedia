import Link from "next/link";
import { Play } from "lucide-react";

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Lumina home">
      <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#7c5cff] to-[#4f39c7] shadow-[0_8px_24px_rgba(124,92,255,0.45)] ring-1 ring-white/25">
        <span aria-hidden className="absolute -inset-2 rounded-2xl bg-[#7c5cff]/20 blur-md" />
        <Play size={15} className="relative fill-white text-white ml-0.5" />
      </span>
      {!compact && (
        <span className="logo-text text-[17px] font-bold tracking-tight">
          Lumina
          <span className="ml-1.5 rounded-md bg-[rgb(var(--tint)/0.07)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-(--tx3) align-middle">
            Play
          </span>
        </span>
      )}
    </Link>
  );
}
