"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface ComingSoonProps {
  title: string;
  description: string;
  // Pass the icon as a rendered JSX element, not a component reference
  iconElement: React.ReactNode;
}

export function ComingSoonPage({ iconElement, title, description }: ComingSoonProps) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111113]">
        <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#111113] text-neutral-200 overflow-hidden">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={session.user} unreadCount={0} />
        <main className="flex-1 flex flex-col items-center justify-center gap-5 px-6">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            {iconElement}
          </div>
          <div className="text-center max-w-xs">
            <h1 className="text-lg font-bold text-white font-sans mb-2">{title}</h1>
            <p className="text-sm text-neutral-500 font-sans leading-relaxed">{description}</p>
          </div>
          <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-xs font-semibold text-violet-400 font-sans uppercase tracking-widest">
            Coming Soon
          </span>
        </main>
      </div>
    </div>
  );
}
