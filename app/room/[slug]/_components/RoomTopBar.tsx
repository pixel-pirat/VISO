"use client";

import Link from "next/link";
import { Globe, Lock, Settings, Maximize2, Minimize2, UserPlus, LogOut, Users, Check, MessageSquare } from "lucide-react";
import type { RoomInfo } from "../page";

interface RoomTopBarProps {
  roomInfo:         RoomInfo;
  participantCount: number;
  isHost:           boolean;
  theatreMode:      boolean;
  onToggleTheatre:  () => void;
  onLeave:          () => void;
  onInvite:         () => void;
  invited:          boolean;
  onOpenPeople:     () => void;
  onOpenChat:       () => void;
}

export function RoomTopBar({
  roomInfo, participantCount, isHost, theatreMode, onToggleTheatre, onLeave, onInvite, invited,
  onOpenPeople, onOpenChat,
}: RoomTopBarProps) {
  return (
    <header className="h-12 shrink-0 flex items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4 border-b border-neutral-800/60 bg-[#0d0d0f]">
      {/* left — title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {roomInfo.visibility === "PRIVATE"
          ? <Lock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          : <Globe className="w-3.5 h-3.5 text-neutral-500 shrink-0" />}
        <h1 className="text-sm font-bold text-white font-sans truncate">
          {roomInfo.contentTitle ?? roomInfo.name}
        </h1>
      </div>

      {/* centre — status badges (desktop only) */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        {roomInfo.status === "LIVE" && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500 rounded text-white text-[9px] font-bold font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" /> LIVE
          </span>
        )}
        <span className="flex items-center gap-1 text-[10px] text-neutral-400 font-sans">
          <Users className="w-3 h-3" /> {participantCount.toLocaleString()} watching
        </span>
        <span className="flex items-center gap-1 text-[10px] text-neutral-500 font-sans">
          {roomInfo.visibility === "PRIVATE" ? "Private Room" : "Public Room"}
        </span>
      </div>

      {/* right — actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Mobile-only: open participants / chat sheets */}
        <button onClick={onOpenPeople} title="Participants"
          className="md:hidden relative w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
          <Users className="w-3.5 h-3.5 text-neutral-400" />
          <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 bg-violet-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center font-sans">
            {participantCount > 99 ? "99+" : participantCount}
          </span>
        </button>
        <button onClick={onOpenChat} title="Chat"
          className="md:hidden w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
          <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
        </button>

        <button onClick={onInvite}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white transition-colors font-sans">
          {invited
            ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> <span className="hidden sm:inline">Copied!</span></>
            : <><UserPlus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Invite</span></>}
        </button>
        {isHost && (
          <Link href={`/dashboard/rooms/${roomInfo.slug}`} title="Room settings"
            className="w-7 h-7 sm:w-7 sm:h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors shrink-0">
            <Settings className="w-3.5 h-3.5 text-neutral-400" />
          </Link>
        )}
        <button onClick={onToggleTheatre}
          className="hidden sm:flex w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 items-center justify-center transition-colors"
          title={theatreMode ? "Exit Theatre Mode" : "Theatre Mode"}>
          {theatreMode
            ? <Minimize2 className="w-3.5 h-3.5 text-neutral-400" />
            : <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />}
        </button>
        <button onClick={onLeave}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white transition-colors font-sans shadow-lg shadow-red-500/20">
          <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Leave Room</span>
        </button>
      </div>
    </header>
  );
}
