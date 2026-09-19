"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Gauge, PictureInPicture2, SkipBack, SkipForward, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { useT } from "@/i18n/core";

export function Player({
  src,
  onProgress,
  autoplay,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  src: string;
  onProgress?: (sec: number) => void;
  autoplay?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);
  const [showRate, setShowRate] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [showCenter, setShowCenter] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const [buffering, setBuffering] = useState(true);
  // Brauzer ovozli autoplay'ni bloklab mute fallback bo'ldimi — "Unmute" tugmasi uchun
  const [autoMuted, setAutoMuted] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const barTimer = useRef<number | null>(null);
  const tapTimer = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const retryRef = useRef<number | null>(null);
  // Biror marta ijro boshlanganmi (ovozli yoki mute'li) — qayta autoplay urinmaslik uchun
  const startedRef = useRef(false);
  // Foydalanuvchi qo'lda pauza qilganmi — autoplay uning xohishiga qarshi ishlamasligi uchun
  const userPausedRef = useRef(false);
  const showRef = useRef(false);
  const barRef = useRef(true);
  const playingRef = useRef(false);
  const autoTried = useRef(false);
  const { t } = useT();

  // Card bosilganda kelingan bo'lsa — metadata/canplay tayyor bo'lishi bilan OVOZLI avtomatik ijro.
  // AbortError = pauza/unmount poygasi (dev StrictMode, tez navigatsiya), siyosat emas → ovozli qayta urinish.
  // NotAllowedError = brauzer siyosati → mute fallback + ekranda "Unmute" tugmasi chiqadi.
  // togglePlay (pause/continue) va boshqa hech narsa muted'ga TEGMAYDI — ovoz faqat shu yerda
  // (autoplay urinishi) va mute/Unmute tugmalarida boshqariladi.
  const tryAutoplay = () => {
    if (!autoplay || autoTried.current || startedRef.current || userPausedRef.current) return;
    const v = ref.current;
    if (!v || !v.paused) return;
    autoTried.current = true;
    v.muted = false;
    setMuted(false);
    v.play().catch((err: unknown) => {
      const name =
        err && typeof err === "object" && "name" in err ? String((err as { name?: unknown }).name) : "";
      if (name === "AbortError") {
        if (retryRef.current) window.clearTimeout(retryRef.current);
        retryRef.current = window.setTimeout(() => {
          retryRef.current = null;
          if (!mountedRef.current) return;
          autoTried.current = false;
          tryAutoplay();
        }, 350);
        return;
      }
      v.muted = true;
      setMuted(true);
      setAutoMuted(true);
      v.play().catch(() => {
        autoTried.current = false;
      });
    });
  };

  // Mute fallback'dan keyin ekrandagi "Unmute" tugmasi — bu BOSISH user gesture,
  // brauzer ovozni albatta ruxsat beradi. Pause/play bunga aralashmaydi.
  const unmuteNow = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    setAutoMuted(false);
    if (v.paused && !userPausedRef.current) v.play().catch(() => {});
    wakeBar();
  };

  // Bottom control bar: visible on activity, slides down & away after 3s of idle
  function setBar(v: boolean) {
    barRef.current = v;
    setShowBar(v);
  }

  function wakeBar() {
    setBar(true);
    if (barTimer.current) window.clearTimeout(barTimer.current);
    if (playingRef.current) {
      barTimer.current = window.setTimeout(() => setBar(false), 3000);
    }
  }

  function hideBar() {
    if (barTimer.current) window.clearTimeout(barTimer.current);
    setBar(false);
  }

  const setOverlay = (v: boolean) => {
    showRef.current = v;
    setShowCenter(v);
  };

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onTime = () => {
      setTime(v.currentTime);
      onProgress?.(v.currentTime);
    };
    const onMeta = () => {
      setDur(v.duration || 0);
      tryAutoplay();
    };
    const onPlay = () => {
      setPlaying(true);
      playingRef.current = true;
      startedRef.current = true;
      wakeBar();
    };
    const onPause = () => {
      setPlaying(false);
      playingRef.current = false;
      if (barTimer.current) window.clearTimeout(barTimer.current);
      setBar(true);
      setBuffering(false);
    };
    // YouTube-style buffering spinner: show while data is catching up
    const onWaiting = () => setBuffering(true);
    const onStalled = () => setBuffering(true);
    const onLoadStart = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    // metadata autoplay bayrog'idan oldin kelgan bo'lsa — canplay ikkinchi imkoniyat
    const onCanPlay = () => {
      setBuffering(false);
      if (autoplay) tryAutoplay();
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("stalled", onStalled);
    v.addEventListener("loadstart", onLoadStart);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("canplay", onCanPlay);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("stalled", onStalled);
      v.removeEventListener("loadstart", onLoadStart);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("canplay", onCanPlay);
    };
    // wakeBar/setBar are stable helpers (refs + setState only), safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onProgress]);

  // autoplay bayrog'i kech kelsa (sahifa effect'dan o'rnatsa) ham urinib ko'rish
  useEffect(() => {
    if (autoplay) tryAutoplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay]);

  // (olib tashlandi) Sobiq global pointerdown/keydown auto-unmute shu yerda edi —
  // u pause/play tugmasini bosganda ham ovozni yoqib yuborardi. Endi ovoz faqat
  // mute tugmasi va ekrandagi "Unmute" tugmasi orqali boshqariladi.

  // yangi video yuklanganda spinner'ni qayta ko'rsatish + eski holatni tozalash
  useEffect(() => {
    if (retryRef.current) {
      window.clearTimeout(retryRef.current);
      retryRef.current = null;
    }
    autoTried.current = false;
    startedRef.current = false;
    userPausedRef.current = false;
    setAutoMuted(false);
    const vv = ref.current;
    if (vv) vv.muted = false;
    setMuted(false);
    setBuffering(true);
    setTime(0);
    setDur(0);
    setPlaying(false);
    playingRef.current = false;
  }, [src]);

  // unmount'da ijroni to'xtatish va manbani bo'shatish (fon ovozi / leak oldini olish)
  useEffect(() => {
    mountedRef.current = true;
    const v = ref.current;
    return () => {
      mountedRef.current = false;
      if (retryRef.current) {
        window.clearTimeout(retryRef.current);
        retryRef.current = null;
      }
      try {
        v?.pause();
        if (v) v.removeAttribute("src");
      } catch {
        /* ignore */
      }
    };
  }, []);

  const seek = (val: number) => {
    const vv = ref.current;
    if (!vv) return;
    vv.currentTime = val;
    setTime(val);
  };

  const [seekFlash, setSeekFlash] = useState<{ dir: 1 | -1; n: number } | null>(null);
  const seekFlashTimer = useRef<number | null>(null);

  const flashSeek = (dir: 1 | -1) => {
    setSeekFlash((s) => ({ dir, n: (s?.n ?? 0) + 1 }));
    if (seekFlashTimer.current) window.clearTimeout(seekFlashTimer.current);
    seekFlashTimer.current = window.setTimeout(() => setSeekFlash(null), 750);
  };

  const seekBy = (d: number) => {
    const v = ref.current;
    if (!v) return;
    const t = Math.min(Math.max(0, v.currentTime + d), v.duration || 0);
    v.currentTime = t;
    setTime(t);
    flashSeek(d > 0 ? 1 : -1);
    flashCenter();
  };

  const flashCenter = () => {
    setOverlay(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOverlay(false), 2600);
  };

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      // Qo'lda play — bu user gesture, ovoz o'z holicha qoladi (muted'ga tegilmaydi)
      userPausedRef.current = false;
      v.play().catch(() => {
        /* autoplay policy / no data — UI stays paused */
      });
      flashCenter();
    } else {
      // Qo'lda pauza — kutilayotgan autoplay retry bo'lsa bekor qilinadi,
      // ovoz holatiga TEGILMAYDI (mute/unmute faqat ovoz tugmalariniki)
      userPausedRef.current = true;
      if (retryRef.current) {
        window.clearTimeout(retryRef.current);
        retryRef.current = null;
      }
      v.pause();
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      setOverlay(true);
    }
  };

  // YouTube-style taps: single tap toggles the overlay (never pauses),
  // double-tap left/right seeks ∓10s, double-tap center toggles play.
  const handleVideoTap = (e: React.MouseEvent) => {
    if (tapTimer.current) {
      window.clearTimeout(tapTimer.current);
      tapTimer.current = null;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      if (x < 0.35) seekBy(-10);
      else if (x > 0.65) seekBy(10);
      else togglePlay();
      return;
    }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null;
      const v = ref.current;
      if (!v || v.paused) return; // paused: overlay stays on
      if (showRef.current) {
        if (hideTimer.current) window.clearTimeout(hideTimer.current);
        setOverlay(false);
        hideBar();
      } else {
        flashCenter();
        wakeBar();
      }
    }, 280);
  };

  // Any pointer activity wakes the bar; cursor follows bar visibility
  const onActivity = () => wakeBar();

  // Landscape lock helpers (mobile portrait -> fullscreen rotates to horizontal)
  const lockLandscape = () => {
    try {
      const o = screen.orientation as ScreenOrientation & { lock?: (t: string) => Promise<void> };
      o.lock?.("landscape").catch(() => {});
    } catch {
      /* orientation lock unsupported — stay as-is */
    }
  };
  const unlockOrientation = () => {
    try {
      screen.orientation.unlock();
    } catch {
      /* ignore */
    }
  };

  const toggleFullscreen = async () => {
    wakeBar();
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        unlockOrientation();
        return;
      }
      const box = boxRef.current;
      if (box?.requestFullscreen) {
        await box.requestFullscreen();
        // portrait telefonda fullscreen gorizontal holatga buriladi
        lockLandscape();
      } else {
        // iOS Safari: only the video element itself can enter fullscreen
        const v = ref.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
        v?.webkitEnterFullscreen?.();
      }
    } catch {
      /* fullscreen unavailable on this device — stay inline */
    }
  };

  useEffect(() => {
    const onFs = () => {
      const fs = !!document.fullscreenElement;
      setIsFs(fs);
      if (!fs) unlockOrientation();
    };
    // Kompyuter/noutbuk: ArrowLeft/ArrowRight — 10 soniya orqaga/oldinga.
    // Input/textarea ichida yozilayotganda ishlamaydi.
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        seekBy(10);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekBy(-10);
      } else if (e.key === " ") {
        // Tugma fokusda bo'lsa — brauzerning o'zi click qiladi, ikki marta ishlamasligi uchun o'tkazamiz
        if (t && t.tagName === "BUTTON") return;
        e.preventDefault();
        togglePlay();
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("keydown", onKey);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (barTimer.current) window.clearTimeout(barTimer.current);
      if (tapTimer.current) window.clearTimeout(tapTimer.current);
      if (seekFlashTimer.current) window.clearTimeout(seekFlashTimer.current);
    };
    // seekBy refs + setState'dan iborat stabil funksiya
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={boxRef}
      onMouseMove={onActivity}
      onTouchStart={onActivity}
      className={cn(
        "group relative overflow-hidden bg-black",
        !showBar && playing && "cursor-none",
        isFs ? "rounded-none border-0" : "rounded-2xl border border-white/[0.08] shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
      )}
    >
      <div className="relative">
      <video
        ref={ref}
        src={src}
        className={cn("w-full bg-black", isFs ? "h-screen min-h-0 w-full object-contain" : "aspect-video")}
        playsInline
        preload="metadata"
        disableRemotePlayback
        onClick={handleVideoTap}
      />
      {/* YouTube-style buffering spinner — markazda aylanuvchi indikator */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 grid place-items-center transition-opacity duration-300",
          buffering ? "opacity-100" : "opacity-0"
        )}
        aria-hidden={!buffering}
      >
        <span className="grid h-16 w-16 place-items-center rounded-full bg-black/55 backdrop-blur-sm">
          <Loader2 size={30} className="animate-spin text-white" />
        </span>
      </div>
      {/* Brauzer ovozli autoplay'ni bloklagan bo'lsa — katta "Unmute" tugmasi.
          Bu BOSISH user gesture: ovoz kafolatli yoqiladi. Pause/play bunga aloqasiz. */}
      {autoMuted && (
        <button
          onClick={unmuteNow}
          className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur transition hover:bg-black/85 active:scale-95"
        >
          <VolumeX size={16} /> {t("player.unmute")}
        </button>
      )}
      {/* center controls sit on the VIDEO preview (not the control bar) */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 grid place-items-center bg-black/25 transition-opacity duration-300",
          (!playing || showCenter) && !seekFlash ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center gap-8 md:gap-10">
          <button
            aria-label={t("player.prev")}
            onClick={onPrev}
            disabled={!hasPrev}
            className={cn(
              "pointer-events-auto rounded-full p-2 transition active:scale-90",
              hasPrev ? "text-white/80 hover:text-white" : "cursor-not-allowed text-white/25"
            )}
          >
            <SkipBack size={22} className="fill-current drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]" />
          </button>
          <button
            aria-label={t(playing ? "player.pause" : "player.play")}
            onClick={togglePlay}
            className="pointer-events-auto rounded-full p-2 text-white transition hover:scale-105 active:scale-95"
          >
            {playing ? (
              <Pause size={32} className="fill-current drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]" />
            ) : (
              <Play size={32} className="ml-1 fill-current drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]" />
            )}
          </button>
          <button
            aria-label={t("player.next")}
            onClick={onNext}
            disabled={!hasNext}
            className={cn(
              "pointer-events-auto rounded-full p-2 transition active:scale-90",
              hasNext ? "text-white/80 hover:text-white" : "cursor-not-allowed text-white/25"
            )}
          >
            <SkipForward size={22} className="fill-current drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]" />
          </button>
        </div>
      </div>
      {/* YouTube-style double-tap seek feedback */}
      {seekFlash && (
        <div
          key={seekFlash.n}
          className={cn(
            "pointer-events-none absolute inset-y-0 flex w-1/3 items-center",
            seekFlash.dir > 0 ? "right-0 justify-center" : "left-0 justify-center"
          )}
        >
          <div className="seek-ping absolute h-24 w-24 rounded-full bg-white/15" />
          {seekFlash.dir > 0 ? (
            <div className="seek-flash relative flex items-center gap-1 text-[22px] font-bold tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              <span className="whitespace-nowrap">{t("player.fwd")}</span>
              <ChevronRight size={26} strokeWidth={3} />
            </div>
          ) : (
            <div className="seek-flash relative flex items-center gap-1 text-[22px] font-bold tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              <ChevronLeft size={26} strokeWidth={3} />
              <span className="whitespace-nowrap">{t("player.back")}</span>
            </div>
          )}
        </div>
      )}
      </div>
      <div
        className={cn(
          "space-y-2 px-4 transition-all duration-500 ease-in-out",
          showBar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[130%] opacity-0",
          isFs
            ? "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pb-6 pt-12"
            : "bg-gradient-to-b from-[#101018]/60 to-[#101018]/80 py-3 backdrop-blur"
        )}
      >
        <input
          type="range"
          min={0}
          max={dur || 0}
          step={0.1}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label={t("player.seek")}
          className="w-full"
        />
        <div className="flex items-center gap-1.5">
          <CtrlBtn label={t(playing ? "player.pause" : "player.play")} onClick={togglePlay}>
            {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5 fill-current" />}
          </CtrlBtn>
          <CtrlBtn
            label={t(muted ? "player.unmute" : "player.mute")}
            onClick={() => {
              const v = ref.current;
              if (!v) return;
              v.muted = !v.muted;
              setMuted(v.muted);
              // Foydalanuvchi ovozni qo'lda boshqardi — auto "Unmute" taklifi yashiriladi
              setAutoMuted(false);
            }}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </CtrlBtn>
          <span className="ml-1 text-[12px] tabular-nums text-[#a2a2b3]">
            {formatDuration(time)} / {formatDuration(dur)}
          </span>
          <span className="flex-1" />
          <div className="relative">
            <CtrlBtn label={t("player.speed")} onClick={() => setShowRate((s) => !s)}>
              <Gauge size={17} />
            </CtrlBtn>
            {showRate && (
              <div className="glass-pop absolute bottom-10 right-0 overflow-hidden rounded-2xl p-1 shadow-xl">
                {[0.5, 1, 1.25, 1.5, 2].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      const v = ref.current;
                      if (v) v.playbackRate = r;
                      setRate(r);
                      setShowRate(false);
                    }}
                     className={`block w-full rounded-xl px-4 py-1.5 text-left text-[13px] ${rate === r ? "bg-white text-black font-semibold" : "hover:bg-white/10"}`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            )}
          </div>
          <CtrlBtn
            label={t("player.pip")}
            onClick={async () => {
              try {
                const v = ref.current as HTMLVideoElement & {
                  requestPictureInPicture?: () => Promise<void>;
                };
                await v.requestPictureInPicture?.();
              } catch {
                /* unsupported */
              }
            }}
          >
            <PictureInPicture2 size={17} />
          </CtrlBtn>
          <CtrlBtn label={t("player.fullscreen")} onClick={toggleFullscreen}>
            <Maximize size={17} />
          </CtrlBtn>
        </div>
      </div>
    </div>
  );
}

function CtrlBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-full text-[#d7d7e0] hover:bg-white/10 hover:text-white transition active:scale-95"
    >
      {children}
    </button>
  );
}
