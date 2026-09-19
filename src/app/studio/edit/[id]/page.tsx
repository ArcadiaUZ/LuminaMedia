"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Eye, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { GlassSelect } from "@/components/ui/Select";
import { RadioGroup } from "@/components/ui/Radio";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/Modal";
import { formatViews, formatDuration, timeAgo } from "@/lib/utils";
import { VIDEO_CATEGORIES, MAX_IMAGE_BYTES } from "@/lib/constants";
import { useAuth } from "@/store/auth";
import { useUI } from "@/store/ui";
import { useT } from "@/i18n/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Vid = any;

export default function EditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useUI();
  const { t, tp } = useT();
  void tp;
  const [video, setVideo] = useState<Vid | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "General",
    visibility: "PUBLIC",
    madeForKids: "no",
    ageRestricted: "no",
    aiGenerated: "no",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  // Thumbnail almashtirish (upload sahifasidagi kabi)
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [removeThumb, setRemoveThumb] = useState(false);
  const thumbInput = useRef<HTMLInputElement>(null);

  // Eski preview URL'ni tozalash (memory leak bo'lmasligi uchun)
  useEffect(() => {
    return () => {
      if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    };
  }, [thumbPreview]);

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await fetch(`/api/videos/${id}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Video unavailable");
      setVideo(j.video ?? j);
      const vv = j.video ?? j;
      setForm({
        title: vv.title ?? "",
        description: vv.description ?? "",
        category: vv.category ?? "General",
        visibility: vv.visibility ?? "PUBLIC",
        madeForKids: vv.madeForKids ? "yes" : "no",
        ageRestricted: vv.ageRestricted ? "yes" : "no",
        aiGenerated: vv.aiGenerated ? "yes" : "no",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Video unavailable");
    }
  }, [id]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (authLoading || (user && !video && !error)) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-10 text-center">
        <h1 className="text-xl font-bold">{t("sedit.guestTitle")}</h1>
        <p className="mt-2 text-sm text-(--tx3)">{t("sedit.guestHint")}</p>
        <Button className="mt-5" onClick={() => router.push("/login")}>
          {t("sedit.loginBtn")}
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title={t("sedit.errorTitle")}
          hint={error}
          onRetry={() => router.push("/studio")}
        />
      </div>
    );
  }

  const save = async () => {
    if (form.title.trim().length < 2) {
      toast(t("sedit.toastShort"), "err");
      return;
    }
    setSaving(true);
    try {
      const meta = {
        title: form.title.trim(),
        description: form.description,
        category: form.category,
        visibility: form.visibility,
        madeForKids: form.madeForKids === "yes",
        ageRestricted: form.ageRestricted === "yes",
        aiGenerated: form.aiGenerated === "yes",
      };
      let r: Response;
      if (thumbFile || removeThumb) {
        // Thumbnail o'zgargan bo'lsa — FormData bilan yuboriladi
        const fd = new FormData();
        fd.append("title", meta.title);
        fd.append("description", meta.description);
        fd.append("category", meta.category);
        fd.append("visibility", meta.visibility);
        fd.append("madeForKids", String(meta.madeForKids));
        fd.append("ageRestricted", String(meta.ageRestricted));
        fd.append("aiGenerated", String(meta.aiGenerated));
        if (thumbFile) fd.append("thumbnail", thumbFile);
        if (removeThumb) fd.append("removeThumbnail", "true");
        r = await fetch(`/api/videos/${id}`, { method: "PATCH", body: fd });
      } else {
        r = await fetch(`/api/videos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(meta),
        });
      }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast((j as { error?: string }).error ?? t("sedit.toastSaveFailed"), "err");
        return;
      }
      if (thumbPreview) {
        URL.revokeObjectURL(thumbPreview);
        setThumbPreview(null);
      }
      setThumbFile(null);
      setRemoveThumb(false);
      toast(t("sedit.toastSaved"));
      router.push("/studio");
    } catch {
      toast(t("sedit.toastSaveFailed"), "err");
    } finally {
      setSaving(false);
    }
  };

  const pickThumb = (f?: File) => {
    const file = f ?? thumbInput.current?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast(t("sedit.toastThumbType"), "err");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast(t("sedit.toastThumbLarge"), "err");
      return;
    }
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
    setRemoveThumb(false);
  };

  const clearThumbChoice = () => {
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    setThumbFile(null);
    setThumbPreview(null);
    setRemoveThumb(false);
    if (thumbInput.current) thumbInput.current.value = "";
  };

  const markThumbRemoved = () => {
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    setThumbFile(null);
    setThumbPreview(null);
    setRemoveThumb(true);
    if (thumbInput.current) thumbInput.current.value = "";
  };

  const del = async () => {
    setDelBusy(true);
    const r = await fetch(`/api/videos/${id}`, { method: "DELETE" });
    setDelBusy(false);
    if (r.ok) {
      toast(t("sedit.toastDeleted"));
      router.push("/studio");
    } else toast(t("sedit.toastDeleteFailed"), "err");
  };

  return (
    <div className="w-full fade-up">
      <button
        onClick={() => router.push("/studio")}
        className="flex items-center gap-1.5 text-[13px] text-(--tx3) hover:text-(--tx1)"
      >
        <ArrowLeft size={15} /> {t("sedit.back")}
      </button>
      <h1 className="mt-2 text-[24px] font-bold tracking-tight">{t("sedit.title")}</h1>

      <div className="mt-4 grid items-start gap-5 xl:grid-cols-[560px_minmax(0,1fr)] lg:grid-cols-[480px_minmax(0,1fr)]">
        {/* Chap: video karta + thumbnail almashtirish */}
        {video && (
          <div className="space-y-5">
            <div className="glass-min overflow-hidden rounded-2xl">
              <div className="relative aspect-video bg-[#0c0c13]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbPreview ?? (removeThumb ? "/placeholder.svg" : (video.thumbnailUrl ?? "/placeholder.svg"))}
                  alt={form.title || video.title}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium backdrop-blur">
                  {formatDuration(video.durationSec ?? 0)}
                </span>
                {(thumbFile || removeThumb) && (
                  <span className="absolute left-2 top-2 rounded-full bg-[#7c5cff] px-2.5 py-1 text-[11px] font-semibold text-white">
                    {thumbFile ? t("sedit.newThumb") : t("sedit.removeSoon")}
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="truncate text-[15px] font-semibold">{form.title || video.title}</p>
                <p className="mt-1 text-[12.5px] text-(--tx3)">
                  {t("sedit.views", { n: formatViews(video.views ?? 0) })} · {timeAgo(video.createdAt)}
                </p>
                <Link
                  href={`/watch/${video.id}`}
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-[rgb(var(--tint)/0.07)] px-4 py-2 text-[13px] font-medium text-(--tx2) hover:bg-[rgb(var(--tint)/0.12)] hover:text-(--tx1)"
                >
                  <Eye size={15} /> {t("sedit.watch")}
                </Link>
              </div>
            </div>

            {/* Thumbnail paneli (upload bo'limidagi kabi) */}
            <div className="glass-min rounded-2xl p-4">
              <span className="block text-[13px] font-medium text-(--tx2)">{t("sedit.thumbLabel")}</span>
              {thumbFile ? (
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#7c5cff]/40 bg-[#7c5cff]/[0.07] p-3">
                  <ImageIcon size={18} className="shrink-0 text-[#9d86ff]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{thumbFile.name}</span>
                    <span className="block text-[12px] text-(--tx3)">
                      {t("sedit.thumbSize", { n: (thumbFile.size / 1024 / 1024).toFixed(1) })}
                    </span>
                  </span>
                  <button
                    onClick={() => thumbInput.current?.click()}
                    className="shrink-0 rounded-full bg-[rgb(var(--tint)/0.07)] px-3.5 py-1.5 text-[12.5px] font-medium hover:bg-[rgb(var(--tint)/0.12)]"
                  >
                    {t("sedit.change")}
                  </button>
                  <button
                    onClick={clearThumbChoice}
                    aria-label={t("sedit.cancelThumb")}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-(--tx3) hover:text-(--tx1)"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : video.thumbnailUrl && !removeThumb ? (
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[rgb(var(--tint)/0.08)] bg-[rgb(var(--tint)/0.03)] p-3">
                  <ImageIcon size={18} className="shrink-0 text-[#9d86ff]" />
                  <span className="flex-1 truncate text-sm text-(--tx2)">{t("sedit.currentThumb")}</span>
                  <button
                    onClick={() => thumbInput.current?.click()}
                    className="shrink-0 rounded-full bg-[rgb(var(--tint)/0.07)] px-3.5 py-1.5 text-[12.5px] font-medium hover:bg-[rgb(var(--tint)/0.12)]"
                  >
                    {t("sedit.change")}
                  </button>
                  <button
                    onClick={markThumbRemoved}
                    className="shrink-0 rounded-full bg-[#fb7185]/15 px-3.5 py-1.5 text-[12.5px] font-medium text-(--tx-danger) hover:bg-[#fb7185]/25"
                  >
                    {t("sedit.remove")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => (removeThumb ? clearThumbChoice() : thumbInput.current?.click())}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgb(var(--tint)/0.15)] bg-[rgb(var(--tint)/0.03)] px-4 py-4 text-[13px] font-medium text-(--tx3) hover:bg-[rgb(var(--tint)/0.05)]"
                >
                  <ImageIcon size={15} /> {removeThumb ? t("sedit.restoreThumb") : t("sedit.addThumb")}
                </button>
              )}
              <input
                ref={thumbInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={() => pickThumb()}
              />
              <p className="mt-2 text-[12px] text-(--tx4)">{t("sedit.thumbHint")}</p>
            </div>
          </div>
        )}

        {/* O'ng: tahrirlash maydonlari */}
        <div className="glass-min space-y-4 rounded-2xl p-5">
          <Field label={t("sedit.fieldTitle")}>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} />
          </Field>
          <Field label={t("sedit.fieldDesc")}>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("sedit.fieldCategory")}>
              <GlassSelect
                label={t("sedit.fieldCategory")}
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v })}
                options={VIDEO_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </Field>
            <Field label={t("sedit.fieldVisibility")}>
              <GlassSelect
                label={t("sedit.fieldVisibility")}
                value={form.visibility}
                direction="up"
                onChange={(v) => setForm({ ...form, visibility: v })}
                options={[
                  { value: "PUBLIC", label: t("sedit.visPublic") },
                  { value: "UNLISTED", label: t("sedit.visUnlisted") },
                  { value: "PRIVATE", label: t("sedit.visPrivate") },
                ]}
              />
            </Field>
          </div>
          <section className="rounded-2xl border border-[rgb(var(--tint)/0.08)] bg-[rgb(var(--tint)/0.02)] p-4">
            <h2 className="text-[14px] font-bold">{t("sedit.audience")}</h2>
            <div className="mt-1">
              <RadioGroup
                name="audience"
                value={form.madeForKids}
                onChange={(v) => setForm({ ...form, madeForKids: v })}
                options={[
                  { value: "yes", label: t("sedit.audYes") },
                  { value: "no", label: t("sedit.audNo") },
                ]}
              />
            </div>
          </section>
          <section className="rounded-2xl border border-[rgb(var(--tint)/0.08)] bg-[rgb(var(--tint)/0.02)] p-4">
            <h2 className="text-[14px] font-bold">{t("sedit.ageTitle")}</h2>
            <div className="mt-1">
              <RadioGroup
                name="age"
                value={form.ageRestricted}
                onChange={(v) => setForm({ ...form, ageRestricted: v })}
                options={[
                  { value: "yes", label: t("sedit.ageYes") },
                  { value: "no", label: t("sedit.ageNo") },
                ]}
              />
            </div>
          </section>
          <section className="rounded-2xl border border-[rgb(var(--tint)/0.08)] bg-[rgb(var(--tint)/0.02)] p-4">
            <h2 className="text-[14px] font-bold">{t("sedit.aiTitle")}</h2>
            <p className="mt-1 text-[12.5px] text-(--tx3)">{t("sedit.aiHint")}</p>
            <div className="mt-1">
              <RadioGroup
                name="ai"
                value={form.aiGenerated}
                onChange={(v) => setForm({ ...form, aiGenerated: v })}
                options={[
                  { value: "yes", label: t("sedit.yes") },
                  { value: "no", label: t("sedit.no") },
                ]}
              />
            </div>
          </section>
          <Button variant="iris" className="w-full" onClick={save} loading={saving}>
            {t("sedit.save")}
          </Button>
          <div className="rounded-2xl border border-[#fb7185]/20 bg-[#fb7185]/[0.05] p-4">
            <h2 className="text-[14px] font-semibold text-(--tx-danger)">{t("sedit.dangerTitle")}</h2>
            <p className="mt-1 text-[12.5px] text-(--tx3)">
              {t("sedit.dangerHint")}
            </p>
            <Button
              variant="ghost"
              className="mt-3 text-(--tx-danger) hover:bg-[#fb7185]/15 hover:text-(--tx-danger)"
              onClick={() => setConfirmDel(true)}
            >
              <Trash2 size={15} /> {t("sedit.deleteBtn")}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        onClose={() => !delBusy && setConfirmDel(false)}
        onConfirm={del}
        title={t("sedit.delTitle")}
        message={t("sedit.deleteMsg", { title: video?.title ?? "" })}
        confirmLabel={t("sedit.delConfirm")}
        busy={delBusy}
      />
    </div>
  );
}
