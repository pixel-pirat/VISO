"use client";

import { useState, useRef } from "react";
import {
  X, Loader2, Globe, Lock, ChevronDown, ImagePlus,
  MessageSquare, Mic, Video, CalendarClock, Check,
} from "lucide-react";
import type { RoomDetailData } from "../_types";

type Visibility = "PUBLIC" | "PRIVATE";

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 font-sans">
      {children}{required && <span className="text-violet-400 ml-0.5">*</span>}
    </label>
  );
}

function Input({ id, label, required, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }) {
  return (
    <div>
      <Label htmlFor={id} required={required}>{label}</Label>
      <input id={id} required={required} {...props}
        className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 rounded-xl text-sm text-white placeholder-neutral-600 outline-none transition-all font-sans" />
    </div>
  );
}

function Textarea({ id, label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <textarea id={id} rows={3} {...props}
        className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 rounded-xl text-sm text-white placeholder-neutral-600 outline-none transition-all font-sans resize-none" />
    </div>
  );
}

function CommToggle({ icon: Icon, label, checked, onChange }: {
  icon: React.ElementType; label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold font-sans transition-all ${
        checked ? "bg-violet-600/20 border-violet-500 text-violet-300"
                : "bg-neutral-900 border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
      }`}>
      <Icon className="w-3.5 h-3.5" />{label}
    </button>
  );
}

// local ISO to datetime-local string
function toLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditRoomModal({
  room, onClose, onSaved,
}: {
  room: RoomDetailData;
  onClose: () => void;
  onSaved: (updated: RoomDetailData) => void;
}) {
  const [name,         setName]        = useState(room.name);
  const [contentTitle, setContent]     = useState(room.contentTitle ?? "");
  const [description,  setDesc]        = useState(room.description  ?? "");
  const [visibility,   setVis]         = useState<Visibility>(room.visibility as Visibility);
  const [passcode,     setPasscode]    = useState(room.passcode ?? "");
  const [coverUrl,     setCoverUrl]    = useState(room.coverUrl ?? "");
  const [scheduledAt,  setSched]       = useState(toLocal(room.scheduledAt));
  const [commChat,     setCommChat]    = useState(room.commChat);
  const [commAudio,    setCommAudio]   = useState(room.commAudio);
  const [commVideo,    setCommVideo]   = useState(room.commVideo);
  const [status,       setStatus]      = useState(room.status);
  const [loading,      setLoading]     = useState(false);
  const [uploading,    setUploading]   = useState(false);
  const [error,        setError]       = useState<string | null>(null);
  const [visOpen,      setVisOpen]     = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);

  const visOpts = [
    { value: "PUBLIC"  as Visibility, label: "Public",  desc: "Anyone can find and join", icon: Globe },
    { value: "PRIVATE" as Visibility, label: "Private", desc: "Invite / link only",        icon: Lock },
  ];
  const selVis = visOpts.find((o) => o.value === visibility)!;

  const uploadCover = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/rooms/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCoverUrl(data.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Room name is required."); return; }
    if (!commChat && !commAudio && !commVideo) { setError("Select at least one communication method."); return; }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/rooms/${room.slug}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         name.trim(),
          contentTitle: contentTitle || "",
          description:  description  || "",
          visibility,
          passcode:     visibility === "PRIVATE" ? passcode : "",
          coverUrl:     coverUrl || "",
          scheduledAt:  scheduledAt ? new Date(scheduledAt).toISOString() : "",
          commChat, commAudio, commVideo, status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.issues ? data.issues.map((i: {message:string}) => i.message).join(", ") : data.error ?? "Failed.");
        return;
      }
      // merge updated fields back into the full room data
      onSaved({ ...room, ...data.room });
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4 py-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-[#18181b] border border-neutral-700/60 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
          <h2 className="text-sm font-extrabold text-white font-sans">Edit Room</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        </div>

        {/* body */}
        <div className="overflow-y-auto scrollbar-hide flex-1">
          <form id="edit-room-form" onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-sans">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input id="e-name" label="Room Name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
              <Input id="e-content" label="Title of Content" maxLength={120} value={contentTitle} onChange={(e) => setContent(e.target.value)} />
            </div>

            {/* cover upload */}
            <div>
              <Label htmlFor="e-cover">Cover Photo</Label>
              <input ref={coverRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }} />
              <button type="button" onClick={() => coverRef.current?.click()}
                className={`w-full relative flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-dashed transition-colors ${
                  coverUrl ? "border-violet-500/50 bg-violet-500/5" : "border-neutral-700 hover:border-violet-500/50"
                }`}>
                {coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="cover" className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-20" />
                )}
                <div className="relative z-10 flex items-center gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 text-violet-400 animate-spin" /> : <ImagePlus className="w-4 h-4 text-neutral-500" />}
                  <span className="text-xs text-neutral-500 font-sans truncate">
                    {uploading ? "Uploading…" : coverUrl ? coverUrl.split("/").pop() : "Click to upload cover photo"}
                  </span>
                  {coverUrl && !uploading && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                </div>
              </button>
            </div>

            <Textarea id="e-desc" label="Description" maxLength={500} value={description} onChange={(e) => setDesc(e.target.value)} />

            {/* visibility */}
            <div>
              <Label htmlFor="e-vis">Visibility</Label>
              <div className="relative">
                <button type="button" onClick={() => setVisOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-neutral-900 border border-neutral-700 hover:border-neutral-600 rounded-xl transition-colors">
                  <div className="flex items-center gap-2.5">
                    <selVis.icon className="w-4 h-4 text-violet-400 shrink-0" />
                    <p className="text-xs font-semibold text-white font-sans">{selVis.label}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform ${visOpen ? "rotate-180" : ""}`} />
                </button>
                {visOpen && (
                  <div className="absolute top-full mt-1 inset-x-0 bg-[#18181b] border border-neutral-700 rounded-xl overflow-hidden shadow-xl z-20">
                    {visOpts.map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => { setVis(opt.value); setVisOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-neutral-800 transition-colors text-left ${visibility === opt.value ? "bg-neutral-800" : ""}`}>
                        <opt.icon className="w-4 h-4 text-violet-400 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-white font-sans">{opt.label}</p>
                          <p className="text-[10px] text-neutral-500 font-sans">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {visibility === "PRIVATE" && (
              <Input id="e-passcode" label="Passcode" minLength={4} maxLength={20}
                value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Min 4 characters" />
            )}

            {/* schedule */}
            <div>
              <Label htmlFor="e-sched">Scheduled Date</Label>
              <input id="e-sched" type="datetime-local" value={scheduledAt}
                onChange={(e) => setSched(e.target.value)}
                className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 rounded-xl text-sm text-white outline-none transition-all font-sans" />
              <p className="text-[10px] text-neutral-600 font-sans mt-1">Clear to remove the schedule.</p>
            </div>

            {/* status override */}
            <div>
              <Label htmlFor="e-status">Room Status</Label>
              <div className="flex gap-2">
                {(["SCHEDULED","LIVE","ENDED"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold font-sans transition-all ${
                      status === s
                        ? s === "LIVE"      ? "bg-red-500/20 border-red-500 text-red-300"
                          : s === "ENDED"   ? "bg-neutral-700 border-neutral-600 text-neutral-300"
                          :                  "bg-amber-500/20 border-amber-500 text-amber-300"
                        : "bg-neutral-900 border-neutral-700 text-neutral-500 hover:border-neutral-500"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* communication */}
            <div>
              <Label htmlFor="e-comm">Communication</Label>
              <div className="flex flex-wrap gap-2">
                <CommToggle icon={MessageSquare} label="Chat"  checked={commChat}  onChange={setCommChat} />
                <CommToggle icon={Mic}           label="Audio" checked={commAudio} onChange={setCommAudio} />
                <CommToggle icon={Video}         label="Video" checked={commVideo} onChange={setCommVideo} />
              </div>
            </div>
          </form>
        </div>

        {/* footer */}
        <div className="px-5 py-4 border-t border-neutral-800 shrink-0 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-neutral-700 hover:border-neutral-500 rounded-xl text-sm font-semibold text-neutral-400 hover:text-white transition-all font-sans">
            Cancel
          </button>
          <button type="submit" form="edit-room-form" disabled={loading || uploading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-all font-sans shadow-lg shadow-violet-500/20">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
