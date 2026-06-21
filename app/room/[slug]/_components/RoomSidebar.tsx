"use client";

import Link from "next/link";
import { ChevronLeft, Mic, MicOff, Video, VideoOff, UserPlus, Radio } from "lucide-react";
import type { RoomInfo } from "../page";
import type { RoomParticipant } from "./LiveRoom";

const AVATAR_G = ["from-violet-500 to-fuchsia-500","from-blue-500 to-cyan-500","from-emerald-500 to-teal-500","from-orange-500 to-rose-500","from-pink-500 to-fuchsia-500"];
function ag(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_G[h % AVATAR_G.length];
}

interface RoomSidebarProps {
  roomInfo:      RoomInfo;
  participants:  RoomParticipant[];
  isHost:        boolean;
  currentUserId: string;
  lkConnected:   boolean;
}

export function RoomSidebar({ roomInfo, participants, isHost, currentUserId, lkConnected }: RoomSidebarProps) {
  const audioCount = participants.filter((p) => !p.isMuted).length;

  return (
    <aside className="w-[200px] shrink-0 flex flex-col h-full bg-[#0a0a0c] border-r border-neutral-800/60 overflow-hidden">
      {/* back link + room info */}
      <div className="p-3 border-b border-neutral-800/60 shrink-0">
        <Link href={`/dashboard/rooms/${roomInfo.slug}`}
          className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors font-sans mb-3">
          <ChevronLeft className="w-3 h-3" /> Back to Rooms
        </Link>

        {/* cover + title */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-neutral-800 mb-2">
          {roomInfo.coverUrl
            ? <img src={roomInfo.coverUrl} alt="" className="w-full h-full object-cover opacity-80" />  // eslint-disable-line @next/next/no-img-element
            : <div className="w-full h-full bg-linear-to-br from-violet-900 to-indigo-950 flex items-center justify-center">
                <Video className="w-6 h-6 text-neutral-600" />
              </div>}
          {roomInfo.status === "LIVE" && (
            <span className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded text-white text-[8px] font-bold font-sans">
              <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
        </div>

        <p className="text-xs font-bold text-white font-sans leading-tight">{roomInfo.name}</p>
        {roomInfo.contentTitle && (
          <p className="text-[10px] text-neutral-500 font-sans mt-0.5">{roomInfo.contentTitle}</p>
        )}
      </div>

      {/* participants list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-600 font-sans mb-2">
          Participants ({participants.length})
        </p>
        {participants.map((p) => (
          <div key={p.identity}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${p.isSpeaking ? "bg-violet-500/10" : ""}`}>
            <div className={`w-6 h-6 rounded-full bg-linear-to-br ${ag(p.identity)} flex items-center justify-center text-white text-[9px] font-bold shrink-0 relative`}>
              {p.name[0]?.toUpperCase() ?? "?"}
              {p.isHost && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-violet-500 rounded-full border border-[#0a0a0c] flex items-center justify-center">
                  <span className="text-[6px] text-white font-bold">H</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-white font-sans truncate flex items-center gap-1">
                {p.name}
                {p.isLocal && <span className="text-violet-400 text-[8px]">You</span>}
              </p>
              {p.isSpeaking && (
                <div className="flex gap-0.5 mt-0.5">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-0.5 bg-violet-400 rounded-full animate-pulse"
                      style={{ height: `${4 + i * 2}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {p.isMuted
                ? <MicOff  className="w-3 h-3 text-neutral-600" />
                : <Mic     className="w-3 h-3 text-violet-400" />}
            </div>
          </div>
        ))}
      </div>

      {/* invite friends button */}
      <div className="p-3 border-t border-neutral-800/60 shrink-0">
        <button className="w-full flex items-center justify-center gap-1.5 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 rounded-xl text-[10px] font-bold text-violet-300 hover:text-violet-200 transition-colors font-sans">
          <UserPlus className="w-3 h-3" /> Invite Friends
        </button>
      </div>

      {/* voice chat status */}
      <div className="px-3 pb-3 shrink-0">
        <div className={`flex items-center gap-1.5 text-[9px] font-semibold font-sans ${lkConnected ? "text-emerald-400" : "text-neutral-600"}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${lkConnected ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"}`} />
          {lkConnected ? "Voice Connected" : "Connecting…"}
        </div>
        {audioCount > 0 && (
          <p className="text-[9px] text-neutral-600 font-sans mt-0.5">{audioCount} {audioCount === 1 ? "person" : "people"} in voice</p>
        )}
      </div>
    </aside>
  );
}
