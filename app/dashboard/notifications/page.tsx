"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2, Bell, UserPlus, Tv2, Play, Info, CheckCheck, MessageSquare } from "lucide-react";
import { Sidebar } from "../_components/Sidebar";
import { Topbar } from "../_components/Topbar";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  payload: Record<string, unknown> | null;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const TYPE_ICON: Record<string, React.ElementType> = {
  FRIEND_REQUEST:   UserPlus,
  ROOM_INVITE:      Tv2,
  PLAYBACK_STARTED: Play,
  CHAT_MENTION:     MessageSquare,
  SYSTEM:           Info,
};

const TYPE_COLOR: Record<string, string> = {
  FRIEND_REQUEST:   "from-violet-500 to-fuchsia-500",
  ROOM_INVITE:      "from-blue-500 to-cyan-500",
  PLAYBACK_STARTED: "from-emerald-500 to-teal-500",
  CHAT_MENTION:     "from-orange-500 to-rose-500",
  SYSTEM:           "from-neutral-500 to-neutral-600",
};

// Where clicking a notification takes you
function targetFor(n: Notification): string | null {
  if (n.type === "FRIEND_REQUEST") return "/dashboard/friends?tab=pending";
  if (n.type === "ROOM_INVITE" || n.type === "PLAYBACK_STARTED") {
    const slug = typeof n.payload?.roomSlug === "string" ? n.payload.roomSlug : null;
    return slug ? `/dashboard/rooms/${slug}` : "/dashboard/rooms";
  }
  if (n.type === "CHAT_MENTION") return "/dashboard/chat";
  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isPending && !session) router.push("/login"); }, [session, isPending, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => { setNotifications(d.notifications ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    fetch("/api/notifications/read", { method: "PATCH" }).catch(() => {});
  }, []);

  const open = useCallback((n: Notification) => {
    if (!n.isRead) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      fetch(`/api/notifications/read?id=${n.id}`, { method: "PATCH" }).catch(() => {});
    }
    const target = targetFor(n);
    if (target) router.push(target);
  }, [router]);

  if (isPending || !session) {
    return <div className="min-h-screen flex items-center justify-center bg-[#111113]"><Loader2 className="w-7 h-7 text-violet-500 animate-spin" /></div>;
  }

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex h-screen bg-[#111113] text-neutral-200 overflow-hidden">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={session.user} unreadCount={unread} />

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-2xl mx-auto px-6 py-6">

            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-lg font-extrabold text-white font-sans">Notifications</h1>
                <p className="text-xs text-neutral-500 font-sans mt-0.5">
                  {unread > 0 ? `${unread} unread` : "You're all caught up"}
                </p>
              </div>
              {unread > 0 && (
                <button onClick={markAllRead}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xs font-bold text-neutral-300 hover:text-white transition-colors font-sans">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
                </button>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-neutral-800/60 animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-violet-400" />
                </div>
                <p className="text-sm text-neutral-500 font-sans">No notifications yet.</p>
                <p className="text-xs text-neutral-600 font-sans">Friend requests and room activity will show up here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Info;
                  const g    = TYPE_COLOR[n.type] ?? TYPE_COLOR.SYSTEM;
                  const clickable = targetFor(n) !== null || !n.isRead;
                  return (
                    <button
                      key={n.id}
                      onClick={() => open(n)}
                      disabled={!clickable}
                      className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors font-sans ${
                        n.isRead
                          ? "bg-neutral-900/40 border-neutral-800/40 hover:border-neutral-700/60"
                          : "bg-neutral-900 border-violet-500/20 hover:border-violet-500/40"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full bg-linear-to-br ${g} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-snug ${n.isRead ? "text-neutral-400" : "text-white"}`}>{n.title}</p>
                        <p className="text-[11px] text-neutral-500 leading-snug mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-neutral-700 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
