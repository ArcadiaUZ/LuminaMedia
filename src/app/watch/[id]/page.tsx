"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThumbsUp, ThumbsDown, Share2, Bookmark, BadgeCheck, MessageCircle, Clock } from "lucide-react";
import { Player } from "@/components/video/Player";
import { VideoCard, type CardVideo } from "@/components/video/VideoCard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton, CommentSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/States";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { formatViews, timeAgo, cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { useUI } from "@/store/ui";
import { useT } from "@/i18n/core";

interface Detail {
  video: {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    videoUrl: string;
    thumbnailUrl?: string | null;
    views: number;
    durationSec: number;
    createdAt: string;
    channelId: string;
    channel: {
      id: string;
      name: string;
      handle: string;
      avatarUrl?: string | null;
      verified: boolean;
      description?: string | null;
      _count: { subscribers: number; videos: number };
    };
  };
  stats: { likes: number; dislikes: number; comments: number; subscribed: boolean; myVote: number };
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl?: string | null };
  _count: { likes: number; replies: number };
  liked: boolean;
  replies: Comment[];
}

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, tp } = useT();
  const { id } = use(params);
  const router = useRouter();
  const [autoplay, setAutoplay] = useState(false);
  useEffect(() => {
    setAutoplay(new URLSearchParams(window.location.search).get("autoplay") === "1");
  }, []);
  const { user } = useAuth();
  const { toast } = useUI();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [recs, setRecs] = useState<CardVideo[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [playlists, setPlaylists] = useState<{ id: string; title: string; hasVideo?: boolean }[]>([]);
  const [newPl, setNewPl] = useState("");
  const [watchLater, setWatchLater] = useState(false);
  const viewSentRef = useRef(false);
  const pingSentRef = useRef(false);

  // Sessiya tarixi: oldingi video tugmasi uchun (browser history emas, shu sahifa ketma-ketligi)
  const stackRef = useRef<string[]>([]);
  const [prevId, setPrevId] = useState<string | null>(null);
  useEffect(() => {
    const s = stackRef.current;
    if (s[s.length - 1] === id) return;
    if (s.length >= 2 && s[s.length - 2] === id) s.pop(); // orqaga qaytish
    else s.push(id); // yangi video
    setPrevId(s.length >= 2 ? s[s.length - 2] : null);
  }, [id]);

  useEffect(() => {
    viewSentRef.current = false;
    pingSentRef.current = false;
    // Yangi videoda eski ma'lumot miltillamasligi uchun hammasini tozalash
    setData(null);
    setError("");
    setComments([]);
    setCommentsLoading(true);
    setRecs([]);
    setText("");
    setExpanded(false);
    setSaveOpen(false);
    setNewPl("");
    setWatchLater(false);
  }, [id]);

  const handleProgress = useCallback(
    async (sec: number) => {
      if (!data) return;
      if (sec < 3) return;
      const postView = (s: number) =>
        fetch(`/api/videos/${id}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watchedSec: s }),
        })
          .then((r) => r.json())
          .catch(() => null);
      // Tarixga erta yozish — 120s kutilmaydi; view hisobi pastda alohida
      if (!pingSentRef.current) {
        pingSentRef.current = true;
        postView(sec);
      }
      if (viewSentRef.current) return;
      const duration = data.video.durationSec ?? 0;
      const required = duration > 0 && duration < 120 ? duration : 120;
      if (sec < required) return;
      viewSentRef.current = true;
      try {
        const j = await postView(sec);
        if (j?.counted) {
          setData((d) => (d ? { ...d, video: { ...d.video, views: d.video.views + 1 } } : d));
        }
      } catch {}
    },
    [id, data]
  );

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await fetch(`/api/videos/${id}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Video unavailable");
      setData(j);
      fetch(`/api/videos?limit=10&sort=views`)
        .then((x) => x.json())
        .then((x) => setRecs((x.items ?? []).filter((v: CardVideo) => v.id !== id)))
        .catch(() => {});
      const c = await fetch(`/api/videos/${id}/comments`).then((x) => x.json());
      setComments(c.items ?? []);
      if (user) {
        const wl = await fetch("/api/me/watch-later").then((x) => x.json());
        setWatchLater((wl.watchLater ?? []).some((v: { id: string }) => v.id === id));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Video unavailable");
    } finally {
      setCommentsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const vote = async (v: number) => {
    if (!user) {
      toast(t('watch.loginLike'), "err");
      return;
    }
    const next = data?.stats.myVote === v ? 0 : v;
    const r = await fetch(`/api/videos/${id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: next }),
    });
    const j = await r.json();
    if (r.ok && data) setData({ ...data, stats: { ...data.stats, ...j } });
  };

  const subscribe = async () => {
    if (!user) {
      toast(t('watch.loginSubscribe'), "err");
      return;
    }
    if (!data) return;
    const r = await fetch(`/api/channels/${data.video.channel.id}/subscribe`, { method: "POST" });
    const j = await r.json();
    if (r.ok) {
      setData({
        ...data,
        stats: { ...data.stats, subscribed: j.subscribed },
        video: {
          ...data.video,
          channel: {
            ...data.video.channel,
            _count: {
              ...data.video.channel._count,
              subscribers: data.video.channel._count.subscribers + (j.subscribed ? 1 : -1),
            },
          },
        },
      });
      toast(j.subscribed ? t('watch.subscribed') : t('watch.unsubscribed'));
    } else toast(j.error ?? "Failed", "err");
  };

  const sendComment = async (parentId?: string, body?: string) => {
    const content = (body ?? text).trim();
    if (!content) return;
    if (!user) {
      toast(t('watch.loginComment'), "err");
      return;
    }
    const r = await fetch(`/api/videos/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: content, parentId: parentId ?? null }),
    });
    const j = await r.json();
    if (!r.ok) {
      toast(j.error ?? "Failed", "err");
      return;
    }
    if (parentId) {
      setComments((cs) =>
        cs.map((c) => (c.id === parentId ? { ...c, replies: [...(c.replies ?? []), j.comment], _count: { ...c._count, replies: c._count.replies + 1 } } : c))
      );
    } else {
      setComments((cs) => [j.comment, ...cs]);
      setText("");
    }
    toast(t('watch.commentPosted'));
  };

  const likeComment = async (cid: string) => {
    if (!user) {
      toast(t('watch.loginRequired'), "err");
      return;
    }
    const r = await fetch(`/api/comments/${cid}/like`, { method: "POST" });
    const j = await r.json();
    if (r.ok) {
      const patch = (c: Comment): Comment =>
        c.id === cid
          ? { ...c, liked: j.liked, _count: { ...c._count, likes: j.count } }
          : { ...c, replies: (c.replies ?? []).map(patch) };
      setComments((cs) => cs.map(patch));
    }
  };

  const openSave = async () => {
    if (!user) {
      toast(t('watch.loginSave'), "err");
      return;
    }
    const r = await fetch(`/api/playlists?videoId=${id}`);
    const j = await r.json();
    setPlaylists(j.items ?? []);
    setSaveOpen(true);
  };

  const toggleSave = async (pid: string, has: boolean) => {
    const r = has
      ? await fetch(`/api/playlists/${pid}/items?videoId=${id}`, { method: "DELETE" })
      : await fetch(`/api/playlists/${pid}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: id }),
        });
    if (r.ok) {
      setPlaylists((ps) => ps.map((p) => (p.id === pid ? { ...p, hasVideo: !has } : p)));
      toast(has ? t('watch.removedFromPl') : t('watch.savedToPl'));
    } else toast("Failed", "err");
  };

  const toggleWatchLater = async () => {
    if (!user) {
      toast(t('watch.loginSave'), "err");
      return;
    }
    const r = await fetch("/api/me/watch-later", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: id }),
    });
    const j = await r.json();
    if (r.ok) {
      setWatchLater(j.watchLater);
      toast(j.watchLater ? t('watch.savedWl') : t('watch.removedWl'));
    }
  };

  const createPlaylist = async () => {
    if (!newPl.trim()) return;
    const r = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newPl.trim() }),
    });
    const j = await r.json();
    if (r.ok) {
      setPlaylists((p) => [j.playlist, ...p]);
      setNewPl("");
      await toggleSave(j.playlist.id, false);
    }
  };

  if (error)
    return (
      <div className="mx-auto max-w-2xl pt-10">
        <ErrorState title={t('watch.unavailable')} hint={error} onRetry={load} />
      </div>
    );

  if (!data)
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );

  const v = data.video;
  const nextId = recs[0]?.id ?? null;
  const goVideo = (vid: string) => router.push(`/watch/${vid}?autoplay=1`);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <Player
          src={v.videoUrl}
          onProgress={handleProgress}
          autoplay={autoplay}
          hasPrev={!!prevId}
          hasNext={!!nextId}
          onPrev={prevId ? () => goVideo(prevId) : undefined}
          onNext={nextId ? () => goVideo(nextId) : undefined}
        />
        <h1 className="mt-4 text-[19px] font-bold leading-snug md:text-[22px]">{v.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link href={`/channel/${v.channel.handle}`} className="flex items-center gap-2.5">
            <Avatar src={v.channel.avatarUrl} name={v.channel.name} size={40} />
            <span>
              <span className="flex items-center gap-1 text-[14px] font-semibold">
                {v.channel.name}
                {v.channel.verified && <BadgeCheck size={15} className="text-[#7c5cff]" />}
              </span>
              <span className="text-[12.5px] text-(--tx3)">
                {tp('watch.subscribers', v.channel._count.subscribers)}
              </span>
            </span>
          </Link>
          <Button
            size="sm"
            variant={data.stats.subscribed ? "ghost" : "primary"}
            onClick={subscribe}
            className="ml-1"
          >
            {data.stats.subscribed ? t('watch.subscribedBtn') : t('watch.subscribe')}
          </Button>
          <span className="flex-1" />
          <div className="glass-chip flex items-center rounded-full border-[rgb(var(--tint)/0.08)] p-1">
            <button
              onClick={() => vote(1)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition",
                data.stats.myVote === 1 ? "bg-white text-black" : "hover:bg-[rgb(var(--tint)/0.10)]"
              )}
            >
              <ThumbsUp size={15} /> {formatViews(data.stats.likes)}
            </button>
            <span className="h-5 w-px bg-[rgb(var(--tint)/0.10)]" />
            <button
              onClick={() => vote(-1)}
              aria-label={t('watch.dislike')}
              className={cn(
                "rounded-full px-3.5 py-1.5 transition",
                data.stats.myVote === -1 ? "bg-white text-black" : "hover:bg-[rgb(var(--tint)/0.10)]"
              )}
            >
              <ThumbsDown size={15} />
            </button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              try {
                const u = new URL(window.location.href);
                u.searchParams.delete("autoplay");
                navigator.clipboard?.writeText(u.toString());
                toast(t('watch.linkCopied'));
              } catch {
                toast(t('watch.copyFailed'), "err");
              }
            }}
          >
            <Share2 size={15} /> {t('watch.share')}
          </Button>
          <Button size="sm" variant="ghost" onClick={openSave}>
            <Bookmark size={15} /> {t('watch.save')}
          </Button>
        </div>

        <div className="glass-min mt-4 rounded-2xl p-4 text-sm">
          <p className="font-semibold">
            {t('watch.meta', { views: formatViews(v.views), ago: timeAgo(v.createdAt), cat: v.category })}
          </p>
          <p className={cn("mt-1.5 whitespace-pre-wrap text-(--tx2)", !expanded && "line-clamp-2")}>
            {v.description || t('watch.noDesc')}
          </p>
          <button onClick={() => setExpanded((s) => !s)} className="mt-1.5 font-medium text-[#9d86ff] hover:text-(--tx1)">
            {expanded ? t('watch.showLess') : t('watch.showMore')}
          </button>
        </div>

        <div className="mt-6">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <MessageCircle size={17} /> {tp('watch.comments', data.stats.comments)}
          </h2>
          <div className="mt-3 flex gap-3">
            <Avatar src={user?.avatarUrl} name={user?.username ?? "G"} size={36} />
            <div className="flex-1">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={user ? t('watch.commentPh') : t('watch.loginToCommentPh')}
                disabled={!user}
                onKeyDown={(e) => e.key === "Enter" && sendComment()}
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setText("")}>
                  {t('watch.cancel')}
                </Button>
                <Button size="sm" onClick={() => sendComment()} disabled={!text.trim()}>
                  {t('watch.commentBtn')}
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-5">
            {commentsLoading ? (
              <>
                <CommentSkeleton />
                <CommentSkeleton />
              </>
            ) : comments.length === 0 ? (
              <EmptyState title={t('watch.noCommentsTitle')} hint={t('watch.noCommentsHint')} />
            ) : (
              comments.map((c) => (
                <CommentRow key={c.id} c={c} onLike={likeComment} onReply={sendComment} authed={!!user} t={t} />
              ))
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-3">
        <h2 className="text-[14px] font-semibold text-(--tx2)">{t('watch.upNext')}</h2>
        {recs.map((r) => (
          <VideoCard key={r.id} v={r} />
        ))}
      </aside>

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title={t('watch.saveTitle')}>
        <div className="space-y-2">
          <button
            onClick={toggleWatchLater}
            className="flex w-full items-center gap-2.5 rounded-2xl border border-[rgb(var(--tint)/0.08)] bg-[rgb(var(--tint)/0.03)] px-4 py-2.5 text-left text-sm hover:bg-[rgb(var(--tint)/0.07)]"
          >
            <Clock size={16} className={cn(watchLater && "text-[#7c5cff]")} />
            {t('watch.watchLater')}
            <span className="ml-auto text-[12px] text-(--tx3)">{watchLater ? t('watch.added') : t('watch.add')}</span>
          </button>
          {playlists.map((p) => (
            <button
              key={p.id}
              onClick={() => toggleSave(p.id, !!p.hasVideo)}
              className="flex w-full items-center gap-2.5 rounded-2xl border border-[rgb(var(--tint)/0.08)] bg-[rgb(var(--tint)/0.03)] px-4 py-2.5 text-left text-sm hover:bg-[rgb(var(--tint)/0.07)]"
            >
              <Bookmark size={15} className={cn(p.hasVideo && "fill-[#7c5cff] text-[#7c5cff]")} />
              <span className="flex-1 truncate">{p.title}</span>
              <span className="text-[12px] text-(--tx3)">{p.hasVideo ? t('watch.added') : t('watch.add')}</span>
            </button>
          ))}
          <div className="flex gap-2 pt-2">
            <Input value={newPl} onChange={(e) => setNewPl(e.target.value)} placeholder={t('watch.newPlPh')} />
            <Button onClick={createPlaylist} variant="iris">
              {t('watch.add')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CommentRow({
  c,
  onLike,
  onReply,
  authed,
  t,
}: {
  c: Comment;
  onLike: (id: string) => void;
  onReply: (parentId: string, text: string) => void;
  authed: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <div className="flex gap-3">
      <Avatar src={c.user.avatarUrl} name={c.user.username} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px]">
          <span className="font-semibold">@{c.user.username}</span>{" "}
          <span className="text-(--tx4)">{timeAgo(c.createdAt)}</span>
        </p>
        <p className="mt-1 text-[14px] leading-relaxed">{c.text}</p>
        <div className="mt-1.5 flex items-center gap-1 text-[12.5px] text-(--tx3)">
          <button
            onClick={() => onLike(c.id)}
            className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 hover:bg-[rgb(var(--tint)/0.10)]", c.liked && "text-(--tx1)")}
          >
            <ThumbsUp size={13} className={c.liked ? "fill-white" : ""} /> {c._count.likes || ""}
          </button>
          <button
            onClick={() => authed && setOpen((s) => !s)}
            className="rounded-full px-2.5 py-1 font-medium hover:bg-[rgb(var(--tint)/0.10)] hover:text-(--tx1)"
          >
            {t('watch.reply')}
          </button>
        </div>
        {open && (
          <div className="mt-2 flex gap-2">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('watch.replyPh')} />
            <Button
              size="sm"
              onClick={() => {
                onReply(c.id, draft);
                setDraft("");
                setOpen(false);
              }}
            >
              {t('watch.post')}
            </Button>
          </div>
        )}
        {(c.replies ?? []).length > 0 && (
          <div className="mt-3 space-y-3 border-l border-[rgb(var(--tint)/0.10)] pl-4">
            {(c.replies ?? []).map((r) => (
              <div key={r.id} className="flex gap-2.5">
                <Avatar src={r.user.avatarUrl} name={r.user.username} size={28} />
                <div>
                  <p className="text-[12.5px]">
                    <span className="font-semibold">@{r.user.username}</span>{" "}
                    <span className="text-(--tx4)">{timeAgo(r.createdAt)}</span>
                  </p>
                  <p className="text-[13.5px]">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
