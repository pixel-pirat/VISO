"use client";

import { Play, ChevronRight, Radio, Users, Lock, CheckCircle2, Flame, Globe } from "lucide-react";
import type { DashboardData, LiveRoom, ContinueItem, TrendingRoom, FriendActivity } from "../_types/dashboard";

type User = { id: string; name: string | null };

const GRADIENTS = [
  "from-violet-900 to-indigo-950",
  "from-purple-900 to-violet-950",
  "from-indigo-900 to-blue-950",
  "from-blue-900 to-sky-950",
  "from-teal-900 to-emerald-950",
  "from-rose-900 to-pink-950",
  "from-orange-900 to-amber-950",
  "from-fuchsia-900 to-purple-950",
];
function pickGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

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

/* ── Skeleton ───────────────────────────────────────────────── */
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800/60 ${className}`} />;
}

function HScrollSkeleton({ w, h, count = 4 }: { w: string; h: string; count?: number }) {
  return (
    <div className="flex gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`shrink-0 ${w} ${h}`} />
      ))}
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────── */
function SectionHeader({ label, href }: { label: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-white font-sans">
        {label} <ChevronRight className="w-4 h-4 text-neutral-500" />
      </h2>
      {href && (
        <a href={href} className="text-xs text-violet-400 hover:text-violet-300 font-semibold font-sans transition-colors">
          See all
        </a>
      )}
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────── */
function Empty({ label }: { label: string }) {
  return (
    <div className="h-24 flex items-center justify-center rounded-xl border border-dashed border-neutral-800">
      <p className="text-xs text-neutral-600 font-sans">{label}</p>
    </div>
  );
}

/* ── Continue Watching card ─────────────────────────────────── */
function ContinueCard({ item }: { item: ContinueItem }) {
  const content = item.room.playbackState?.roomContent?.content;
  const duration = content?.duration ?? 0;
  const currentTime = item.room.playbackState?.currentTime ?? 0;
  const progress = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;
  const title = content?.title ?? item.room.name;
  const gradient = pickGradient(item.room.id);

  return (
    <div className={`relative shrink-0 w-44 rounded-xl overflow-hidden bg-linear-to-br ${gradient} cursor-pointer group`}>
      <div className="aspect-video flex items-center justify-center relative">
        {content?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.thumbnailUrl} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
        ) : null}
        <div className="relative w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>
        <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center z-10">
          <Play className="w-3 h-3 text-white fill-white ml-0.5" />
        </div>
      </div>
      <div className="px-3 pb-3">
        <p className="text-xs font-semibold text-white truncate font-sans mb-1.5">{title}</p>
        <div className="w-full h-1 rounded-full bg-white/20">
          <div className="h-1 rounded-full bg-violet-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[10px] text-neutral-400 mt-1 font-sans">{progress}%</p>
      </div>
    </div>
  );
}

/* ── Live Room card ─────────────────────────────────────────── */
function LiveRoomCard({ room, currentUserId }: { room: LiveRoom; currentUserId: string }) {
  const content = room.playbackState?.roomContent?.content;
  const title = content?.title ?? room.name;
  const duration = content?.duration ?? 0;
  const currentTime = room.playbackState?.currentTime ?? 0;
  const progress = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;
  const gradient = pickGradient(room.id);
  const isPrivate = room.visibility === "PRIVATE";
  const isMember = false; // will be wired via membership check if needed

  return (
    <div className={`shrink-0 w-64 rounded-xl overflow-hidden bg-linear-to-br ${gradient} border border-neutral-700/40 cursor-pointer group`}>
      <div className="relative h-32 flex items-center justify-center overflow-hidden">
        {content?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.thumbnailUrl} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-50" />
        ) : null}
        <span className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded text-white text-[9px] font-bold font-sans z-10">
          <Radio className="w-2 h-2" /> LIVE
        </span>
        <span className="absolute top-2 right-2 flex items-center gap-1 text-[9px] text-neutral-300 font-sans z-10">
          <Users className="w-2.5 h-2.5" /> {room._count.members.toLocaleString()}
        </span>
        <div className="relative w-10 h-10 rounded-full bg-black/20 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
        </div>
        <p className="absolute bottom-2 left-3 right-3 text-xs font-bold text-white font-sans leading-tight drop-shadow z-10">{title}</p>
      </div>
      <div className="px-3 pb-3 pt-2 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-neutral-500 font-sans truncate">
            Hosted by{" "}
            <span className="text-violet-400 font-semibold">{room.host.username ?? room.host.name}</span>
          </p>
          <button className="px-3 py-1 bg-violet-600 hover:bg-violet-500 rounded-lg text-[10px] font-bold text-white transition-colors font-sans shrink-0 ml-2">
            Join
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-sans">
          {isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
          {isPrivate ? "Private" : "Public"}
        </div>
        {duration > 0 && (
          <>
            <div className="w-full h-1 rounded-full bg-white/10">
              <div className="h-1 rounded-full bg-violet-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-500 font-sans">{progress}% Complete</span>
              {room.playbackState?.isPlaying && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold font-sans">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Playing
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Trending card ──────────────────────────────────────────── */
function TrendingCard({ room }: { room: TrendingRoom }) {
  const content = room.playbackState?.roomContent?.content;
  const title = content?.title ?? room.name;
  const gradient = pickGradient(room.id);

  return (
    <div className={`shrink-0 w-36 rounded-xl overflow-hidden bg-linear-to-br ${gradient} cursor-pointer group border border-neutral-700/30`}>
      <div className="relative h-48 flex flex-col justify-end p-3 overflow-hidden">
        {content?.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.thumbnailUrl} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
        <p className="relative text-xs font-bold text-white font-sans leading-tight">{title}</p>
        <p className="relative flex items-center gap-1 text-[10px] text-orange-400 font-semibold font-sans mt-1">
          <Flame className="w-2.5 h-2.5" />
          {room._count.members.toLocaleString()} watching
        </p>
      </div>
    </div>
  );
}

/* ── Friends Activity card ──────────────────────────────────── */
function ActivityCard({ friendship, currentUserId }: { friendship: FriendActivity; currentUserId: string }) {
  const friend = friendship.requesterId === currentUserId ? friendship.addressee : friendship.requester;
  const membership = friend.memberships[0];
  const roomName = membership?.room?.name ?? null;
  const contentTitle = membership?.room?.playbackState?.roomContent?.content?.title ?? null;
  const ago = membership?.joinedAt ? timeAgo(membership.joinedAt) : "";
  const gradient = pickAvatar(friend.id);
  const action = contentTitle ? "is watching" : roomName ? "joined a room" : "started a room";
  const display = contentTitle ?? roomName;

  return (
    <div className="shrink-0 w-48 rounded-xl bg-neutral-900 border border-neutral-800/60 p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full bg-linear-to-br ${gradient} flex items-center justify-center text-white text-[10px] font-bold font-sans shrink-0`}>
          {friend.name?.[0] ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-violet-400 truncate font-sans">
            {friend.name ?? friend.username ?? "User"} {action}
          </p>
          {display && <p className="text-[10px] text-white font-semibold truncate font-sans">{display}</p>}
          {ago && <p className="text-[9px] text-neutral-600 font-sans">{ago}</p>}
        </div>
      </div>
      <div className={`h-16 rounded-lg bg-linear-to-br ${pickGradient(friend.id)} flex items-center justify-center overflow-hidden`}>
        {membership ? (
          <Play className="w-5 h-5 text-white/50" />
        ) : (
          <div className="w-5 h-5 text-neutral-600"><Play className="w-5 h-5" /></div>
        )}
      </div>
      {membership && (
        <button className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-[10px] font-bold text-white transition-colors font-sans">
          Join
        </button>
      )}
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────── */
export function MainFeed({
  user,
  data,
  loading,
  onRefresh,
}: {
  user: User;
  data: DashboardData | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <main className="flex-1 overflow-y-auto px-6 py-5 space-y-7 scrollbar-hide min-w-0">

      {/* Continue Watching */}
      <section>
        <SectionHeader label="Continue Watching" />
        {loading ? (
          <HScrollSkeleton w="w-44" h="h-36" count={4} />
        ) : !data?.continueWatching.length ? (
          <Empty label="Join a room to start watching — progress will appear here." />
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {data.continueWatching.map((item) => (
              <ContinueCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Live Rooms */}
      <section>
        <SectionHeader label="Live Rooms" href="/dashboard/rooms" />
        {loading ? (
          <HScrollSkeleton w="w-64" h="h-56" count={3} />
        ) : !data?.liveRooms.length ? (
          <Empty label="No rooms are live right now. Create one!" />
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {data.liveRooms.map((room) => (
              <LiveRoomCard key={room.id} room={room} currentUserId={user.id} />
            ))}
          </div>
        )}
      </section>

      {/* Trending Now */}
      <section>
        <SectionHeader label="Trending Now" />
        {loading ? (
          <HScrollSkeleton w="w-36" h="h-48" count={5} />
        ) : !data?.trending.length ? (
          <Empty label="Nothing trending yet." />
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {data.trending.map((room) => (
              <TrendingCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </section>

      {/* Friends Activity */}
      <section>
        <SectionHeader label="Friends Activity" />
        {loading ? (
          <HScrollSkeleton w="w-48" h="h-36" count={3} />
        ) : !data?.friendsActivity.length ? (
          <Empty label="Add friends to see what they're watching." />
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {data.friendsActivity.map((f) => (
              <ActivityCard key={f.id} friendship={f} currentUserId={user.id} />
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
