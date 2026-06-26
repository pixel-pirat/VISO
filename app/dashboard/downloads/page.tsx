"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Loader2, Download, Play, Film, Radio, ExternalLink } from "lucide-react";
import { Sidebar } from "../_components/Sidebar";
import { Topbar } from "../_components/Topbar";

type SavedContent = {
  id: string; title: string; url: string; type: string;
  thumbnailUrl: string | null; duration: number | null; createdAt: string;
  roomContents: {
    id: string; status: string;
    room: { id: string; name: string; slug: string; status: string };
  }[];
};

function fmtDuration(secs: number | null) {
  if (!secs) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7)  return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const GRADIENTS = ["from-violet-900 to-indigo-950","from-purple-900 to-violet-950","from-blue-900 to-sky-950","from-rose-900 to-pink-950","from-teal-900 to-emerald-950"];
function grad(id: string) { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return GRADIENTS[h%GRADIENTS.length]; }

const TYPE_LABEL: Record<string, string> = {
  HLS: "HLS Stream", MP4: "MP4 Video", YOUTUBE: "YouTube", TWITCH: "Twitch",
  DASH: "DASH Stream", LIVEKIT: "LiveKit",
};

export default function DownloadsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [content, setContent] = useState<SavedContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isPending && !session) router.push("/login"); }, [session, isPending, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/library/saved")
      .then(r => r.json())
      .then(d => { setContent(d.content ?? []); setLoading(false); })
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
            <h1 className="text-lg font-extrabold text-white font-sans">Saved Content</h1>
            <p className="text-xs text-neutral-500 font-sans mt-0.5">
              Videos you&apos;ve uploaded or added to your rooms
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({length: 5}).map((_,i) => (
                <div key={i} className="h-20 rounded-2xl bg-neutral-800/40 animate-pulse" />
              ))}
            </div>
          ) : content.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Download className="w-12 h-12 text-neutral-700" />
              <p className="text-sm text-neutral-500 font-sans">No saved content yet</p>
              <p className="text-xs text-neutral-600 font-sans text-center max-w-xs">
                Videos you upload when creating rooms will appear here
              </p>
              <Link href="/dashboard/rooms"
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold text-white transition-colors font-sans mt-1">
                Create a Room
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {content.map(item => {
                const room        = item.roomContents[0]?.room ?? null;
                const isProcessing = item.url && !item.url.startsWith("http") && !item.url.startsWith("data:");
                const isLive       = room?.status === "LIVE";

                return (
                  <div key={item.id}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/60 hover:border-violet-500/30 transition-colors group">
                    {/* Thumbnail */}
                    <div className={`w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-linear-to-br ${grad(item.id)} relative flex items-center justify-center`}>
                      {item.thumbnailUrl && !isProcessing ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Film className="w-6 h-6 text-neutral-600" />
                      )}
                      {isProcessing && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                          <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white font-sans truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-neutral-600 font-sans">
                              {TYPE_LABEL[item.type] ?? item.type}
                            </span>
                            {item.duration && (
                              <span className="text-[10px] text-neutral-600 font-sans">
                                · {fmtDuration(item.duration)}
                              </span>
                            )}
                            <span className="text-[10px] text-neutral-600 font-sans">
                              · Added {timeAgo(item.createdAt)}
                            </span>
                          </div>
                          {room && (
                            <div className="flex items-center gap-1.5 mt-1">
                              {isLive && (
                                <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-400 font-sans">
                                  <Radio className="w-2.5 h-2.5" /> LIVE
                                </span>
                              )}
                              <span className="text-[10px] text-neutral-500 font-sans">
                                In room: <span className="text-violet-400 font-semibold">{room.name}</span>
                              </span>
                            </div>
                          )}
                          {isProcessing && (
                            <p className="text-[10px] text-amber-400 font-sans mt-0.5">
                              Transcoding in progress…
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {room && (
                            <Link
                              href={isLive ? `/room/${room.slug}` : `/dashboard/rooms/${room.slug}`}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors font-sans ${
                                isLive
                                  ? "bg-violet-600 hover:bg-violet-500 text-white"
                                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                              }`}
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              {isLive ? "Watch Live" : "Open Room"}
                            </Link>
                          )}
                          {!isProcessing && item.url.startsWith("http") && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors"
                              title="Open source URL">
                              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                            </a>
                          )}
                        </div>
                      </div>
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
