"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Users, Lock, Globe, CheckCircle2, Play,
  ChevronLeft, ChevronRight, Bell, Plus,
} from "lucide-react";
import type { RoomFilters } from "../page";

type RoomUser = { id: string; name: string | null; username: string | null; image: string | null };

type Room = {
  id: string;
  name: string;
  slug: string;
  visibility: string;
  status: string;           // SCHEDULED | LIVE | ENDED
  coverUrl: string | null;
  contentTitle: string | null;
  scheduledAt: string | null;
  commChat: boolean;
  commAudio: boolean;
  commVideo: boolean;
  host: RoomUser;
  _count: { members: number };
  members: { role: string }[];
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    roomContent: {
      content: { title: string; thumbnailUrl: string | null; duration: number | null; type: string };
    } | null;
  } | null;
};

const GRADIENTS = [
  "from-violet-900 via-indigo-900 to-neutral-950",
  "from-purple-900 via-violet-900 to-neutral-950",
  "from-blue-900 via-sky-900 to-neutral-950",
  "from-rose-900 via-pink-900 to-neutral-950",
  "from-teal-900 via-emerald-900 to-neutral-950",
  "from-orange-900 via-amber-900 to-neutral-950",
  "from-fuchsia-900 via-purple-900 to-neutral-950",
  "from-indigo-900 via-blue-900 to-neutral-950",
];
function grad(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function progress(room: Room) {
  const d = room.playbackState?.roomContent?.content.duration ?? 0;
  const t = room.playbackState?.currentTime ?? 0;
  return d > 0 ? Math.min(100, Math.round((t / d) * 100)) : 0;
}

function commLabel(room: Room) {
  const active = [room.commChat && "Chat", room.commAudio && "Audio", room.commVideo && "Video"].filter(Boolean);
  if (active.length === 0) return null;
  if (active.length > 1)   return "Enabled";
  return active[0] as string;
}

function coverSrc(room: Room) {
  return room.coverUrl ?? room.playbackState?.roomContent?.content.thumbnailUrl ?? null;
}

function displayTitle(room: Room) {
  return room.contentTitle ?? room.playbackState?.roomContent?.content.title ?? room.name;
}

function SectionHeader({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold text-white font-sans">{label}</h2>
      {action && (
        <button onClick={onAction} className="text-xs text-violet-400 hover:text-violet-300 font-semibold font-sans transition-colors">
          {action}
        </button>
      )}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-800/60 ${className}`} />;
}

/* ── Featured hero carousel ─────────────────────────────────── */
function FeaturedHero({ rooms }: { rooms: Room[] }) {
  const [idx, setIdx] = useState(0);
  const room = rooms[idx];
  if (!room) return null;
  const cover = coverSrc(room);
  const title = displayTitle(room);
  const pct   = progress(room);
  const g     = grad(room.id);
  const comm  = commLabel(room);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden bg-linear-to-br ${g} mb-6`} style={{ minHeight: 220 }}>
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-40" />
      )}
      <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/40 to-transparent" />

      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        {room.status === "LIVE" && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded text-white text-[10px] font-bold font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" /> LIVE
          </span>
        )}
        {room.status === "SCHEDULED" && (
          <span className="px-2 py-0.5 bg-amber-500/80 rounded text-white text-[10px] font-bold font-sans">UPCOMING</span>
        )}
        <span className="flex items-center gap-1 text-[10px] text-neutral-300 font-sans bg-black/40 px-2 py-0.5 rounded">
          <Users className="w-2.5 h-2.5" /> {room._count.members.toLocaleString()}
        </span>
      </div>

      <div className="relative z-10 p-6 pt-14">
        <h3 className="text-2xl font-extrabold text-white font-sans leading-tight">{title}</h3>
        {room.name !== title && <p className="text-sm text-neutral-400 font-sans mt-0.5">{room.name}</p>}
        <p className="text-xs text-neutral-400 font-sans mt-1">
          Hosted by <span className="text-violet-400 font-semibold">{room.host.username ?? room.host.name}</span>
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500 font-sans">
          {room.visibility === "PRIVATE" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
          <span>{room.visibility === "PRIVATE" ? "Private" : "Public"}</span>
          {comm && <span className="text-emerald-400 font-semibold">· {comm}</span>}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <div className="flex -space-x-2">
            {Array.from({ length: Math.min(5, room._count.members) }).map((_, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-linear-to-br from-violet-500 to-fuchsia-500 border-2 border-black/40" />
            ))}
            {room._count.members > 5 && (
              <div className="w-7 h-7 rounded-full bg-neutral-800 border-2 border-black/40 flex items-center justify-center text-[8px] font-bold text-neutral-400">
                +{room._count.members - 5}
              </div>
            )}
          </div>
          <span className="text-xs text-neutral-400 font-sans">{room._count.members.toLocaleString()} watching</span>
        </div>

        <button className="mt-4 px-5 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-bold text-white transition-colors font-sans shadow-lg shadow-violet-500/20">
          View Room
        </button>
      </div>

      {pct > 0 && (
        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10">
          <div className="h-1 bg-violet-500" style={{ width: `${pct}%` }} />
        </div>
      )}

      {rooms.length > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-3 z-10">
          <button onClick={() => setIdx((i) => (i - 1 + rooms.length) % rooms.length)}
            className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors">
            <ChevronLeft className="w-3 h-3 text-white" />
          </button>
          <div className="flex gap-1">
            {rooms.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`rounded-full transition-all ${i === idx ? "w-4 h-1.5 bg-violet-400" : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"}`} />
            ))}
          </div>
          <button onClick={() => setIdx((i) => (i + 1) % rooms.length)}
            className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors">
            <ChevronRight className="w-3 h-3 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Room card (grid) ───────────────────────────────────────── */
