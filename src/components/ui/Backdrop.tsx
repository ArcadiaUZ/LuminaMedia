export function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-(--bg0)" />
      <div className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-[#7c5cff]/20 blur-[140px]" />
      <div className="absolute bottom-0 right-0 h-[320px] w-[420px] rounded-full bg-[#34d399]/10 blur-[120px]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(600px 400px at 50% 30%, black, transparent)",
        }}
      />
    </div>
  );
}
