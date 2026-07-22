"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Loader2, ChevronDown, Mail, Tv2, Users, MessageSquare, HelpCircle } from "lucide-react";
import { Sidebar } from "../_components/Sidebar";
import { Topbar } from "../_components/Topbar";

const FAQS = [
  {
    q: "How do I create a watch room?",
    a: "Click the “Create Room” button in the top bar (or on the Rooms page), give it a name, optionally upload a video or set a cover, and choose whether it's public or private. Your room goes live immediately unless you schedule it for later.",
  },
  {
    q: "How do private rooms and invites work?",
    a: "Private rooms can only be joined with an invite link or the room passcode. As the host, use any “Invite” button (in the room or on the room page) to copy your invite link and share it with friends.",
  },
  {
    q: "What video formats can I upload?",
    a: "Almost anything — MP4, MKV, AVI, MOV, WebM and more. Uploads are transcoded automatically for smooth streaming; large files can take a few minutes before playback starts.",
  },
  {
    q: "How does synced playback work?",
    a: "The host controls play, pause and seeking for everyone. Viewers stay in sync automatically — if you fall behind or join late, your player catches up to the host's position.",
  },
  {
    q: "How do I add friends and chat?",
    a: "Go to Friends → Find People and search by name or username. Once a request is accepted, you can message each other from the Chat page, or invite them into your rooms.",
  },
  {
    q: "How do polls and Q&A work in a room?",
    a: "In any room, switch tabs at the bottom of the chat panel. Hosts can start live polls everyone can vote on, and anyone can submit questions in the Q&A tab for the host to answer.",
  },
];

const SUPPORT_EMAIL = "kakwettey00@gmail.com";

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/50 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-800/30 transition-colors">
        <span className="text-xs font-bold text-white font-sans">{q}</span>
        <ChevronDown className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="px-4 pb-3.5 text-[11px] text-neutral-400 font-sans leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function SupportPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => { if (!isPending && !session) router.push("/login"); }, [session, isPending, router]);

  if (isPending || !session) {
    return <div className="min-h-screen flex items-center justify-center bg-[#111113]"><Loader2 className="w-7 h-7 text-violet-500 animate-spin" /></div>;
  }

  return (
    <div className="flex h-screen bg-[#111113] text-neutral-200 overflow-hidden">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={session.user} unreadCount={0} />

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-white font-sans">Support</h1>
                <p className="text-xs text-neutral-500 font-sans">Answers to common questions, and how to reach us.</p>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <Link href="/dashboard/rooms" className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/60 hover:border-violet-500/30 transition-colors">
                <Tv2 className="w-4 h-4 text-violet-400" />
                <span className="text-[10px] font-semibold text-neutral-300 font-sans">Browse Rooms</span>
              </Link>
              <Link href="/dashboard/friends?tab=search" className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/60 hover:border-violet-500/30 transition-colors">
                <Users className="w-4 h-4 text-violet-400" />
                <span className="text-[10px] font-semibold text-neutral-300 font-sans">Find Friends</span>
              </Link>
              <Link href="/dashboard/chat" className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/60 hover:border-violet-500/30 transition-colors">
                <MessageSquare className="w-4 h-4 text-violet-400" />
                <span className="text-[10px] font-semibold text-neutral-300 font-sans">Open Chat</span>
              </Link>
            </div>

            {/* FAQ */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 font-sans mb-2">Frequently asked</p>
            <div className="space-y-2 mb-8">
              {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
            </div>

            {/* Contact */}
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <p className="text-xs font-bold text-white font-sans">Still stuck?</p>
                <p className="text-[11px] text-neutral-500 font-sans mt-0.5">Email us and we'll get back to you.</p>
              </div>
              <a href={`mailto:${SUPPORT_EMAIL}?subject=VISO%20Support`}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold text-white transition-colors font-sans shrink-0">
                <Mail className="w-3.5 h-3.5" /> Contact Support
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
