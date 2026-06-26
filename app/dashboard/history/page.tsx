"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Loader2, Clock, Play, Radio, Users } from "lucide-react";
import { Sidebar } from "../_components/Sidebar";
import { Topbar } from "../_components/Topbar";

type HistoryEntry = {
  id: string;
  lastSeenAt: string;
  role: string;
  room: {
    id: string; name: string; slug: string; status: string; coverUrl: string | null;
    host: { id: string; name: string | null; username: string | null };
    _count: { members: number };
    playbackState: {
      isPlaying: boolean; currentTime: number;
      roomContent: {
        content: { title: string; thumbnailUrl: string | null; duration: number | null; type: string; url: string };
      } | null;
    } | null;
  };
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtProgress(current: number, duration: number | null) {
  if (!duration || duration === 0) return null;
  return Math.min(100, Math.round((current / duration) * 100));
}

const GRADIENTS = ["from-violet-900 to-indigo-950","from-purple-900 to-violet-950","from-blue-900 to-sky-950","from-rose-900 to-pink-950","from-teal-900 to-emerald-950","from-orange-900 to-amber-950"];
function grad(id: string) { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return GRADIENTS[h%GRADIENTS.length]; }

export default function HistoryPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isPending && !session) router.push("/login"); }, [session, isPending, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/library/history")
      .then(r => r.json())
      .then(d => { setHistory(d.history ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  if (isPending || !session) {
    return <div className="min-h-screen flex items-center justify-center bg-[#111113]"><Loader2 className="w-7 h-7 text-violet-500 animate-spin" /></div>;
  }

  return (
    <div className="flex h-screen bg-[#111113] text-neutral-200 overflow-hidden">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={session.user} unreadCount={0} />

        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6">
          <div className="mb-6">
            <h1 className="text-lg font-extrabold text-white font-sans">Watch History</h1>
            <p className="text-xs text-neutral-500 font-sans mt-0.5">Rooms you&apos;ve been in</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({length:6}).map((_,i) => <div key={i} className="h-24 rounded-2xl bg-neutral-800/40 animate-pulse" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Clock className="w-12 h-12 text-neutral-700" />
              <p className="text-sm text-neutral-500 font-sans">No watch history yet</p>
              <Link href="/dashboard/rooms"
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold text-white transition-colors font-sans">
                Find a Room to Watch
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(entry => {
                const content = entry.room.playbackState?.roomContent?.content;
                const pct     = fmtProgress(
                  entry.room.playbackState?.currentTime ?? 0,
                  content?.duration ?? null
                );
                const coverUrl = entry.room.coverUrl ?? content?.thumbnailUrl ?? null;
                const isLive   = entry.room.status === "LIVE";

                return (
                  <div key={entry.id} className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/60 hover:border-violet-500/30 transition-colors group">
                    {/* Thumbnail */}
                    <div className={`w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-linear-to-br ${grad(entry.room.id)} relative`}>
                      {coverUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coverUrl} alt="" className="w-full h-full object-cover opacity-70" />
                      )}
                      {isLive && (
                        <span className="absolute top-1 left-1 flex items-center gap-0.5 px-1 py-0.5 bg-red-500 rounded text-[8px] font-bold text-white font-sans">
                          <Radio className="w-2 h-2" /> LIVE
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white font-sans truncate">
                            {content?.title ?? entry.room.name}
                          </p>
                          {content?.title && content.title !== entry.room.name && (
                            <p className="text-[10px] text-neutral-500 font-sans truncate">{entry.room.name}</p>
                          )}
                          <p className="text-[10px] text-neutral-600 font-sans mt-0.5">
                            Hosted by <span className="text-violet-400">{entry.room.host.username ?? entry.room.host.name}</span>
                            {" · "}<span className="flex items-center gap-0.5 inline-flex"><Users className="w-2.5 h-2.5" /> {entry.room._count.members}</span>
                            {" · "}{timeAgo(entry.lastSeenAt)}
                          </p>
                        </div>

                        {/* Rejoin button */}
                        <Link href={isLive ? `/room/${entry.room.slug}` : `/dashboard/rooms/${entry.room.slug}`}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors font-sans opacity-0 group-hover:opacity-100 ${
                            isLive
                              ? "bg-violet-600 hover:bg-violet-500 text-white"
                              : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                          }`}>
                          <Play className="w-2.5 h-2.5 fill-current" />
                          {isLive ? "Rejoin" : "View"}
                        </Link>
                      </div>

                      {/* Progress bar */}
                      {pct !== null && (
                        <div className="mt-2">
                          <div className="w-full h-1 bg-neutral-800 rounded-full">
                            <div className="h-1 bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[9px] text-neutral-600 font-sans mt-0.5">{pct}% watched</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
