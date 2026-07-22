"use client";

import { useEffect, useRef, useState } from "react";
import { Send, UserPlus, Pin, Check, BarChart3, Plus, X, CheckCircle2, HelpCircle, ArrowLeft } from "lucide-react";
import type { ChatMessage, PollState, QAItem } from "./LiveRoom";
import type { RoomInfo } from "../page";

const AVATAR_G = ["from-violet-500 to-fuchsia-500","from-blue-500 to-cyan-500","from-emerald-500 to-teal-500","from-orange-500 to-rose-500","from-pink-500 to-fuchsia-500"];
function ag(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_G[h % AVATAR_G.length];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const QUICK_REACTIONS = ["❤️","😂","🔥","😮","👏"] as const;

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
  isHost:           boolean;
  onReaction:       (emoji: string) => void;
  onInvite:         () => void;
  invited:          boolean;
  poll:             PollState | null;
  onCreatePoll:     (question: string, options: string[]) => void;
  onVotePoll:       (option: number) => void;
  onEndPoll:        () => void;
  questions:        QAItem[];
  onAskQuestion:    (text: string) => void;
  onMarkAnswered:   (id: string) => void;
  /** Renders as a full-screen mobile takeover with a close button, instead
   *  of the fixed-width desktop rail. */
  mobile?:          boolean;
  onClose?:         () => void;
}

