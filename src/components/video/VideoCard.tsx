"use client";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatDuration, formatViews, timeAgo } from "@/lib/utils";
import { useT } from "@/i18n/core";

export interface CardVideo {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  durationSec: number;
  views: number;
  createdAt: string | Date;
  category?: string;
  channel: { id: string; name: string; handle: string; avatarUrl?: string | null; verified?: boolean };
}

export function VideoCard({ v }: { v: CardVideo }) {
  const { t } = useT();
  return (
    <Link
      href={`/watch/${v.id}?autoplay=1`}
      className="card-hover glass-min group overflow-hidden rounded-2xl"
    >
      <div className="img-zoom relative aspect-video overflow-hidden bg-[#0c0c13]">
        {v.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.thumbnailUrl} alt={v.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#1b1b27] to-[#101019] text-[#6b6b7d] text-sm">
            {t("card.noThumb")}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
        <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium backdrop-blur">
          {formatDuration(v.durationSec)}
        </span>
        {v.category && (
          <span className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition">
            <Badge tone="iris">{v.category}</Badge>
          </span>
        )}
      </div>
      <div className="flex gap-3 p-3.5">
        <Avatar src={v.channel.avatarUrl} name={v.channel.name} size={36} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug">{v.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-[12.5px] text-(--tx3) hover:text-(--tx1)">
            <span className="truncate">{v.channel.name}</span>
            {v.channel.verified && <BadgeCheck size={14} className="text-[#7c5cff] shrink-0" />}
          </p>
          <p className="text-[12px] text-(--tx4)">
            {formatViews(v.views)} {t("card.views")} · {timeAgo(v.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
