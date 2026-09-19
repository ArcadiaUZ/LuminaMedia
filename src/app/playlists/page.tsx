"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ListVideo, Plus, Pencil, Trash2, Film } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useAuth } from "@/store/auth";
import { useUI } from "@/store/ui";
import { useT } from "@/i18n/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pl = any;

export default function PlaylistsPage() {
  const { t, tp } = useT();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useUI();
  const [items, setItems] = useState<Pl[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState<"create" | "rename" | null>(null);
  const [target, setTarget] = useState<Pl | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [delTarget, setDelTarget] = useState<Pl | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (!user)
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-10 text-center">
        <h1 className="text-xl font-bold">{t('pl.loginTitle')}</h1>
        <p className="mt-2 text-sm text-(--tx3)">{t('pl.loginHint')}</p>
        <Button className="mt-5" onClick={() => router.push("/login")}>
          {t('pl.loginBtn')}
        </Button>
      </div>
    );

  const submit = async () => {
    if (title.trim().length < 2) {
      toast(t('pl.shortTitle'), "err");
      return;
    }
    setBusy(true);
    const url = modal === "rename" && target ? `/api/playlists/${target.id}` : "/api/playlists";
    const method = modal === "rename" && target ? "PATCH" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    if (r.ok) {
      toast(modal === "rename" ? t('pl.renamed') : t('pl.created'));
      setModal(null);
      setTitle("");
      load();
    } else {
      const j = await r.json();
      toast(j.error ?? "Failed", "err");
    }
    setBusy(false);
  };

  const del = async () => {
    if (!delTarget) return;
    setDelBusy(true);
    const r = await fetch(`/api/playlists/${delTarget.id}`, { method: "DELETE" });
    setDelBusy(false);
    if (r.ok) {
      toast(t('pl.deleted'));
      setDelTarget(null);
      load();
    } else toast(t('pl.deleteFailed'), "err");
  };

  return (
    <div className="fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">{t('pl.title')}</h1>
          <p className="text-sm text-(--tx3)">{t('pl.sub')}</p>
        </div>
        <Button
          onClick={() => {
            setTarget(null);
            setTitle("");
            setModal("create");
          }}
        >
          <Plus size={16} /> {t('pl.new')}
        </Button>
      </div>

      {!loaded ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={ListVideo}
            title={t('pl.emptyTitle')}
            hint={t('pl.emptyHint')}
            action={
              <Button
                onClick={() => {
                  setTitle("");
                  setModal("create");
                }}
              >
                {t('pl.createBtn')}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="card-hover glass-min group overflow-hidden rounded-2xl">
              <Link href={`/playlists/${p.id}`} className="block bg-gradient-to-br from-[#7c5cff]/25 to-transparent p-5">
                <Film size={26} className="text-[#9d86ff]" />
              </Link>
              <div className="flex items-start justify-between gap-2 p-4">
                <Link href={`/playlists/${p.id}`} className="min-w-0">
                  <p className="truncate text-[14px] font-semibold hover:underline">{p.title}</p>
                  <p className="text-[12.5px] text-(--tx3)">
                    {tp('pl.count', p._count?.items ?? 0)}
                  </p>
                </Link>
                <div className="flex shrink-0 gap-1">
                  <button
                    aria-label={t('pl.renameAria')}
                    onClick={() => {
                      setTarget(p);
                      setTitle(p.title);
                      setModal("rename");
                    }}
                    className="grid h-8 w-8 place-items-center rounded-lg text-(--tx3) hover:bg-[rgb(var(--tint)/0.10)] hover:text-(--tx1)"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    aria-label={t('pl.deleteAria')}
                    onClick={() => setDelTarget(p)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-(--tx3) hover:bg-[#fb7185]/15 hover:text-(--tx-danger)"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "rename" ? t('pl.renameTitle') : t('pl.newTitle')}>
        <div className="space-y-4">
          <Field label={t('pl.fieldTitle')}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('pl.titlePh')} autoFocus />
          </Field>
          <Button variant="iris" className="w-full" onClick={submit} loading={busy} disabled={!title.trim()}>
            {modal === "rename" ? t('pl.save') : t('pl.create')}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        onClose={() => !delBusy && setDelTarget(null)}
        onConfirm={del}
        title={t('pl.delTitle')}
        message={delTarget?.title ? t('pl.delMsg', { title: delTarget.title }) : ""}
        confirmLabel={t('pl.delConfirm')}
        busy={delBusy}
      />
    </div>
  );
}