"use client";

import { useState } from "react";
import {
  Globe, Lock, MessageSquare, Mic, Video, CheckCircle2,
  Calendar, Clock, Users, Play, Share2, Pencil, Trash2,
  ChevronLeft, Radio, Copy, Check,
} from "lucide-react";
import Link from "next/link";
import type { RoomDetailData } from "../_types";

const GRADIENTS = [
  "from-violet-900 to-indigo-950", "from-purple-900 to-violet-950",
  "from-blue-900 to-sky-950",      "from-rose-900 to-pink-950",
  "from-teal-900 to-emerald-950",  "from-orange-900 to-amber-950",
];
function grad(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}
const AVATAR_G = ["from-violet-500 to-fuchsia-500","from-blue-500 to-cyan-500","from-emerald-500 to-teal-500","from-orange-500 to-rose-500","from-pink-500 to-fuchsia-500"];
function avatarG(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_G[h % AVATAR_G.length];
}

function commLabel(room: RoomDetailData) {
  const on = [room.commChat && "Chat", room.commAudio && "Audio", room.commVideo && "Video"].filter(Boolean) as string[];
  return on.length > 1 ? "Enabled" : on[0] ?? null;
}
function commColor(room: RoomDetailData) {
  const on = [room.commChat, room.commAudio, room.commVideo].filter(Boolean).length;
  return on > 1 ? "text-emerald-400" : "text-violet-400";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 font-sans mb-0.5">{label}</p>
      <div className="text-sm text-neutral-200 font-sans">{value}</div>
    </div>
  );
}

