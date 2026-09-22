"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Film, Image as ImageIcon, X, CheckCircle2, AlertCircle, Loader2, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RadioGroup } from "@/components/ui/Radio";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { VideoCardSkeleton } from "@/components/ui/Skeleton";
import { useUI } from "@/store/ui";
import { useAuth } from "@/store/auth";
import { MAX_VIDEO_BYTES, MAX_IMAGE_BYTES } from "@/lib/constants";
import {
  UPLOAD_CHUNK_SIZE,
  clearActive,
  deleteBlob,
  loadActive,
  loadBlob,
  makeUploadId,
  saveActive,
  saveBlob,
  type ResumableMeta,
} from "@/lib/upload-store";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/core";

const UPLOAD_ENTER_KEY = "lumina:upload-enter";

export default function UploadPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useUI();
  const { t, tp } = useT();
  void tp;
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category] = useState("General");
  const [visibility, setVisibility] = useState<"PUBLIC" | "UNLISTED" | "PRIVATE">("PUBLIC");
  const [madeForKids, setMadeForKids] = useState<"yes" | "no">("no");
  const [ageRestricted, setAgeRestricted] = useState<"yes" | "no">("no");
  const [aiGenerated, setAiGenerated] = useState<"yes" | "no">("no");
  const [premiere, setPremiere] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "done" | "failed">("idle");
  const [progress, setProgress] = useState(0);
  const [drag, setDrag] = useState(false);
  const [videoInfo, setVideoInfo] = useState<{ url: string; title: string; compressing: boolean } | null>(null);
  const [resumed, setResumed] = useState(false);
  // FAB raketasi bilan kirganda: sahifa avval xira + bloklangan bo'ladi,
  // raketa animatsiyasi (2.2s) tugagach silliq tiniqlashadi.
  const [entering, setEntering] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(UPLOAD_ENTER_KEY) !== null
  );
  useEffect(() => {
    if (!entering) return;
    try {
      sessionStorage.removeItem(UPLOAD_ENTER_KEY);
    } catch {
      /* ignore */
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEntering(false);
      return;
    }
    const t = window.setTimeout(() => setEntering(false), 2200);
    return () => window.clearTimeout(t);
  }, [entering]);
  const videoInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pickVideo = (f?: File) => {
    const file = f ?? videoInput.current?.files?.[0];
    if (!file) return;
    if (phase === "uploading" || phase === "processing") {
      toast(t("upload.toastBusy"), "err");
      return;
    }
    if (!file.type.startsWith("video/") && !/\.mkv$/i.test(file.name)) {
      toast(t("upload.toastBadFormat"), "err");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast(t("upload.toastTooLarge"), "err");
      return;
    }
    setVideo(file);
    if (!title) setTitle(file.name.replace(/\.[a-z0-9]+$/i, ""));
  };

  const pickThumb = (f?: File) => {
    const file = f ?? thumbInput.current?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast(t("upload.toastThumbType"), "err");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast(t("upload.toastThumbLarge"), "err");
      return;
    }
    setThumb(file);
  };

  // Bo'laklab yuklash: har bir chunk alohida saqlanadi, refresh bo'lsa
  // yetishmagan bo'laklardangina davom etadi (0 dan boshlanmaydi).
  const startChunkedUpload = async (file: File, prev?: ResumableMeta) => {
    const uploadId = prev?.uploadId ?? makeUploadId(file);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase("uploading");
    setResumed(!!prev);

    // Thumbnail complete'da yuboriladi — hozirgi tanlovni eslab qolamiz
    const thumbNow = thumb;
    const meta: ResumableMeta = prev ?? {
      uploadId,
      name: file.name,
      size: file.size,
      type: file.type || "video/mp4",
      title: title.trim(),
      description,
      category,
      visibility,
      madeForKids: madeForKids === "yes",
      ageRestricted: ageRestricted === "yes",
      aiGenerated: aiGenerated === "yes",
      scheduleAt: scheduleAt ? new Date(scheduleAt).toISOString() : "",
      duration: await readDuration(file),
      uploadedBytes: 0,
    };
    if (!prev) {
      try {
        await saveBlob(uploadId, file);
      } catch {
        toast(t("upload.toastNoStorage"), "err");
      }
      saveActive(meta);
    }

    try {
      // Serverda qaysi bo'laklar bor — ularni o'tkazib yuboramiz
      let received = new Set<number>();
      if ((prev?.uploadedBytes ?? 0) > 0 || prev) {
        const st = await fetch(`/api/upload/chunk?uploadId=${encodeURIComponent(uploadId)}`, {
          signal: ctrl.signal,
        });
        if (st.ok) {
          const sj = await st.json().catch(() => null);
          if (sj && Array.isArray(sj.received)) received = new Set(sj.received as number[]);
        }
      }

      const total = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_SIZE));
      let done = received.size > 0 ? [...received].reduce((acc, i) => acc + chunkBytes(file, i), 0) : 0;
      setProgress(file.size > 0 ? Math.min(99, Math.round((done / file.size) * 100)) : 0);

      for (let i = 0; i < total; i++) {
        if (ctrl.signal.aborted) throw new Error("aborted");
        if (received.has(i)) continue;
        const start = i * UPLOAD_CHUNK_SIZE;
        const blob = file.slice(start, Math.min(start + UPLOAD_CHUNK_SIZE, file.size));
        const fd = new FormData();
        fd.append("uploadId", uploadId);
        fd.append("index", String(i));
        fd.append("total", String(total));
        fd.append("chunk", blob, `chunk-${i}.part`);
        const r = await fetch("/api/upload/chunk", { method: "POST", body: fd, signal: ctrl.signal });
        if (!r.ok) {
          const j = await r.json().catch(() => null);
          throw new Error((j as { error?: string } | null)?.error ?? `Chunk ${i + 1}/${total} failed`);
        }
        done += blob.size;
        meta.uploadedBytes = done;
        saveActive(meta);
        setProgress(file.size > 0 ? Math.min(99, Math.round((done / file.size) * 100)) : 0);
      }

      // Hamma bo'lak yetdi — birlashtirish + video yaratish
      setPhase("processing");
      const cfd = new FormData();
      cfd.append("uploadId", uploadId);
      cfd.append("fileName", file.name);
      cfd.append("fileType", file.type || "video/mp4");
      cfd.append("totalChunks", String(total));
      if (thumbNow) cfd.append("thumbnail", thumbNow);
      cfd.append("title", meta.title);
      cfd.append("description", meta.description);
      cfd.append("category", meta.category);
      cfd.append("visibility", meta.visibility);
      cfd.append("madeForKids", String(meta.madeForKids));
      cfd.append("ageRestricted", String(meta.ageRestricted));
      cfd.append("aiGenerated", String(meta.aiGenerated));
      if (meta.scheduleAt) cfd.append("scheduledAt", meta.scheduleAt);
      cfd.append("durationSec", String(meta.duration));
      const cr = await fetch("/api/upload/complete", { method: "POST", body: cfd, signal: ctrl.signal });
      const cj = await cr.json().catch(() => ({}));
      if (!cr.ok) {
        // Bo'lak yetishmasa — resume bilan davom etadi, jarayon o'chmaydi
        if ((cj as { resume?: boolean }).resume) {
          setPhase("uploading");
          throw new Error((cj as { error?: string }).error ?? "Missing chunks — will resume");
        }
        throw new Error((cj as { error?: string }).error ?? "Upload failed");
      }

      await deleteBlob(uploadId);
      clearActive();
      abortRef.current = null;
      setProgress(100);
      const vid = (cj as { video?: { id?: string; title?: string; status?: string } }).video;
      setVideoInfo({ url: `/watch/${vid?.id}`, title: vid?.title ?? meta.title, compressing: vid?.status === "PROCESSING" });
      setPhase("done");
    } catch (e: unknown) {
      if (ctrl.signal.aborted || (e instanceof Error && e.message === "aborted")) {
        // Bekor qilindi — holat saqlanib qoladi, keyin davom ettirish mumkin
        setPhase("idle");
        return;
      }
      setPhase("failed");
      toast(e instanceof Error ? e.message : "Upload failed", "err");
    }
  };

  const upload = async () => {
    if (abortRef.current || phase === "uploading" || phase === "processing") return;
    if (!video) {
      toast(t("upload.toastChooseFirst"), "err");
      return;
    }
    if (title.trim().length < 3) {
      toast(t("upload.toastShort"), "err");
      return;
    }
    if (scheduleAt) {
      const err = scheduleError(scheduleAt);
      if (err) {
        toast(t(err === "badDate" ? "upload.errBadDate" : "upload.errPast"), "err");
        return;
      }
    }
    // Boshqa faylning yarim yuklanishi bo'lsa tozalaymiz
    const prev = loadActive();
    const myId = makeUploadId(video);
    if (prev && prev.uploadId !== myId) {
      await deleteBlob(prev.uploadId);
      fetch(`/api/upload/chunk?uploadId=${encodeURIComponent(prev.uploadId)}`, { method: "DELETE" }).catch(() => {});
      clearActive();
    }
    setResumed(false);
    setProgress(0);
    await startChunkedUpload(video);
  };

  const cancelUpload = async () => {
    const active = loadActive();
    abortRef.current?.abort();
    abortRef.current = null;
    if (active) {
      await deleteBlob(active.uploadId);
      fetch(`/api/upload/chunk?uploadId=${encodeURIComponent(active.uploadId)}`, { method: "DELETE" }).catch(() => {});
      clearActive();
    }
    setPhase("idle");
    setProgress(0);
    setResumed(false);
    toast(t("upload.toastCancelled"));
  };

  function chunkBytes(file: File, i: number): number {
    const start = i * UPLOAD_CHUNK_SIZE;
    return Math.min(start + UPLOAD_CHUNK_SIZE, file.size) - start;
  }

  // Refresh'dan keyin yarim qolgan yuklashni tiklash — qolgan bo'lakdan davom etadi
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const active: ResumableMeta | null = loadActive();
      if (!active) return;
      let blob: Blob | null = null;
      try {
        blob = await loadBlob(active.uploadId);
      } catch {
        blob = null;
      }
      if (cancelled || !blob) {
        clearActive();
        return;
      }
      const file = new File([blob], active.name, { type: active.type });
      setVideo(file);
      setTitle(active.title);
      setDescription(active.description);
      setVisibility(active.visibility as "PUBLIC" | "UNLISTED" | "PRIVATE");
      setMadeForKids(active.madeForKids ? "yes" : "no");
      setAgeRestricted(active.ageRestricted ? "yes" : "no");
      setAiGenerated(active.aiGenerated ? "yes" : "no");
      if (active.scheduleAt) {
        const d = new Date(new Date(active.scheduleAt).getTime() - new Date().getTimezoneOffset() * 60000);
        if (!Number.isNaN(d.getTime())) setScheduleAt(d.toISOString().slice(0, 16));
      }
      setProgress(active.size > 0 ? Math.min(99, Math.round((active.uploadedBytes / active.size) * 100)) : 0);
      setResumed(true);
      toast(t("upload.toastRestored"));
      void startChunkedUpload(file, active);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <VideoCardSkeleton />;

  if (!user)
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-10 text-center">
        <h1 className="text-xl font-bold">{t("upload.guestTitle")}</h1>
        <p className="mt-2 text-sm text-(--tx3)">{t("upload.guestHint")}</p>
        <Button className="mt-5" onClick={() => router.push("/login")}>
          {t("upload.loginBtn")}
        </Button>
      </div>
    );

  return (
    <div
      className={cn("mx-auto w-full max-w-4xl fade-up upload-enter", entering && "upload-enter-blur")}
      aria-busy={entering}
      inert={entering}
    >
      <h1 className="text-[24px] font-bold tracking-tight">{t("upload.title")}</h1>
      <p className="text-sm text-(--tx3)">{t("upload.subtitle")}</p>

      {phase === "done" && videoInfo ? (
        <div className="mt-6 rounded-3xl border border-[#34d399]/25 bg-[#34d399]/10 p-8 text-center">
          <CheckCircle2 size={40} className="mx-auto text-[#34d399]" />
          <h2 className="mt-3 text-lg font-bold">{videoInfo.title}</h2>
          <p className="mt-1 text-sm text-(--tx3)">
            {videoInfo.compressing
              ? t("upload.doneCompress")
              : t("upload.doneLive")}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button onClick={() => router.push(`${videoInfo.url}?autoplay=1`)}>{t("upload.watch")}</Button>
            <Button variant="ghost" onClick={() => window.location.reload()}>
              {t("upload.another")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label={t("upload.chooseFile")}
            onClick={() => videoInput.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                videoInput.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              pickVideo(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "mt-6 grid w-full cursor-pointer place-items-center rounded-3xl border-2 border-dashed p-12 text-center transition",
              drag || video
                ? "border-[#7c5cff]/60 bg-[#7c5cff]/8"
                : "border-[rgb(var(--tint)/0.15)] bg-[rgb(var(--tint)/0.03)] hover:border-[rgb(var(--tint)/0.30)] hover:bg-[rgb(var(--tint)/0.05)]"
            )}
          >
            {video ? (
              <div>
                <Film size={36} className="mx-auto text-[#7c5cff]" />
                <p className="mt-3 font-semibold">{video.name}</p>
                <p className="text-[13px] text-(--tx3)">{t("upload.fileReady", { n: (video.size / 1024 / 1024).toFixed(1) })}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideo(null);
                  }}
                  className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#fb7185]/15 px-4 py-1.5 text-[12.5px] font-medium text-(--tx-danger)"
                >
                  <X size={13} /> {t("upload.remove")}
                </button>
              </div>
            ) : (
              <div>
                <UploadCloud size={40} className="mx-auto text-[#9d86ff]" />
                <p className="mt-3 text-[16px] font-semibold">{t("upload.dropTitle")}</p>
                <p className="mt-1 text-[13px] text-(--tx3)">{t("upload.dropHint")}</p>
                <span className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">
                  {t("upload.chooseBtn")}
                </span>
              </div>
            )}
          </div>
          <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={() => pickVideo()} />

          {(phase === "uploading" || phase === "processing") && (
            <div className="glass-min mt-4 rounded-2xl p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                {phase === "uploading" ? <Loader2 size={16} className="animate-spin text-[#7c5cff]" /> : <Film size={16} className="text-[#34d399]" />}
                <span className="flex-1">
                  {phase === "uploading"
                    ? `${t("upload.uploading", { n: Math.round(progress) })}${resumed ? t("upload.resumedSuffix") : ""}`
                    : t("upload.processing")}
                </span>
                {phase === "uploading" && (
                  <button
                    onClick={cancelUpload}
                    className="inline-flex items-center gap-1 rounded-full bg-[#fb7185]/15 px-3 py-1 text-[12px] font-medium text-(--tx-danger) hover:bg-[#fb7185]/25"
                  >
                    <PauseCircle size={13} /> {t("upload.cancel")}
                  </button>
                )}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--tint)/0.07)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7c5cff] to-[#34d399] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {phase === "failed" && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#fb7185]/25 bg-[#fb7185]/10 px-4 py-3 text-sm text-(--tx-danger)">
              <AlertCircle size={16} /> {t("upload.failed")}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <Field label={t("upload.fieldTitle")}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("upload.titlePh")} maxLength={120} />
            </Field>
            <Field label={t("upload.fieldDesc")}>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("upload.descPh")} />
            </Field>

            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-(--tx2)">{t("upload.thumbLabel")}</span>
              {thumb ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--tint)/0.08)] bg-[rgb(var(--tint)/0.03)] p-3">
                  <ImageIcon size={18} className="text-[#9d86ff]" />
                  <span className="flex-1 truncate text-sm">{thumb.name}</span>
                  <button
                    onClick={() => setThumb(null)}
                    aria-label={t("upload.removeThumb")}
                    className="grid h-8 w-8 place-items-center rounded-lg text-(--tx3) hover:text-(--tx1)"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => thumbInput.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgb(var(--tint)/0.15)] bg-[rgb(var(--tint)/0.03)] px-4 py-4 text-[13px] font-medium text-(--tx3) hover:bg-[rgb(var(--tint)/0.05)]"
                >
                  <ImageIcon size={15} /> {t("upload.addThumb")}
                </button>
              )}
              <input ref={thumbInput} type="file" accept="image/*" className="hidden" onChange={() => pickThumb()} />
            </div>

            <section className="rounded-2xl border border-[rgb(var(--tint)/0.08)] bg-[rgb(var(--tint)/0.02)] p-5">
              <h2 className="text-[15px] font-bold">{t("upload.audience")}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-(--tx3)">
                {t("upload.coppa")}
              </p>
              <div className="mt-2 rounded-xl border border-[rgb(var(--tint)/0.07)] bg-[rgb(var(--tint)/0.03)] px-4 py-3 text-[12.5px] leading-relaxed text-(--tx3)">
                {t("upload.coppaNote")}
              </div>
              <div className="mt-2">
                <RadioGroup
                  name="audience"
                  value={madeForKids}
                  onChange={(v) => setMadeForKids(v as "yes" | "no")}
                  options={[
                    { value: "yes", label: t("upload.audYes") },
                    { value: "no", label: t("upload.audNo") },
                  ]}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[rgb(var(--tint)/0.08)] bg-[rgb(var(--tint)/0.02)] p-5">
              <h2 className="text-[15px] font-bold">{t("upload.ageTitle")}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-(--tx3)">
                {t("upload.ageHint")}
              </p>
              <div className="mt-2">
                <RadioGroup
                  name="age"
                  value={ageRestricted}
                  onChange={(v) => setAgeRestricted(v as "yes" | "no")}
                  options={[
                    { value: "yes", label: t("upload.ageYes") },
                    { value: "no", label: t("upload.ageNo") },
                  ]}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[rgb(var(--tint)/0.08)] bg-[rgb(var(--tint)/0.02)] p-5">
              <h2 className="text-[15px] font-bold">{t("upload.aiTitle")}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-(--tx3)">
                {t("upload.aiHint")}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-(--tx3)">
                <li>{t("upload.aiLi1")}</li>
                <li>{t("upload.aiLi2")}</li>
                <li>{t("upload.aiLi3")}</li>
              </ul>
              <div className="mt-2">
                <RadioGroup
                  name="ai"
                  value={aiGenerated}
                  onChange={(v) => setAiGenerated(v as "yes" | "no")}
                  options={[
                    { value: "yes", label: t("upload.yes") },
                    { value: "no", label: t("upload.no") },
                  ]}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[rgb(var(--tint)/0.08)] bg-[rgb(var(--tint)/0.02)] p-5">
              <h2 className="text-[15px] font-bold">{t("upload.visTitle")}</h2>
              <p className="mt-1 text-[13px] text-(--tx3)">{t("upload.visHint")}</p>
              <div className="mt-3 rounded-2xl border border-[rgb(var(--tint)/0.1)] p-4">
                <p className="text-[14px] font-semibold">{t("upload.visSave")}</p>
                <p className="text-[12.5px] text-(--tx3)">
                  {t("upload.visSaveHint", { pub: t("upload.visPublic"), unl: t("upload.visUnlisted"), priv: t("upload.visPrivate") })}
                </p>
                <div className="mt-2">
                  <RadioGroup
                    name="visibility-detail"
                    value={visibility}
                    onChange={(v) => setVisibility(v as typeof visibility)}
                    options={[
                      { value: "PRIVATE", label: t("upload.visPrivateCap"), hint: t("upload.visPrivateHint") },
                      { value: "UNLISTED", label: t("upload.visUnlistedCap"), hint: t("upload.visUnlistedHint") },
                      { value: "PUBLIC", label: t("upload.visPublicCap"), hint: t("upload.visPublicHint") },
                    ]}
                  />
                  <button
                    type="button"
                    role="radio"
                    aria-checked={premiere}
                    onClick={() => {
                      setPremiere((p) => {
                        if (p) setScheduleAt("");
                        return !p;
                      });
                    }}
                    className="flex w-full items-start gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-[rgb(var(--tint)/0.04)]"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition",
                        premiere ? "border-[#7c5cff]" : "border-white/25"
                      )}
                    >
                      {premiere && <span className="h-2.5 w-2.5 rounded-full bg-[#7c5cff]" />}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-[14px] font-medium", premiere ? "text-(--tx1)" : "text-(--tx2)")}>
                        {t("upload.premiere")}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] leading-relaxed text-(--tx3)">
                        {t("upload.premiereHint")}
                      </span>
                    </span>
                  </button>
                </div>
              </div>
              {premiere && (
                <div className="mt-3 rounded-2xl border border-[rgb(var(--tint)/0.1)] p-4 fade-up">
                  <p className="text-[14px] font-semibold">{t("upload.schedTitle")}</p>
                  <p className="text-[12.5px] text-(--tx3)">
                    {t("upload.schedHint", { pub: t("upload.visPublic") })}
                  </p>
                  <Input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="mt-2"
                  />
                </div>
              )}
            </section>

            <div className="flex items-center justify-end pt-2">
              <Button
                size="lg"
                variant="iris"
                onClick={upload}
                disabled={!video || phase === "uploading" || phase === "processing"}
              >
                {t("upload.publish")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Modul darajasida — render paytida emas, handler ichida chaqiriladi. Qaytgan kod chaqiruvchida t() bilan tarjima qilinadi. */
function scheduleError(raw: string): "badDate" | "past" | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "badDate";
  if (d.getTime() < Date.now()) return "past";
  return null;
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    const done = (n: number) => {
      URL.revokeObjectURL(url);
      resolve(n);
    };
    v.onloadedmetadata = () => {
      done(isFinite(v.duration) ? Math.round(v.duration) : 0);
    };
    v.onerror = () => done(0);
    v.src = url;
  });
}
