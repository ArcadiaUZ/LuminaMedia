"use client";
import { LucideIcon, SearchX, WifiOff, Film, BellOff, History, ListVideo } from "lucide-react";
import { Button } from "./Button";

export function EmptyState({
  icon: Icon = Film,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass-min flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center">
      <span className="glass-chip mb-4 grid h-14 w-14 place-items-center rounded-2xl text-[#9d86ff]">
        <Icon size={24} />
      </span>
      <h3 className="text-[16px] font-semibold">{title}</h3>
      {hint && <p className="mt-1.5 max-w-sm text-sm text-(--tx3)">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  hint = "Please try again. If it persists, check your connection.",
  onRetry,
}: {
  title?: string;
  hint?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="glass-min flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center">
      <span className="glass-chip mb-4 grid h-14 w-14 place-items-center rounded-2xl text-(--tx-danger)">
        <WifiOff size={24} />
      </span>
      <h3 className="text-[16px] font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-(--tx3)">{hint}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export const presetIcons = { SearchX, BellOff, History, ListVideo };
