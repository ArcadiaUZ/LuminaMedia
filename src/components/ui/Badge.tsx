import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "iris" | "mint" | "amber" | "rose";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "glass-chip border-[rgb(var(--tint)/0.1)] text-(--tx2)",
    iris: "bg-[#7c5cff]/15 text-[#b7a6ff] border-[#7c5cff]/35 shadow-[inset_0_1px_0_rgba(124,92,255,0.2)]",
    mint: "bg-[#34d399]/12 text-[#6ee7b7] border-[#34d399]/30 shadow-[inset_0_1px_0_rgba(52,211,153,0.15)]",
    amber: "bg-[#fbbf24]/12 text-[#fcd34d] border-[#fbbf24]/30 shadow-[inset_0_1px_0_rgba(251,191,36,0.15)]",
    rose: "bg-[#fb7185]/12 text-(--tx-danger) border-[#fb7185]/30 shadow-[inset_0_1px_0_rgba(251,113,133,0.15)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
