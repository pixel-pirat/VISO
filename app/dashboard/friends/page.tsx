"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2, Search, UserPlus, UserCheck, UserX, MessageSquare, X } from "lucide-react";
import { Sidebar } from "../_components/Sidebar";
import { Topbar } from "../_components/Topbar";

const AVATAR_G = ["from-violet-500 to-fuchsia-500","from-blue-500 to-cyan-500","from-emerald-500 to-teal-500","from-orange-500 to-rose-500","from-pink-500 to-fuchsia-500"];
function ag(id: string) { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return AVATAR_G[h%AVATAR_G.length]; }

type FUser = { id: string; name: string|null; username: string|null; image: string|null; status: string };
type Friendship = { id: string; requesterId: string; addresseeId: string; status: string; requester: FUser; addressee: FUser };
type SearchUser = FUser & { friendshipId: string|null; friendshipStatus: string|null };

const STATUS_COLOR: Record<string, string> = {
  ONLINE: "bg-emerald-500", IDLE: "bg-yellow-500",
  DO_NOT_DISTURB: "bg-red-500", OFFLINE: "bg-neutral-600",
};

function Avatar({ user }: { user: { id: string; name: string|null; image: string|null } }) {
  return (
    <div className={`w-10 h-10 rounded-full bg-linear-to-br ${ag(user.id)} flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden`}>
      {user.image
        ? <img src={user.image} alt="" className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
        : user.name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [tab,        setTab]        = useState<"all"|"pending"|"search">("all");
  const [friends,    setFriends]    = useState<Friendship[]>([]);
  const [pending,    setPending]    = useState<Friendship[]>([]);
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState<SearchUser[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [actionId,   setActionId]   = useState<string|null>(null);

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/friends");
    const data = await res.json();
    setFriends(data.accepted ?? []);
    setPending(data.pending ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (session) fetchFriends(); }, [session, fetchFriends]);

  // Search users
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const d = await res.json();
      setResults(d.users ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const sendRequest = async (addresseeId: string) => {
    setActionId(addresseeId);
    await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addresseeId }) });
    setActionId(null);
    // Refresh search results
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
    const d = await res.json(); setResults(d.users ?? []);
  };

  const respondRequest = async (id: string, action: "accept"|"decline") => {
    setActionId(id);
    await fetch(`/api/friends/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    setActionId(null);
    fetchFriends();
  };

  const removeFriend = async (id: string) => {
    setActionId(id);
    await fetch(`/api/friends/${id}`, { method: "DELETE" });
    setActionId(null);
    fetchFriends();
  };

  const openDM = async (friendId: string) => {
    const res = await fetch("/api/friends/dm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendId }) });
    const data = await res.json();
    if (data.slug) router.push(`/dashboard/chat?room=${data.slug}`);
  };

  if (isPending || !session) {
    return <div className="min-h-screen flex items-center justify-center bg-[#111113]"><Loader2 className="w-7 h-7 text-violet-500 animate-spin" /></div>;
  }

  const currentUserId = session.user.id;
  const incoming = pending.filter(f => f.addresseeId === currentUserId);
  const outgoing  = pending.filter(f => f.requesterId === currentUserId);

  return (
    <div className="flex h-screen bg-[#111113] text-neutral-200 overflow-hidden">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={session.user} unreadCount={0} />

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-3xl mx-auto px-6 py-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-lg font-extrabold text-white font-sans">Friends</h1>
                <p className="text-xs text-neutral-500 font-sans mt-0.5">{friends.length} friend{friends.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setTab("search")}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-bold text-white transition-colors font-sans">
                <UserPlus className="w-4 h-4" /> Add Friend
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-neutral-900/60 rounded-xl p-1 w-fit">
              {([["all","All Friends"],["pending","Pending"],["search","Find People"]] as const).map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all ${
                    tab === t ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-neutral-300"
                  }`}>
                  {label}
                  {t === "pending" && incoming.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-violet-500 rounded-full text-[9px] font-bold text-white">{incoming.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── All Friends ── */}
            {tab === "all" && (
              <div className="space-y-2">
                {loading ? (
                  Array.from({length:4}).map((_,i) => <div key={i} className="h-16 rounded-xl bg-neutral-800/40 animate-pulse" />)
                ) : friends.length === 0 ? (
                  <div className="flex flex-col items-center py-16 gap-3">
                    <UserPlus className="w-10 h-10 text-neutral-700" />
                    <p className="text-sm text-neutral-500 font-sans">No friends yet</p>
                    <button onClick={() => setTab("search")} className="text-xs text-violet-400 hover:text-violet-300 font-semibold font-sans">Find people →</button>
                  </div>
                ) : (
                  friends.map(f => {
                    const friend = f.requesterId === currentUserId ? f.addressee : f.requester;
                    return (
                      <div key={f.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60 hover:border-neutral-700 transition-colors group">
                        <div className="relative shrink-0">
                          <Avatar user={friend} />
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111113] ${STATUS_COLOR[friend.status] ?? "bg-neutral-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white font-sans truncate">{friend.name}</p>
                          <p className="text-xs text-neutral-500 font-sans">@{friend.username ?? "—"} · <span className="capitalize">{friend.status.toLowerCase().replace("_"," ")}</span></p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openDM(friend.id)}
                            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-violet-600 flex items-center justify-center transition-colors" title="Message">
                            <MessageSquare className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white" />
                          </button>
                          <button onClick={() => removeFriend(f.id)} disabled={actionId === f.id}
                            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-red-500/20 flex items-center justify-center transition-colors" title="Remove friend">
                            <UserX className="w-3.5 h-3.5 text-neutral-600 hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Pending ── */}
            {tab === "pending" && (
              <div className="space-y-5">
                {incoming.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 font-sans mb-2">Incoming — {incoming.length}</p>
                    <div className="space-y-2">
                      {incoming.map(f => (
                        <div key={f.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-900/60 border border-violet-500/20">
                          <Avatar user={f.requester} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white font-sans truncate">{f.requester.name}</p>
                            <p className="text-xs text-neutral-500 font-sans">@{f.requester.username ?? "—"}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => respondRequest(f.id, "accept")} disabled={actionId === f.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-xs font-bold text-white transition-colors font-sans">
                              {actionId === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />} Accept
                            </button>
                            <button onClick={() => respondRequest(f.id, "decline")} disabled={actionId === f.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-red-500/20 disabled:opacity-50 rounded-lg text-xs font-semibold text-neutral-400 hover:text-red-400 transition-colors font-sans">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {outgoing.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 font-sans mb-2">Sent — {outgoing.length}</p>
                    <div className="space-y-2">
                      {outgoing.map(f => (
                        <div key={f.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
                          <Avatar user={f.addressee} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white font-sans truncate">{f.addressee.name}</p>
                            <p className="text-xs text-neutral-500 font-sans">@{f.addressee.username ?? "—"} · Pending</p>
                          </div>
                          <button onClick={() => removeFriend(f.id)} disabled={actionId === f.id}
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-red-500/10 rounded-lg text-xs text-neutral-500 hover:text-red-400 font-semibold font-sans transition-colors disabled:opacity-50">
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {incoming.length === 0 && outgoing.length === 0 && (
                  <div className="flex flex-col items-center py-16 gap-3">
                    <UserCheck className="w-10 h-10 text-neutral-700" />
                    <p className="text-sm text-neutral-500 font-sans">No pending requests</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Search ── */}
            {tab === "search" && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by name, username or email…"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 rounded-xl text-sm text-white placeholder-neutral-600 outline-none font-sans"
                    autoFocus
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 animate-spin" />}
                </div>

                {results.length > 0 && (
                  <div className="space-y-2">
                    {results.map(u => (
                      <div key={u.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
                        <Avatar user={u} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white font-sans truncate">{u.name}</p>
                          <p className="text-xs text-neutral-500 font-sans">@{u.username ?? "—"}</p>
                        </div>
                        {u.friendshipStatus === "ACCEPTED" ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold font-sans">
                            <UserCheck className="w-3.5 h-3.5" /> Friends
                          </span>
                        ) : u.friendshipStatus === "PENDING" ? (
                          <span className="text-xs text-neutral-500 font-sans">Pending</span>
                        ) : (
                          <button onClick={() => sendRequest(u.id)} disabled={actionId === u.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-xs font-bold text-white transition-colors font-sans">
                            {actionId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />} Add
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {query.length >= 2 && !searching && results.length === 0 && (
                  <p className="text-sm text-neutral-600 font-sans text-center py-8">No users found for &ldquo;{query}&rdquo;</p>
                )}

                {query.length < 2 && (
                  <p className="text-xs text-neutral-600 font-sans text-center pt-8">Type at least 2 characters to search</p>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
