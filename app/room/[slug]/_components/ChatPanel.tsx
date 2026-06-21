"use client";

import { useEffect, useRef } from "react";
import { Send, UserPlus, Pin } from "lucide-react";
import type { ChatMessage } from "./LiveRoom";
import type { RoomInfo } from "../page";

const AVATAR_G = ["from-violet-500 to-fuchsia-500","from-blue-500 to-cyan-500","from-emerald-500 to-teal-500","from-orange-500 to-rose-500","from-pink-500 to-fuchsia-500"];
function ag(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_G[h % AVATAR_G.length];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const QUICK_REACTIONS = ["❤️","😂","🔥","😮","👏","➕"] as const;

interface ChatPanelProps {
  messages:         ChatMessage[];
  input:            string;
  setInput:         (v: string) => void;
  onSend:           () => void;
  participantCount: number;
  activeTab:        "chat" | "polls" | "qa";
  setActiveTab:     (t: "chat" | "polls" | "qa") => void;
  roomInfo:         RoomInfo;
  currentUserId:    string;
}

export function ChatPanel({
  messages, input, setInput, onSend, participantCount,
  activeTab, setActiveTab, roomInfo, currentUserId,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  return (
    <aside className="w-[260px] shrink-0 flex flex-col h-full bg-[#0a0a0c] border-l border-neutral-800/60">

      {/* header */}
      <div className="px-4 py-3 border-b border-neutral-800/60 shrink-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-sm font-bold text-white font-sans">Room Chat</h3>
          <div className="flex items-center gap-2">
            <button title="Add member" className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
              <UserPlus className="w-3 h-3 text-neutral-400" />
            </button>
            <button title="Pin" className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
              <Pin className="w-3 h-3 text-neutral-400" />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-neutral-500 font-sans">{participantCount.toLocaleString()} members</p>
      </div>

      {/* pinned message */}
      <div className="mx-3 mt-3 mb-1 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl shrink-0">
        <p className="text-[9px] font-bold text-violet-400 uppercase tracking-wider font-sans flex items-center gap-1 mb-1">
          <Pin className="w-2.5 h-2.5" /> Pinned Message
        </p>
        <p className="text-[10px] text-neutral-300 font-sans">No spoilers! Let everyone enjoy the show 🎬</p>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-2 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender.id === currentUserId;
          return (
            <div key={msg.id} className="flex items-start gap-2 group">
              <div className={`w-7 h-7 rounded-full bg-linear-to-br ${ag(msg.sender.id)} flex items-center justify-center text-white text-[9px] font-bold shrink-0 overflow-hidden mt-0.5`}>
                {msg.sender.image
                  ? <img src={msg.sender.image} alt="" className="w-full h-full object-cover" />  // eslint-disable-line @next/next/no-img-element
                  : msg.sender.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={`text-[10px] font-bold font-sans ${isMe ? "text-violet-400" : "text-neutral-300"}`}>
                    {msg.sender.name ?? msg.sender.username ?? "User"}
                  </span>
                  <span className="text-[9px] text-neutral-700 font-sans">{fmtTime(msg.createdAt)}</span>
                </div>
                <p className="text-xs text-neutral-400 font-sans leading-snug mt-0.5">{msg.text}</p>

                {/* reaction counts on messages (placeholder) */}
                <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {["❤️","😂"].map((e) => (
                    <button key={e} className="text-[10px] px-1 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors">
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* quick reactions */}
      <div className="px-3 py-2 border-t border-neutral-800/60 shrink-0 flex items-center justify-between">
        {QUICK_REACTIONS.map((e) => (
          <button key={e} className="text-base hover:scale-125 transition-transform">{e}</button>
        ))}
      </div>

      {/* input */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message everyone…"
            className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 rounded-xl text-xs text-white placeholder-neutral-600 outline-none transition-all font-sans"
          />
          <button
            onClick={onSend}
            disabled={!input.trim()}
            className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0">
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* tabs */}
      <div className="flex border-t border-neutral-800/60 shrink-0">
        {(["Chat", "Polls", "Q&A"] as const).map((tab) => {
          const key = tab.toLowerCase().replace("&", "") as "chat" | "polls" | "qa";
          return (
            <button key={tab} onClick={() => setActiveTab(key)}
              className={`flex-1 py-2.5 text-[10px] font-bold font-sans transition-colors ${
                activeTab === key ? "text-violet-400 border-b-2 border-violet-500" : "text-neutral-600 hover:text-neutral-400"
              }`}>
              {tab}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
