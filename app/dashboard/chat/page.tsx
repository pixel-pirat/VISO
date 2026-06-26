"use client";

import { Suspense } from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2, Send, MessageSquare, ArrowLeft } from "lucide-react";
import { Sidebar } from "../_components/Sidebar";
import { Topbar } from "../_components/Topbar";

const AVATAR_G = ["from-violet-500 to-fuchsia-500","from-blue-500 to-cyan-500","from-emerald-500 to-teal-500","from-orange-500 to-rose-500","from-pink-500 to-fuchsia-500"];
function ag(id: string) { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return AVATAR_G[h%AVATAR_G.length]; }

type FUser = { id: string; name: string|null; username: string|null; image: string|null; status: string };
type Friendship = { id: string; requesterId: string; addresseeId: string; requester: FUser; addressee: FUser };

type ChatMsg = {
  id: string; text: string; createdAt: string;
  sender: { id: string; name: string|null; username: string|null; image: string|null };
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ user, size = "md" }: { user: { id: string; name: string|null; image: string|null }; size?: "sm"|"md" }) {
  const s = size === "sm" ? "w-7 h-7 text-[9px]" : "w-9 h-9 text-xs";
  return (
    <div className={`${s} rounded-full bg-linear-to-br ${ag(user.id)} flex items-center justify-center text-white font-bold shrink-0 overflow-hidden`}>
      {user.image
        ? <img src={user.image} alt="" className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
        : user.name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function ChatPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();

  const [friends,      setFriends]      = useState<Friendship[]>([]);
  const [loadingFriends, setLF]         = useState(true);
  const [activeRoom,   setActiveRoom]   = useState<string | null>(searchParams.get("room"));
  const [activeFriend, setActiveFriend] = useState<FUser | null>(null);
  const [messages,     setMessages]     = useState<ChatMsg[]>([]);
  const [input,        setInput]        = useState("");
  const [sending,      setSending]      = useState(false);
  const [openingDM,    setOpeningDM]    = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef     = useRef<EventSource | null>(null);

  useEffect(() => { if (!isPending && !session) router.push("/login"); }, [session, isPending, router]);

  // Load friends list
  useEffect(() => {
    if (!session) return;
    fetch("/api/friends")
      .then(r => r.json())
      .then(d => { setFriends(d.accepted ?? []); setLF(false); })
      .catch(() => setLF(false));
  }, [session]);

  // Open a DM with a friend
  const openDM = useCallback(async (friend: FUser) => {
    setOpeningDM(friend.id);
    const res  = await fetch("/api/friends/dm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendId: friend.id }) });
    const data = await res.json();
    setOpeningDM(null);
    if (data.slug) {
      setActiveRoom(data.slug);
      setActiveFriend(friend);
      router.replace(`/dashboard/chat?room=${data.slug}`, { scroll: false });
    }
  }, [router]);

  // Auto-open room from URL param
  useEffect(() => {
    const roomParam = searchParams.get("room");
    if (roomParam && session && friends.length > 0 && !activeFriend) {
      // Find friend from DM slug  dm-{a}-{b}
      const parts = roomParam.split("-");
      if (parts.length >= 3) {
        const slugA = parts[1]; const slugB = parts[2];
        const uid = session.user.id.slice(0, 8);
        const friendSlug = slugA === uid ? slugB : slugA;
        const found = friends.find(f => {
          const other = f.requesterId === session.user.id ? f.addressee : f.requester;
          return other.id.slice(0, 8) === friendSlug;
        });
        if (found) {
          const other = found.requesterId === session.user.id ? found.addressee : found.requester;
          setActiveFriend(other);
          setActiveRoom(roomParam);
        }
      }
    }
  }, [searchParams, session, friends, activeFriend]);

  // SSE: connect to chat stream when room changes
  useEffect(() => {
    esRef.current?.close();
    if (!activeRoom) return;

    setMessages([]);
    const es = new EventSource(`/api/room/${activeRoom}/chat`);
    esRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "history")  setMessages(data.messages);
      if (data.type === "message")  setMessages(prev => [...prev, data.message]);
    };
    es.onerror = () => es.close();

    return () => { es.close(); esRef.current = null; };
  }, [activeRoom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !activeRoom || sending) return;
    setInput("");
    setSending(true);
    await fetch(`/api/room/${activeRoom}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setSending(false);
  };

  if (isPending || !session) {
    return <div className="min-h-screen flex items-center justify-center bg-[#111113]"><Loader2 className="w-7 h-7 text-violet-500 animate-spin" /></div>;
  }

  const currentUserId = session.user.id;

  return (
    <div className="flex h-screen bg-[#111113] text-neutral-200 overflow-hidden">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={session.user} unreadCount={0} />

        <div className="flex flex-1 min-h-0">
          {/* ── Left: friends list ── */}
          <aside className="w-[260px] shrink-0 flex flex-col border-r border-neutral-800/60 bg-[#0e0e10]">
            <div className="px-4 py-3 border-b border-neutral-800/60 shrink-0">
              <h2 className="text-sm font-bold text-white font-sans">Messages</h2>
              <p className="text-[10px] text-neutral-600 font-sans mt-0.5">Direct messages with friends</p>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
              {loadingFriends ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-violet-500 animate-spin" /></div>
              ) : friends.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2 px-4 text-center">
                  <MessageSquare className="w-8 h-8 text-neutral-700" />
                  <p className="text-xs text-neutral-600 font-sans">No friends yet</p>
                  <button onClick={() => router.push("/dashboard/friends")}
                    className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold font-sans mt-1">
                    Find friends →
                  </button>
                </div>
              ) : (
                friends.map(f => {
                  const friend = f.requesterId === currentUserId ? f.addressee : f.requester;
                  const isActive = activeFriend?.id === friend.id;
                  return (
                    <button key={f.id} onClick={() => openDM(friend)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-800/50 transition-colors ${isActive ? "bg-neutral-800" : ""}`}>
                      <div className="relative shrink-0">
                        <Avatar user={friend} />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0e0e10] ${
                          friend.status === "ONLINE" ? "bg-emerald-500" : friend.status === "IDLE" ? "bg-yellow-500" : "bg-neutral-600"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-semibold text-white font-sans truncate">{friend.name}</p>
                        <p className="text-[10px] text-neutral-600 font-sans capitalize">
                          {openingDM === friend.id ? "Opening…" : friend.status.toLowerCase().replace("_"," ")}
                        </p>
                      </div>
                      {openingDM === friend.id && <Loader2 className="w-3 h-3 text-violet-500 animate-spin shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── Right: chat pane ── */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {!activeFriend ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <MessageSquare className="w-12 h-12 text-neutral-700" />
                <p className="text-sm text-neutral-500 font-sans">Select a friend to start chatting</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-neutral-800/60">
                  <button onClick={() => { setActiveFriend(null); setActiveRoom(null); router.replace("/dashboard/chat", { scroll: false }); }}
                    className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors sm:hidden">
                    <ArrowLeft className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                  <Avatar user={activeFriend} />
                  <div>
                    <p className="text-sm font-bold text-white font-sans">{activeFriend.name}</p>
                    <p className="text-[10px] font-sans capitalize" style={{ color: activeFriend.status === "ONLINE" ? "#34d399" : "#6b7280" }}>
                      {activeFriend.status.toLowerCase().replace("_"," ")}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <Avatar user={activeFriend} size="md" />
                      <p className="text-sm text-neutral-500 font-sans">Say hi to <span className="text-white font-semibold">{activeFriend.name}</span></p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender.id === currentUserId;
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                          {!isMe && <Avatar user={msg.sender} size="sm" />}
                          <div className={`max-w-xs rounded-2xl px-3.5 py-2 ${
                            isMe
                              ? "bg-violet-600 rounded-br-sm text-white"
                              : "bg-neutral-800 rounded-bl-sm text-neutral-200"
                          }`}>
                            <p className="text-sm font-sans leading-relaxed">{msg.text}</p>
                            <p className={`text-[9px] mt-0.5 font-sans ${isMe ? "text-violet-300" : "text-neutral-600"} text-right`}>
                              {fmtTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 px-4 py-3 border-t border-neutral-800/60">
                  <div className="flex items-center gap-2">
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder={`Message ${activeFriend.name}…`}
                      className="flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 rounded-xl text-sm text-white placeholder-neutral-600 outline-none font-sans"
                    />
                    <button onClick={sendMessage} disabled={!input.trim() || sending}
                      className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0">
                      {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#111113]">
        <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}
