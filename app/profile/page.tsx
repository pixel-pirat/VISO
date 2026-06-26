"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import {
  Play, LogOut, Settings, Tv2, Users, Home,
  Mail, Calendar, Edit3, Loader2,
  Film, Clock, Star,
} from "lucide-react";

type ProfileData = {
  user: {
    id: string; name: string; email: string; username: string | null;
    displayName: string | null; avatarUrl: string | null; image: string | null;
    status: string; createdAt: string;
  };
  stats: { roomsHosted: number; roomsJoined: number; friends: number };
};

const STATUS_LABEL: Record<string, { label: string; color: string; dot: string }> = {
  ONLINE:          { label: "Online",           color: "text-emerald-400", dot: "bg-emerald-500" },
  OFFLINE:         { label: "Offline",          color: "text-neutral-500", dot: "bg-neutral-600" },
  IDLE:            { label: "Idle",             color: "text-yellow-400",  dot: "bg-yellow-500"  },
  DO_NOT_DISTURB:  { label: "Do Not Disturb",   color: "text-red-400",     dot: "bg-red-500"     },
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/profile")
      .then(r => r.json())
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session]);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => { router.push("/login"); router.refresh(); } },
    });
  };

  if (isPending || loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111113]">
        <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
      </div>
    );
  }

  const user    = profile?.user ?? (session.user as unknown as ProfileData["user"]);
  const stats   = profile?.stats ?? { roomsHosted: 0, roomsJoined: 0, friends: 0 };
  const initials = user.name?.slice(0, 2).toUpperCase() ?? "U";
  const avatar   = user.avatarUrl ?? user.image ?? null;
  const statusInfo = STATUS_LABEL[user.status] ?? STATUS_LABEL.OFFLINE;
  const displayHandle = user.username ? `@${user.username}` : user.email;
  const joined = new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-[#111113] text-neutral-200">

      {/* ── Topnav ── */}
      <header className="sticky top-0 z-40 border-b border-neutral-800/60 bg-[#111113]/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="text-sm font-extrabold tracking-widest text-white uppercase font-sans">VISO</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-5">
            <Link href="/dashboard"         className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors font-sans"><Home className="w-3.5 h-3.5" /> Home</Link>
            <Link href="/dashboard/rooms"   className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors font-sans"><Tv2  className="w-3.5 h-3.5" /> Rooms</Link>
            <Link href="/dashboard/friends" className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors font-sans"><Users className="w-3.5 h-3.5" /> Friends</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/settings"
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors font-sans">
              <Settings className="w-3.5 h-3.5" /> Settings
            </Link>
            <button onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-400 transition-colors font-sans">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* ── Profile card ── */}
        <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/60 shadow-2xl">

          {/* Cover */}
          <div className="h-36 bg-linear-to-br from-violet-600/60 via-fuchsia-600/40 to-indigo-900/60 relative">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px" }} />
            {/* Edit button */}
            <Link href="/dashboard/settings"
              className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-black/60 backdrop-blur rounded-xl text-xs font-semibold text-white transition-colors border border-white/10 font-sans">
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </Link>
          </div>

          {/* Body */}
          <div className="px-6 pb-6 pt-0 relative">
            {/* Avatar */}
            <div className="flex items-end justify-between">
              <div className="relative -mt-12">
                <div className="w-24 h-24 rounded-2xl border-4 border-neutral-900 bg-neutral-950 overflow-hidden shadow-xl flex items-center justify-center">
                  {avatar
                    ? <img src={avatar} alt={user.name} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                    : <span className="text-3xl font-extrabold bg-linear-to-tr from-violet-400 to-fuchsia-400 bg-clip-text text-transparent font-sans">{initials}</span>}
                </div>
                <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full ${statusInfo.dot} border-[3px] border-neutral-900`} />
              </div>

              <Link href="/dashboard/rooms"
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold text-white transition-colors font-sans shadow-lg shadow-violet-500/20 mt-2">
                <Tv2 className="w-3.5 h-3.5" /> Browse Rooms
              </Link>
            </div>

            {/* Name & handle */}
            <div className="mt-4 mb-5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-white font-sans">{user.displayName || user.name}</h1>
                <span className={`text-xs font-semibold font-sans ${statusInfo.color}`}>● {statusInfo.label}</span>
              </div>
              <p className="text-sm text-neutral-500 font-sans mt-0.5">{displayHandle}</p>
              {user.displayName && user.name !== user.displayName && (
                <p className="text-xs text-neutral-600 font-sans mt-0.5">{user.name}</p>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-neutral-800/40 rounded-xl mb-5 border border-neutral-800/60">
              {[
                { icon: Film,  label: "Rooms Hosted", value: stats.roomsHosted },
                { icon: Clock, label: "Rooms Joined",  value: stats.roomsJoined },
                { icon: Users, label: "Friends",        value: stats.friends },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col items-center gap-1 text-center">
                  <Icon className="w-4 h-4 text-violet-400 mb-0.5" />
                  <p className="text-lg font-extrabold text-white font-sans leading-none">{value}</p>
                  <p className="text-[10px] text-neutral-500 font-sans">{label}</p>
                </div>
              ))}
            </div>

            {/* Info rows */}
            <div className="space-y-3 pt-4 border-t border-neutral-800/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 font-sans">Email</p>
                  <p className="text-sm text-neutral-200 font-sans">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 font-sans">Member Since</p>
                  <p className="text-sm text-neutral-200 font-sans">{joined}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                  <Star className="w-3.5 h-3.5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 font-sans">VISO Member</p>
                  <p className="text-sm text-neutral-200 font-sans">Early Access</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/settings"
            className="flex items-center gap-3 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-violet-500/40 transition-colors group">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
              <Settings className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white font-sans">Settings</p>
              <p className="text-xs text-neutral-500 font-sans">Edit your profile</p>
            </div>
          </Link>
          <Link href="/dashboard/friends"
            className="flex items-center gap-3 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-violet-500/40 transition-colors group">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
              <Users className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white font-sans">Friends</p>
              <p className="text-xs text-neutral-500 font-sans">{stats.friends} connections</p>
            </div>
          </Link>
        </div>

      </main>
    </div>
  );
}
