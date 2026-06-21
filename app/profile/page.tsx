"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import {
  LogOut, Mail, Shield, Calendar, Loader2,
  Play, Home, Tv2, Users,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => { router.push("/login"); router.refresh(); },
      },
    });
  };

  /* ── loading / unauthenticated ── */
  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
          <p className="text-sm text-neutral-500 font-sans">Loading…</p>
        </div>
      </div>
    );
  }

  const { user } = session;
  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : "U";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">

      {/* ── top nav ── */}
      <header className="border-b border-neutral-800/60 backdrop-blur-xl bg-neutral-950/80 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="text-sm font-extrabold tracking-widest text-white uppercase font-sans">VISO</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-5">
            <Link href="/"      className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors font-sans"><Home className="w-3.5 h-3.5" /> Home</Link>
            <Link href="#"      className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors font-sans"><Tv2  className="w-3.5 h-3.5" /> Rooms</Link>
            <Link href="#"      className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors font-sans"><Users className="w-3.5 h-3.5" /> Friends</Link>
          </nav>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-400 transition-colors font-sans"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </header>

      {/* ── main ── */}
      <main className="max-w-2xl mx-auto px-4 py-12">

        {/* card */}
        <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/60 shadow-2xl shadow-black/30">

          {/* cover banner */}
          <div className="h-28 bg-gradient-to-r from-violet-600/70 via-fuchsia-600/60 to-violet-800/70 relative">
            {/* subtle noise-like pattern overlay */}
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)", backgroundSize: "6px 6px" }} />
            {/* VISO badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-black/30 backdrop-blur rounded-full text-[10px] font-bold text-white uppercase tracking-widest font-sans">
              <Play className="w-2.5 h-2.5 fill-white" /> VISO Member
            </div>
          </div>

          {/* body */}
          <div className="px-7 pb-8 pt-4 relative">

            {/* avatar — overlaps cover */}
            <div className="absolute -top-14 left-7">
              <div className="w-[88px] h-[88px] rounded-2xl bg-neutral-950 border-4 border-neutral-900 flex items-center justify-center overflow-hidden shadow-xl">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt={user.name ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-extrabold bg-gradient-to-tr from-violet-400 to-fuchsia-400 bg-clip-text text-transparent font-sans">
                    {initials}
                  </span>
                )}
              </div>
              {/* online dot */}
              <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-emerald-500 border-[3px] border-neutral-900 rounded-full" title="Online" />
            </div>

            {/* spacer */}
            <div className="h-10" />

            {/* name row */}
            <div className="mb-6">
              <h1 className="text-xl font-extrabold text-white font-sans leading-tight">{user.name}</h1>
              <p className="text-sm text-neutral-500 font-sans mt-0.5">@{(user as { username?: string }).username ?? "—"}</p>
            </div>

            {/* info rows */}
            <div className="space-y-3 border-t border-neutral-800/60 pt-5 mb-7">
              {[
                { icon: Mail,     color: "text-violet-400",  label: "Email",        value: user.email },
                { icon: Shield,   color: "text-fuchsia-400", label: "Session",      value: session.session.id, mono: true },
                { icon: Calendar, color: "text-emerald-400", label: "Member since", value: new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) },
              ].map(({ icon: Icon, color, label, value, mono }) => (
                <div key={label} className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 font-sans">{label}</p>
                    <p className={`text-sm text-neutral-200 font-sans truncate ${mono ? "font-mono text-xs text-neutral-500" : ""}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSignOut}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-neutral-800 hover:border-red-500/40 hover:bg-red-500/5 rounded-xl text-sm font-semibold text-neutral-400 hover:text-red-400 transition-all font-sans"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-sm font-semibold text-white transition-all font-sans shadow-lg shadow-violet-500/20"
              >
                <Tv2 className="w-4 h-4" /> Browse Rooms
              </Link>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