/* ── Polls tab ────────────────────────────────────────────────── */
function PollsTab({
  poll, isHost, currentUserId, onCreatePoll, onVotePoll, onEndPoll,
}: {
  poll: PollState | null; isHost: boolean; currentUserId: string;
  onCreatePoll: (q: string, opts: string[]) => void;
  onVotePoll: (i: number) => void; onEndPoll: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [options,  setOptions]  = useState<string[]>(["", ""]);

  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  const canCreate = question.trim().length > 0 && validOptions.length >= 2;

  const create = () => {
    if (!canCreate) return;
    onCreatePoll(question.trim(), validOptions);
    setQuestion(""); setOptions(["", ""]);
  };

  if (poll) {
    const totalVotes = Object.keys(poll.votes).length;
    const myVote = poll.votes[currentUserId];
    return (
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-3">
        <div className="px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl">
          <p className="text-[9px] font-bold text-violet-400 uppercase tracking-wider font-sans mb-1">
            {poll.open ? "Live Poll" : "Final Results"}
          </p>
          <p className="text-xs text-white font-semibold font-sans">{poll.question}</p>
        </div>

        <div className="space-y-2">
          {poll.options.map((opt, i) => {
            const count = Object.values(poll.votes).filter((v) => v === i).length;
            const pct   = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const mine  = myVote === i;
            return (
              <button
                key={i}
                disabled={!poll.open}
                onClick={() => onVotePoll(i)}
                className={`relative w-full px-3 py-2 rounded-xl border text-left overflow-hidden transition-colors ${
                  mine ? "border-violet-500/60 bg-violet-500/10" : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
                } ${poll.open ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className="absolute inset-y-0 left-0 bg-violet-500/15" style={{ width: `${pct}%` }} />
                <div className="relative flex items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-200 font-sans">{opt}</span>
                  <span className="text-[10px] text-neutral-500 font-sans tabular-nums shrink-0">
                    {pct}% ({count})
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-neutral-600 font-sans">
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          {poll.open && myVote === undefined && " — tap an option to vote"}
        </p>

        {isHost && poll.open && (
          <button onClick={onEndPoll}
            className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-[10px] font-bold text-neutral-300 hover:text-white transition-colors font-sans">
            End Poll
          </button>
        )}
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
        <BarChart3 className="w-8 h-8 text-neutral-700" />
        <p className="text-xs text-neutral-500 font-sans">No active poll</p>
        <p className="text-[10px] text-neutral-600 font-sans">The host can start a poll for everyone to vote on.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-2">
      <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider font-sans">Create a poll</p>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question…"
        maxLength={120}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 focus:border-violet-500 rounded-xl text-xs text-white placeholder-neutral-600 outline-none font-sans"
      />
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={opt}
            onChange={(e) => setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
            placeholder={`Option ${i + 1}`}
            maxLength={60}
            className="flex-1 px-3 py-1.5 bg-neutral-800 border border-neutral-700 focus:border-violet-500 rounded-xl text-[11px] text-white placeholder-neutral-600 outline-none font-sans"
          />
          {options.length > 2 && (
            <button onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
              className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors shrink-0">
              <X className="w-3 h-3 text-neutral-500" />
            </button>
          )}
        </div>
      ))}
      {options.length < 4 && (
        <button onClick={() => setOptions((prev) => [...prev, ""])}
          className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 font-semibold font-sans transition-colors">
          <Plus className="w-3 h-3" /> Add option
        </button>
      )}
      <button onClick={create} disabled={!canCreate}
        className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-[10px] font-bold text-white transition-colors font-sans">
        Start Poll
      </button>
    </div>
  );
}

/* ── Q&A tab ──────────────────────────────────────────────────── */
function QATab({
  questions, isHost, currentUserId, onAskQuestion, onMarkAnswered,
}: {
  questions: QAItem[]; isHost: boolean; currentUserId: string;
  onAskQuestion: (t: string) => void; onMarkAnswered: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const submit = () => {
    if (!text.trim()) return;
    onAskQuestion(text);
    setText("");
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-2">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <HelpCircle className="w-8 h-8 text-neutral-700" />
            <p className="text-xs text-neutral-500 font-sans">No questions yet</p>
            <p className="text-[10px] text-neutral-600 font-sans">Ask the host anything below.</p>
          </div>
        ) : (
          questions.map((q) => (
            <div key={q.id}
              className={`px-3 py-2 rounded-xl border ${q.answered ? "border-emerald-500/20 bg-emerald-500/5" : "border-neutral-800 bg-neutral-900"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-[10px] font-bold font-sans ${q.authorId === currentUserId ? "text-violet-400" : "text-neutral-400"}`}>
                  {q.authorName}
                </span>
                {q.answered && (
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-semibold font-sans shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Answered
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-300 font-sans leading-snug mt-0.5">{q.text}</p>
              {isHost && !q.answered && (
                <button onClick={() => onMarkAnswered(q.id)}
                  className="mt-1.5 text-[9px] text-emerald-400 hover:text-emerald-300 font-semibold font-sans transition-colors">
                  Mark answered
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="px-3 pb-3 pt-2 border-t border-neutral-800/60 shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Ask a question…"
            maxLength={300}
            className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 rounded-xl text-xs text-white placeholder-neutral-600 outline-none transition-all font-sans"
          />
          <button onClick={submit} disabled={!text.trim()}
            className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0">
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Main panel ───────────────────────────────────────────────── */
export function ChatPanel({
  messages, input, setInput, onSend, participantCount,
  activeTab, setActiveTab, roomInfo, currentUserId,
  isHost, onReaction, onInvite, invited,
  poll, onCreatePoll, onVotePoll, onEndPoll,
  questions, onAskQuestion, onMarkAnswered,
  mobile = false, onClose,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "chat") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const unansweredCount = questions.filter((q) => !q.answered).length;

  return (
    <aside className={mobile
      ? "w-full flex flex-col h-full bg-[#0a0a0c]"
      : "w-[260px] shrink-0 flex flex-col h-full bg-[#0a0a0c] border-l border-neutral-800/60"}>

      {/* header */}
      <div className="px-4 py-3 border-b border-neutral-800/60 shrink-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            {mobile && (
              <button onClick={onClose}
                className="w-7 h-7 -ml-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors shrink-0">
                <ArrowLeft className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            )}
            <h3 className="text-sm font-bold text-white font-sans truncate">
              {activeTab === "chat" ? "Room Chat" : activeTab === "polls" ? "Polls" : "Q&A"}
            </h3>
          </div>
          <button title={invited ? "Link copied!" : "Copy invite link"} onClick={onInvite}
            className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors shrink-0">
            {invited
              ? <Check className="w-3 h-3 text-emerald-400" />
              : <UserPlus className="w-3 h-3 text-neutral-400" />}
          </button>
        </div>
        <p className="text-[10px] text-neutral-500 font-sans">{participantCount.toLocaleString()} members</p>
      </div>

      {activeTab === "chat" && (
        <>
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
                <div key={msg.id} className="flex items-start gap-2">
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
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* quick reactions — sent to everyone via the data channel */}
          <div className="px-3 py-2 border-t border-neutral-800/60 shrink-0 flex items-center justify-between">
            {QUICK_REACTIONS.map((e) => (
              <button key={e} onClick={() => onReaction(e)} title="Send reaction"
                className="text-base hover:scale-125 transition-transform">{e}</button>
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
        </>
      )}

      {activeTab === "polls" && (
        <PollsTab
          poll={poll}
          isHost={isHost}
          currentUserId={currentUserId}
          onCreatePoll={onCreatePoll}
          onVotePoll={onVotePoll}
          onEndPoll={onEndPoll}
        />
      )}

      {activeTab === "qa" && (
        <QATab
          questions={questions}
          isHost={isHost}
          currentUserId={currentUserId}
          onAskQuestion={onAskQuestion}
          onMarkAnswered={onMarkAnswered}
        />
      )}

      {/* tabs */}
      <div className="flex border-t border-neutral-800/60 shrink-0">
        {(["Chat", "Polls", "Q&A"] as const).map((tab) => {
          const key = tab.toLowerCase().replace("&", "") as "chat" | "polls" | "qa";
          const badge =
            key === "polls" && poll?.open ? "•" :
            key === "qa" && unansweredCount > 0 ? String(unansweredCount) : null;
          return (
            <button key={tab} onClick={() => setActiveTab(key)}
              className={`flex-1 py-2.5 text-[10px] font-bold font-sans transition-colors ${
                activeTab === key ? "text-violet-400 border-b-2 border-violet-500" : "text-neutral-600 hover:text-neutral-400"
              }`}>
              {tab}
              {badge && <span className="ml-1 text-violet-400">{badge}</span>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