function RoomCard({ room }: { room: Room }) {
  const cover     = coverSrc(room);
  const title     = displayTitle(room);
  const pct       = progress(room);
  const g         = grad(room.id);
  const isPrivate = room.visibility === "PRIVATE";
  const comm      = commLabel(room);
  const isLive    = room.status === "LIVE";
  const isUpcoming = room.status === "SCHEDULED";

  return (
    <Link href={`/dashboard/rooms/${room.slug}`}
      className={`block rounded-xl overflow-hidden bg-linear-to-br ${g} border border-neutral-700/30 cursor-pointer group hover:border-violet-500/40 transition-colors`}>
      {/* cover */}
      <div className="relative h-28 overflow-hidden">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />

        {/* top badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {isLive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded text-white text-[9px] font-bold font-sans">
              <span className="w-1 h-1 rounded-full bg-white animate-pulse inline-block" /> LIVE
            </span>
          )}
          {isUpcoming && (
            <span className="px-1.5 py-0.5 bg-amber-500/90 rounded text-white text-[9px] font-bold font-sans">UPCOMING</span>
          )}
          <span className="flex items-center gap-1 text-[9px] text-neutral-300 bg-black/50 px-1.5 py-0.5 rounded font-sans">
            <Users className="w-2 h-2" /> {room._count.members.toLocaleString()}
          </span>
        </div>

        {/* hover play */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* content title bottom-left */}
        <p className="absolute bottom-2 left-2 right-2 text-xs font-bold text-white font-sans leading-tight drop-shadow truncate">{title}</p>
      </div>

      {/* body */}
      <div className="px-3 pb-3 pt-2 space-y-1.5">
        {/* room name if different from title */}
        {room.name !== title && (
          <p className="text-[10px] text-neutral-400 font-sans truncate">{room.name}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-neutral-500 font-sans truncate">
            Hosted by <span className="text-violet-400 font-semibold">{room.host.username ?? room.host.name}</span>
          </p>
          <button className="shrink-0 px-2.5 py-1 bg-violet-600 hover:bg-violet-500 rounded-lg text-[10px] font-bold text-white transition-colors font-sans">
            Join
          </button>
        </div>

        {/* visibility + communication */}
        <div className="flex items-center justify-between text-[10px] font-sans">
          <div className="flex items-center gap-1.5 text-neutral-600">
            {isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
            <span>{isPrivate ? "Private" : "Public"}</span>
          </div>
          {comm && (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-2.5 h-2.5" /> {comm}
            </span>
          )}
        </div>

        {/* progress bar */}
        {pct > 0 && (
          <div className="w-full h-1 rounded-full bg-white/10">
            <div className="h-1 rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
          </div>
        )}

        {/* scheduled date */}
        {isUpcoming && room.scheduledAt && (
          <p className="text-[10px] text-amber-400 font-sans">
            {new Date(room.scheduledAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </Link>
  );
}

/* ── Upcoming event card ─────────────────────────────────────── */
function UpcomingCard({ room }: { room: Room }) {
  const g = grad(room.id);
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800/60 hover:border-violet-500/30 transition-colors cursor-pointer group">
      <div className={`w-14 h-14 rounded-xl bg-linear-to-br ${g} shrink-0 flex items-center justify-center overflow-hidden`}>
        <Play className="w-5 h-5 text-white/40" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white font-sans truncate">{room.name}</p>
        <p className="text-[10px] text-neutral-500 font-sans mt-0.5">
          Hosted by <span className="text-violet-400">{room.host.username ?? room.host.name}</span>
        </p>
        <div className="flex -space-x-1.5 mt-1.5">
          {Array.from({ length: Math.min(4, room._count.members) }).map((_, i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-linear-to-br from-violet-500 to-fuchsia-500 border border-neutral-900" />
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-lg font-extrabold text-white font-sans leading-none">
          30
        </div>
        <button className="w-6 h-6 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
          <Bell className="w-3 h-3 text-neutral-500" />
        </button>
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────── */
function Empty({ label, onCreateRoom }: { label: string; onCreateRoom?: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-10 gap-3">
      <p className="text-sm text-neutral-600 font-sans">{label}</p>
      {onCreateRoom && (
        <button onClick={onCreateRoom}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold text-white transition-colors font-sans">
          <Plus className="w-3.5 h-3.5" /> Create a Room
        </button>
      )}
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────── */
export function RoomsContent({
  user,
  filters,
  refreshKey,
  onCreateRoom,
}: {
  user: { id: string };
  filters: RoomFilters;
  refreshKey: number;
  onCreateRoom: () => void;
}) {
  const [rooms, setRooms]     = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const prevKey = useRef<string>("");

  useEffect(() => {
    const key = `${filters.type}|${filters.privacy}|${filters.search}|${refreshKey}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    setLoading(true);
    const params = new URLSearchParams({
      type:    filters.type,
      privacy: filters.privacy,
      search:  filters.search,
      take:    "30",
    });
    fetch(`/api/rooms?${params}`)
      .then((r) => r.json())
      .then((d) => setRooms(d.rooms ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters, refreshKey]);

  const featured   = rooms.filter((r) => r.status === "LIVE").slice(0, 5);
  const liveRooms  = rooms.filter((r) => r.status === "LIVE");
  const upcoming   = rooms.filter((r) => r.status === "SCHEDULED");
  const myRooms    = rooms.filter((r) => r.host.id === user.id);

  // When a specific filter is selected show flat grid
  const isFiltered = filters.type !== "all" || filters.privacy !== "all" || filters.search !== "";

  return (
    <main className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide min-w-0">
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="w-full h-56" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        </div>
      ) : isFiltered ? (
        /* ── Filtered flat grid ── */
        <section>
          <SectionHeader label={`Rooms (${rooms.length})`} />
          {rooms.length === 0 ? (
            <Empty label="No rooms match your filters." onCreateRoom={onCreateRoom} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {rooms.map((r) => <RoomCard key={r.id} room={r} />)}
            </div>
          )}
        </section>
      ) : (
        /* ── Default sectioned view ── */
        <div className="space-y-7">

          {/* Featured hero */}
          {featured.length > 0 && (
            <section>
              <SectionHeader label="Featured Rooms" />
              <FeaturedHero rooms={featured} />
            </section>
          )}

          {/* Live Now */}
          <section>
            <SectionHeader label="Live Now" />
            {liveRooms.length === 0 ? (
              <Empty label="No rooms are live right now." onCreateRoom={onCreateRoom} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {liveRooms.map((r) => <RoomCard key={r.id} room={r} />)}
              </div>
            )}
          </section>

          {/* My Rooms */}
          {myRooms.length > 0 && (
            <section>
              <SectionHeader label="My Rooms" action="See all" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {myRooms.slice(0, 5).map((r) => <RoomCard key={r.id} room={r} />)}
              </div>
            </section>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <SectionHeader label="Upcoming" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {upcoming.slice(0, 8).map((r) => <UpcomingCard key={r.id} room={r} />)}
              </div>
            </section>
          )}

          {/* All empty */}
          {rooms.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-sm text-neutral-500 font-sans">No rooms yet — be the first!</p>
              <button onClick={onCreateRoom}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-bold text-white transition-colors font-sans shadow-lg shadow-violet-500/20">
                <Plus className="w-4 h-4" /> Create a Room
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
