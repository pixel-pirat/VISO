"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  Play, Home, Tv2, MessageSquare, Users,
  TrendingUp, Film, Monitor, Star,
  BookMarked, Clock, Download,
  HelpCircle, Settings, ChevronLeft, ChevronRight, LogOut,
} from "lucide-react";

type User = { name: string | null; email: string; image?: string | null };

const STORAGE_KEY = "viso-sidebar-collapsed";

/* ── NavItem — renders as icon-only when collapsed ── */
function NavItem({
  href, icon: Icon, label, active, collapsed,
}: {
  href: string; icon: React.ElementType; label: string;
  active?: boolean; collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all font-sans group relative
        ${collapsed ? "justify-center px-0 py-2.5 mx-1" : "px-3 py-2"}
        ${active
          ? "bg-neutral-800 text-white"
          : "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50"
        }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}

      {/* Tooltip when collapsed */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2 z-50 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
          {label}
        </span>
      )}
    </Link>
  );
}

/* ── Section label — hidden when collapsed ── */
function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  if (collapsed) return <div className="h-3" />;
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-600 font-sans">
      {children}
    </p>
  );
}

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router   = useRouter();

  // Initialise from localStorage — default expanded
  const [collapsed, setCollapsed] = useState(false);
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  const toggle = () => {
    setCollapsed((v) => {
      localStorage.setItem(STORAGE_KEY, String(!v));
      return !v;
    });
  };

  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : "U";

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => { router.push("/login"); router.refresh(); } },
    });
  };

  // Prevent flash of wrong state before hydration
  if (!mounted) return <aside className="w-[220px] shrink-0 h-full bg-[#0e0e10] border-r border-neutral-800/60" />;

  const w = collapsed ? "w-[60px]" : "w-[220px]";

  return (
    <aside className={`${w} shrink-0 flex flex-col h-full bg-[#0e0e10] border-r border-neutral-800/60 transition-[width] duration-200 ease-in-out overflow-hidden`}>

      {/* ── Logo + collapse toggle ── */}
      <div className={`flex items-center h-14 border-b border-neutral-800/60 shrink-0 ${collapsed ? "justify-center px-0" : "justify-between px-4"}`}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
              <Play className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="text-sm font-extrabold tracking-widest text-white uppercase font-sans">VISO</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Play className="w-3.5 h-3.5 text-white fill-white" />
          </div>
        )}
        <button
          onClick={toggle}
          className={`w-6 h-6 rounded-md bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors ${collapsed ? "absolute left-[46px] top-4 z-10 shadow-lg border border-neutral-700" : ""}`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            : <ChevronLeft  className="w-3.5 h-3.5 text-neutral-400" />}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-1 py-2 space-y-0.5 scrollbar-hide">
        <SectionLabel collapsed={collapsed}>General</SectionLabel>
        <NavItem href="/dashboard"         icon={Home}          label="Home"     active={pathname === "/dashboard"}                   collapsed={collapsed} />
        <NavItem href="/dashboard/rooms"   icon={Tv2}           label="Rooms"    active={pathname.startsWith("/dashboard/rooms")}     collapsed={collapsed} />
        <NavItem href="/dashboard/chat"    icon={MessageSquare} label="Chat"     active={pathname.startsWith("/dashboard/chat")}      collapsed={collapsed} />
        <NavItem href="/dashboard/friends" icon={Users}         label="Friends"  active={pathname.startsWith("/dashboard/friends")}   collapsed={collapsed} />

        <SectionLabel collapsed={collapsed}>Discover</SectionLabel>
        <NavItem href="/dashboard/trending" icon={TrendingUp} label="Trending" active={pathname.startsWith("/dashboard/trending")} collapsed={collapsed} />
        <NavItem href="/dashboard/movies"   icon={Film}       label="Movies"   active={pathname.startsWith("/dashboard/movies")}   collapsed={collapsed} />
        <NavItem href="/dashboard/tvshows"  icon={Monitor}    label="TV Shows" active={pathname.startsWith("/dashboard/tvshows")}  collapsed={collapsed} />
        <NavItem href="/dashboard/anime"    icon={Star}       label="Anime"    active={pathname.startsWith("/dashboard/anime")}    collapsed={collapsed} />

        <SectionLabel collapsed={collapsed}>Library</SectionLabel>
        <NavItem href="/dashboard/watchlist"  icon={BookMarked} label="Watchlist"  active={pathname.startsWith("/dashboard/watchlist")}  collapsed={collapsed} />
        <NavItem href="/dashboard/history"    icon={Clock}      label="History"    active={pathname.startsWith("/dashboard/history")}    collapsed={collapsed} />
        <NavItem href="/dashboard/downloads"  icon={Download}   label="Downloads"  active={pathname.startsWith("/dashboard/downloads")}  collapsed={collapsed} />
      </nav>

      {/* ── Bottom nav ── */}
      <div className="border-t border-neutral-800/60 px-1 py-2 space-y-0.5 shrink-0">
        <NavItem href="/dashboard/support"  icon={HelpCircle} label="Support"  active={pathname.startsWith("/dashboard/support")}  collapsed={collapsed} />
        <NavItem href="/dashboard/settings" icon={Settings}   label="Settings" active={pathname.startsWith("/dashboard/settings")} collapsed={collapsed} />
      </div>

      {/* ── User row ── */}
      <button
        onClick={handleSignOut}
        title={collapsed ? `Sign out (${user.name})` : "Click to sign out"}
        className={`flex items-center border-t border-neutral-800/60 hover:bg-neutral-800/40 transition-colors w-full group
          ${collapsed ? "justify-center py-3 px-0" : "gap-3 px-4 py-3 text-left"}`}
      >
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold font-sans shrink-0 overflow-hidden">
          {user.image
            ? <img src={user.image} alt="" className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
            : initials}
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate font-sans">{user.name}</p>
              <p className="text-[10px] text-neutral-500 truncate font-sans">
                @{(user as { username?: string }).username ?? user.email}
              </p>
            </div>
            <LogOut className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400 transition-colors shrink-0" />
          </>
        )}
      </button>
    </aside>
  );
}
