import { cn } from "@/lib/utils";

export function Avatar({
  src,
  name,
  size = 36,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = (name?.[0] ?? "L").toUpperCase();
  return (
    <span
      role="img"
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#7c5cff] to-[#34d399] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_16px_rgba(0,0,0,0.35)] ring-1 ring-white/20",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        initial
      )}
    </span>
  );
}