export function RoomDetail({
  room, myRole, isHost, currentUserId, onEdit, onDelete,
}: {
  room: RoomDetailData;
  myRole: string | null;
  isHost: boolean;
  currentUserId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const cover   = room.coverUrl ?? null;
  const g       = grad(room.id);
  const isLive  = room.status === "LIVE";
  const isSched = room.status === "SCHEDULED";
  const comm    = commLabel(room);
  const commCls = commColor(room);

  const inviteUrl = typeof window !== "undefined" && room.inviteToken
    ? `${window.location.origin}/room/${room.slug}?invite=${room.inviteToken}`
    : null;

  const copyLink = () => {
    if (inviteUrl) { navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  // progress %
  const dur = room.playbackState?.roomContent?.content.duration ?? 0;
  const cur = room.playbackState?.currentTime ?? 0;
  const pct = dur > 0 ? Math.min(100, Math.round((cur / dur) * 100)) : 0;

  // friends in room (all members except host, up to 6 shown)
  const friendsInRoom = room.members.filter((m) => m.userId !== room.hostId);

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

      {/* ── breadcrumb ── */}
      <Link href="/dashboard/rooms"
        className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors font-sans">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to Rooms
      </Link>

      {/* ── hero banner ── */}
      <div className={`relative w-full rounded-2xl overflow-hidden bg-linear-to-br ${g}`} style={{ minHeight: 260 }}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={room.name} className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/50 to-transparent" />

        {/* status badges */}
        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
          {isLive && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 rounded-lg text-white text-[10px] font-bold font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" /> LIVE
            </span>
          )}
          {isSched && (
            <span className="px-2.5 py-1 bg-amber-500/90 rounded-lg text-white text-[10px] font-bold font-sans">UPCOMING</span>
          )}
          <span className="flex items-center gap-1 text-[10px] bg-black/40 px-2 py-1 rounded-lg text-neutral-300 font-sans">
            <Users className="w-3 h-3" /> {room._count.members.toLocaleString()} watching
          </span>
        </div>

        {/* host actions — top right */}
        {isHost && (
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl text-xs font-semibold text-white transition-colors font-sans border border-white/10">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 backdrop-blur rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 transition-colors font-sans border border-red-500/20">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        )}

        {/* content */}
        <div className="relative z-10 p-8 pt-16">
          {room.contentTitle && (
            <p className="text-xs text-violet-300 font-semibold font-sans mb-1 uppercase tracking-wider">{room.contentTitle}</p>
          )}
          <h1 className="text-3xl font-extrabold text-white font-sans leading-tight mb-2">{room.name}</h1>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            <div className={`w-7 h-7 rounded-full bg-linear-to-br ${avatarG(room.host.id)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
              {room.host.name?.[0] ?? "H"}
            </div>
            <span className="text-sm text-neutral-300 font-sans">
              Hosted by <span className="text-violet-400 font-semibold">{room.host.username ?? room.host.name}</span>
            </span>
          </div>

          {/* meta pills */}
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-lg text-[10px] text-neutral-300 font-sans">
              {room.visibility === "PRIVATE" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {room.visibility === "PRIVATE" ? "Private" : "Public"}
            </span>
            {comm && (
              <span className={`flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-lg text-[10px] font-semibold font-sans ${commCls}`}>
                <CheckCircle2 className="w-3 h-3" /> {comm}
              </span>
            )}
            {isSched && room.scheduledAt && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 rounded-lg text-[10px] text-amber-300 font-sans">
                <Calendar className="w-3 h-3" />
                {new Date(room.scheduledAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          {/* progress bar */}
          {pct > 0 && (
            <div className="mt-4 max-w-sm">
              <div className="flex items-center justify-between text-[10px] text-neutral-500 font-sans mb-1">
                <span>Progress</span><span>{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full">
                <div className="h-1.5 bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── two-column body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── left column ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* room info card */}
          <div className="bg-neutral-900/60 border border-neutral-800/60 rounded-2xl p-5 grid grid-cols-2 gap-5">
            <InfoRow label="Room Type"
              value={
                <span className="flex items-center gap-1.5">
                  {room.visibility === "PRIVATE" ? <Lock className="w-3.5 h-3.5 text-neutral-500" /> : <Globe className="w-3.5 h-3.5 text-neutral-500" />}
                  {room.visibility === "PRIVATE" ? "Private" : "Public"}
                </span>
              }
            />
            <InfoRow label="Communication"
              value={<span className={`font-semibold ${commCls}`}>{comm ?? "—"}</span>}
            />
            <InfoRow label="Created"
              value={
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  {new Date(room.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
                </span>
              }
            />
            <InfoRow label="Status"
              value={
                <span className={`font-semibold ${isLive ? "text-red-400" : isSched ? "text-amber-400" : "text-neutral-500"}`}>
                  {isLive ? "Live" : isSched ? "Scheduled" : "Ended"}
                </span>
              }
            />
            {/* comm detail row */}
            <div className="col-span-2 pt-3 border-t border-neutral-800/60">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 font-sans mb-2">Communication Options</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { icon: MessageSquare, label: "Chat",  on: room.commChat  },
                  { icon: Mic,           label: "Audio", on: room.commAudio },
                  { icon: Video,         label: "Video", on: room.commVideo },
                ].map(({ icon: Icon, label, on }) => (
                  <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-sans border ${
                    on ? "bg-violet-600/15 border-violet-500/40 text-violet-300" : "bg-neutral-800/60 border-neutral-700 text-neutral-600"
                  }`}>
                    <Icon className="w-3 h-3" /> {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* friends in room */}
          {friendsInRoom.length > 0 && (
            <div className="bg-neutral-900/60 border border-neutral-800/60 rounded-2xl p-5">
              <p className="text-xs font-bold text-white font-sans mb-3">
                Friends in the Room ({friendsInRoom.length})
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {friendsInRoom.slice(0, 8).map((m) => (
                  <div key={m.id} title={m.user.name ?? m.user.username ?? "User"}
                    className={`w-9 h-9 rounded-full bg-linear-to-br ${avatarG(m.userId)} flex items-center justify-center text-white text-xs font-bold font-sans border-2 border-[#111113] overflow-hidden`}>
                    {m.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.user.image} alt="" className="w-full h-full object-cover" />
                    ) : (m.user.name?.[0] ?? "?")}
                  </div>
                ))}
                {friendsInRoom.length > 8 && (
                  <div className="w-9 h-9 rounded-full bg-neutral-800 border-2 border-[#111113] flex items-center justify-center text-[10px] font-bold text-neutral-400 font-sans">
                    +{friendsInRoom.length - 8}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* chat preview */}
          {room.messages.length > 0 && (
            <div className="bg-neutral-900/60 border border-neutral-800/60 rounded-2xl p-5">
              <p className="text-xs font-bold text-white font-sans mb-3">Chat Preview</p>
              <div className="space-y-3 max-h-52 overflow-y-auto scrollbar-hide">
                {[...room.messages].reverse().map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full bg-linear-to-br ${avatarG(msg.sender.id)} shrink-0 flex items-center justify-center text-white text-[9px] font-bold overflow-hidden`}>
                      {msg.sender.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={msg.sender.image} alt="" className="w-full h-full object-cover" />
                      ) : msg.sender.name?.[0] ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-violet-400 font-sans">{msg.sender.name ?? msg.sender.username}</p>
                      <p className="text-xs text-neutral-400 font-sans leading-snug">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── right column — about + actions ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* about card */}
          <div className="bg-neutral-900/60 border border-neutral-800/60 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-bold text-white font-sans">About Room</p>

            <InfoRow label="Room Name"    value={room.name} />
            {room.contentTitle && <InfoRow label="Movie Title" value={room.contentTitle} />}
            {room.description && (
              <InfoRow label="Description"
                value={<span className="text-neutral-400 text-xs leading-relaxed">{room.description}</span>}
              />
            )}
            <InfoRow label="Host"
              value={
                <span className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full bg-linear-to-br ${avatarG(room.host.id)} flex items-center justify-center text-white text-[8px] font-bold`}>
                    {room.host.name?.[0]}
                  </div>
                  <span className="text-violet-400 font-semibold">{room.host.username ?? room.host.name}</span>
                </span>
              }
            />
            {room.scheduledAt && isSched && (
              <InfoRow label="Scheduled for"
                value={
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(room.scheduledAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                }
              />
            )}
          </div>

          {/* content queued */}
          {room.roomContents.length > 0 && (
            <div className="bg-neutral-900/60 border border-neutral-800/60 rounded-2xl p-5">
              <p className="text-xs font-bold text-white font-sans mb-3">Content Queue</p>
              <div className="space-y-2">
                {room.roomContents.map((rc) => (
                  <div key={rc.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-800 shrink-0 overflow-hidden flex items-center justify-center">
                      {rc.content.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={rc.content.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : <Play className="w-4 h-4 text-neutral-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate font-sans">{rc.content.title}</p>
                      <p className="text-[10px] text-neutral-500 font-sans capitalize">{rc.content.type.toLowerCase()} · {rc.status.toLowerCase()}</p>
                    </div>
                    {rc.status === "PLAYING" && (
                      <Radio className="w-3.5 h-3.5 text-red-400 shrink-0 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* action buttons */}
          <div className="flex flex-col gap-2.5">
            <Link href={`/room/${room.slug}`}
              className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-bold text-white transition-colors font-sans shadow-lg shadow-violet-500/20">
              <Play className="w-4 h-4 fill-white" /> Join Room
            </Link>
            <button onClick={copyLink}
              className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm font-semibold text-neutral-300 hover:text-white transition-colors font-sans border border-neutral-700">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              {copied ? "Link Copied!" : "Share Room"}
            </button>
          </div>

          {/* host-only quick actions */}
          {isHost && (
            <div className="bg-neutral-900/60 border border-violet-500/20 rounded-2xl p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 font-sans mb-3">Host Controls</p>
              <button onClick={onEdit}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm font-semibold text-neutral-300 hover:text-white transition-colors font-sans">
                <Pencil className="w-4 h-4 text-violet-400" /> Edit Room Details
              </button>
              <button onClick={onDelete}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 transition-colors font-sans border border-red-500/20">
                <Trash2 className="w-4 h-4" /> Delete Room
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
