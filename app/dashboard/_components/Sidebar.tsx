"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  Play, Home, Tv2, MessageSquare, Users,
  TrendingUp, Film, Monitor, Star,
  BookMarked, Clock, Download,
  HelpCircle, Settings, ChevronDown,
} from "lucide-react";

type User = { name: string | null; email: string; image?: string | null };

function NavItem({
  href, icon: Icon, label, active,
}: { href: string; icon: React.ElementType; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors font-sans ${
        active
          ? "bg-neutral-800 text-white"
          : "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-600 font-sans">
      {children}
    </p>
  );
}

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();

  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : "U";

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => { router.push("/login"); router.refresh(); } },
    });
  };

  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-full bg-[#0e0e10] border-r border-neutral-800/60">
      {/* logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-neutral-800/60 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Play className="w-3.5 h-3.5 text-white fill-white" />
        </div>
        <span className="text-sm font-extrabold tracking-widest text-white uppercase font-sans">VISO</span>
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-hide">
        <SectionLabel>General</SectionLabel>
        <NavItem href="/dashboard" icon={Home}          label="Home"    active={pathname === "/dashboard"} />
        <NavItem href="/dashboard/rooms"   icon={Tv2}          label="Rooms"   active={pathname.startsWith("/dashboard/rooms")} />
        <NavItem href="/dashboard/chat"    icon={MessageSquare} label="Chat"    active={pathname.startsWith("/dashboard/chat")} />
        <NavItem href="/dashboard/friends" icon={Users}         label="Friends" active={pathname.startsWith("/dashboard/friends")} />

        <SectionLabel>Discover</SectionLabel>
        <NavItem href="/dashboard/trending" icon={TrendingUp} label="Trending" />
        <NavItem href="/dashboard/movies"   icon={Film}       label="Movies" />
        <NavItem href="/dashboard/tvshows"  icon={Monitor}    label="TV Shows" />
        <NavItem href="/dashboard/anime"    icon={Star}       label="Anime" />

        <SectionLabel>Library</SectionLabel>
        <NavItem href="/dashboard/watchlist" icon={BookMarked} label="Watchlist" />
        <NavItem href="/dashboard/history"   icon={Clock}      label="History" />
        <NavItem href="/dashboard/downloads" icon={Download}   label="Downloads" />
      </nav>

      {/* bottom */}
      <div className="border-t border-neutral-800/60 px-2 py-2 space-y-0.5 shrink-0">
        <NavItem href="/dashboard/support"  icon={HelpCircle} label="Support" />
        <NavItem href="/dashboard/settings" icon={Settings}   label="Settings" />
      </div>

      {/* user row */}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-4 py-3 border-t border-neutral-800/60 hover:bg-neutral-800/40 transition-colors w-full text-left group"
        title="Click to sign out"
      >
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold font-sans shrink-0 overflow-hidden">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="w-full h-full object-cover" />
          ) : initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate font-sans">{user.name}</p>
          <p className="text-[10px] text-neutral-500 truncate font-sans">
            @{(user as { username?: string }).username ?? user.email}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400 transition-colors shrink-0" />
      </button>
    </aside>
  );
}
