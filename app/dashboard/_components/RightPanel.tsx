"use client";

import { Bell, MessageCircle, UserPlus } from "lucide-react";
import type { AppNotification, FriendshipWithUsers } from "../_types/dashboard";

const AVATAR_GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-rose-500",
  "from-pink-500 to-fuchsia-500",
];
function pickAvatar(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PanelSection({ title, action, onAction, children }: {
  title: string; action?: string; onAction?: () => void; children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-4 border-b border-neutral-800/60 last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-white font-sans">{title}</h3>
        {action && (
          <button
            onClick={onAction}
            className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold font-sans transition-colors"
          >
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-[10px] text-neutral-600 font-sans py-2">{label}</p>;
}

/* ── Main export ──────────────────────────────────────────────── */
export function RightPanel({
  notifications,
  onlineFriends,
  currentUserId,
  onNotificationsRead,
}: {
  notifications: AppNotification[];
  onlineFriends: FriendshipWithUsers[];
  currentUserId: string;
  onNotificationsRead: () => void;
}) {
  const unread = notifications.filter((n) => !n.isRead);

  // Resolve the "other" user from each friendship
  const friends = onlineFriends.map((f) =>
    f.requesterId === currentUserId ? f.addressee : f.requester
  );
  const onlineNow = friends.filter((f) => f.status === "ONLINE");
  const allFriends = friends; // show all when no one is online

  return (
    <aside className="w-[240px] shrink-0 h-full overflow-y-auto bg-[#0e0e10] border-l border-neutral-800/60 scrollbar-hide">

      {/* Notifications */}
      <PanelSection
        title={`Notifications${unread.length > 0 ? ` (${unread.length})` : ""}`}
        action="Mark all as read"
        onAction={onNotificationsRead}
      >
        {notifications.length === 0 ? (
          <EmptyState label="No notifications yet." />
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((n) => {
              const g = pickAvatar(n.id);
              return (
                <div key={n.id} className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-full bg-linear-to-br ${g} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                    {n.type[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-neutral-300 font-sans leading-snug font-semibold">{n.title}</p>
                    <p className="text-[9px] text-neutral-500 font-sans leading-snug mt-0.5">{n.message}</p>
                    <p className="text-[9px] text-neutral-700 font-sans mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1 shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
        {notifications.length > 0 && (
          <button className="mt-3 w-full py-2 rounded-lg bg-neutral-800/60 hover:bg-neutral-700/60 text-[10px] font-semibold text-neutral-400 hover:text-white transition-colors font-sans">
            View all notifications
          </button>
        )}
      </PanelSection>

      {/* Online Friends */}
      <PanelSection title={`Online Friends${onlineNow.length > 0 ? ` (${onlineNow.length})` : ""}`} action="See all">
        {allFriends.length === 0 ? (
          <EmptyState label="No friends yet. Invite someone!" />
        ) : (
          <div className="space-y-3">
            {(onlineNow.length > 0 ? onlineNow : allFriends).slice(0, 6).map((f) => {
              const g = pickAvatar(f.id);
              const isOnline = f.status === "ONLINE";
              return (
                <div key={f.id} className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <div className={`w-7 h-7 rounded-full bg-linear-to-br ${g} flex items-center justify-center text-white text-[9px] font-bold`}>
                      {f.name?.[0] ?? "?"}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0e0e10] ${
                      isOnline ? "bg-emerald-500" : f.status === "IDLE" ? "bg-yellow-500" : "bg-neutral-600"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-white font-sans truncate">
                      {f.name ?? f.username ?? "User"}
                    </p>
                    <p className="text-[9px] font-sans truncate capitalize" style={{ color: isOnline ? "#34d399" : "#6b7280" }}>
                      {f.status.toLowerCase().replace("_", " ")}
                    </p>
                  </div>
                  <button
                    className="w-5 h-5 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors shrink-0"
                    title="Message"
                  >
                    <MessageCircle className="w-2.5 h-2.5 text-neutral-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </PanelSection>

      {/* Invite Friends */}
      <PanelSection title="Invite Friends">
        <p className="text-[10px] text-neutral-500 font-sans mb-3">Get more friends on VISO</p>
        <button className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-neutral-800/60 hover:bg-neutral-700/60 text-[10px] font-semibold text-neutral-300 hover:text-white transition-colors font-sans">
          <UserPlus className="w-3 h-3" /> Invite Friends
        </button>
      </PanelSection>

    </aside>
  );
}
