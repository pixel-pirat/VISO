"use client";

import { Globe, Lock, Settings, Maximize2, Minimize2, UserPlus, LogOut, Radio, Users } from "lucide-react";
import type { RoomInfo } from "../page";

interface RoomTopBarProps {
  roomInfo:         RoomInfo;
  participantCount: number;
  isHost:           boolean;
  theatreMode:      boolean;
  onToggleTheatre:  () => void;
  onLeave:          () => void;
}

export function RoomTopBar({ roomInfo, participantCount, isHost, theatreMode, onToggleTheatre, onLeave }: RoomTopBarProps) {
  return (
    <header className="h-12 shrink-0 flex items-center justify-between gap-4 px-4 border-b border-neutral-800/60 bg-[#0d0d0f]">
      {/* left — title */}
      <div className="flex items-center gap-3 min-w-0">
        {roomInfo.visibility === "PRIVATE"
          ? <Lock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          : <Globe className="w-3.5 h-3.5 text-neutral-500 shrink-0" />}
        <h1 className="text-sm font-bold text-white font-sans truncate">
          {roomInfo.contentTitle ?? roomInfo.name}
        </h1>
      </div>

      {/* centre — status badges */}
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
      <div className="flex items-center gap-2 shrink-0">
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white transition-colors font-sans">
          <UserPlus className="w-3.5 h-3.5" /> Invite
        </button>
        {isHost && (
          <button className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
            <Settings className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        )}
        <button onClick={onToggleTheatre}
          className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors"
          title={theatreMode ? "Exit Theatre Mode" : "Theatre Mode"}>
          {theatreMode
            ? <Minimize2 className="w-3.5 h-3.5 text-neutral-400" />
            : <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />}
        </button>
        <button onClick={onLeave}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white transition-colors font-sans shadow-lg shadow-red-500/20">
          <LogOut className="w-3.5 h-3.5" /> Leave Room
        </button>
      </div>
    </header>
  );
}
