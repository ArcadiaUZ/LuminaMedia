"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Trash2 } from "lucide-react";
import { VideoCard, type CardVideo } from "@/components/video/VideoCard";
import { VideoCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useUI } from "@/store/ui";
import { useT } from "@/i18n/core";

export default function HistoryPage() {
  const { t } = useT();
  const { toast } = useUI();
  const [items, setItems] = useState<{ id: string; watchedAt: string; video: CardVideo }[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const load = () => {
    setLoading(true);
    fetch("/api/history")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => setItems(j.items ?? []))
      .catch((e) => {
        console.error("History load failed:", e);
        setItems([]);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const clearAll = async () => {
    setClearBusy(true);
    try {
      const r = await fetch("/api/history", { method: "DELETE" });
      if (!r.ok) throw new Error("Clear failed");
      setItems([]);
      setConfirmClear(false);
      toast(t('history.cleared'));
    } catch (e) {
      console.error(e);
      toast(t('history.clearFailed'), "err");
    } finally {
      setClearBusy(false);
    }
  };

  return (
    <div className="fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">{t('history.title')}</h1>
          <p className="text-sm text-(--tx3)">{t('history.sub')}</p>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
            <Trash2 size={14} /> {t('history.clearAll')}
          </Button>
        )}
      </div>
      {loading ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={History} title={t('history.emptyTitle')} hint={t('history.emptyHint')} action={<Link href="/" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">{t('history.browse')}</Link>} />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((h) => (
            <VideoCard key={h.id} v={h.video} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        onClose={() => !clearBusy && setConfirmClear(false)}
        onConfirm={clearAll}
        title={t('history.dlgTitle')}
        message={t('history.dlgMsg')}
        confirmLabel={t('history.dlgConfirm')}
        busy={clearBusy}
      />
    </div>
  );
}