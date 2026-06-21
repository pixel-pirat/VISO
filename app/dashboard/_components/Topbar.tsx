"use client";

import { Bell, Smile, Plus, Search } from "lucide-react";

type User = { name: string | null; email: string; image?: string | null };

interface TopbarProps {
  user: User;
  unreadCount: number;
  onCreateRoom?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function Topbar({ user, unreadCount, onCreateRoom, searchValue, onSearchChange }: TopbarProps) {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-4 px-6 border-b border-neutral-800/60 bg-[#111113]">
      <div className="min-w-0">
        <h1 className="text-sm font-extrabold text-white font-sans truncate">Welcome back, {firstName}</h1>
        <p className="text-[11px] text-neutral-500 font-sans">{today}</p>
      </div>

      <div className="flex-1 max-w-xs relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600" />
        <input
          type="text"
          placeholder="Search room"
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-neutral-800/60 border border-neutral-700/60 hover:border-neutral-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 rounded-xl text-xs text-neutral-200 placeholder-neutral-600 outline-none transition-all font-sans"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button className="w-8 h-8 rounded-lg bg-neutral-800/60 hover:bg-neutral-700/60 flex items-center justify-center transition-colors relative">
          <Bell className="w-4 h-4 text-neutral-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-violet-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center font-sans">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <button className="w-8 h-8 rounded-lg bg-neutral-800/60 hover:bg-neutral-700/60 flex items-center justify-center transition-colors">
          <Smile className="w-4 h-4 text-neutral-400" />
        </button>
        <button
          onClick={onCreateRoom}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold text-white transition-colors shadow-lg shadow-violet-500/20 font-sans"
        >
          <Plus className="w-3.5 h-3.5" /> Create Room
        </button>
      </div>
    </header>
  );
}
