"use client";

import { useState, useRef } from "react";
import {
  X, Loader2, Globe, Lock, ChevronDown,
  ImagePlus, Film, MessageSquare, Mic, Video,
  CalendarClock, Link2, Copy, Check,
} from "lucide-react";

type Visibility = "PUBLIC" | "PRIVATE";

interface CreateRoomModalProps {
  onClose: () => void;
  onCreated: (room: { id: string; name: string; slug: string; inviteToken?: string }) => void;
}

/* ── helpers ──────────────────────────────────────────────────── */
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
        checked
          ? "bg-violet-600/20 border-violet-500 text-violet-300"
          : "bg-neutral-900 border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
      }`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

/* ── upload zone ──────────────────────────────────────────────── */
function UploadZone({
  id, label, accept, icon: Icon, url, uploading, progress, onFile,
}: {
  id: string; label: string; accept: string; icon: React.ElementType;
  url: string; uploading: boolean; progress: number; onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const filename = url ? url.split("/").pop() : null;
  const isImage  = accept.startsWith("image");

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input id={id} ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />

      <button type="button" onClick={() => ref.current?.click()}
        className={`w-full relative flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed transition-colors group ${
          url ? "border-violet-500/50 bg-violet-500/5" : "border-neutral-700 hover:border-violet-500/50 bg-neutral-900 hover:bg-violet-500/5"
        }`}>

        {/* cover image preview */}
        {url && isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-25" />
        )}

        <div className="relative z-10 flex flex-col items-center gap-1.5">
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
              <span className="text-xs text-neutral-400 font-sans">Uploading… {progress > 0 ? `${progress}%` : ""}</span>
              {/* progress bar */}
              <div className="w-32 h-1 bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-1 bg-violet-500 transition-all rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : url ? (
            <>
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-semibold font-sans truncate max-w-[200px]">{filename}</span>
              <span className="text-[10px] text-neutral-500 font-sans">Click to replace</span>
            </>
          ) : (
            <>
              <Icon className="w-5 h-5 text-neutral-500 group-hover:text-violet-400 transition-colors" />
              <span className="text-xs text-neutral-500 group-hover:text-neutral-300 transition-colors font-sans">
                Click to upload {label.toLowerCase()}
              </span>
              <span className="text-[10px] text-neutral-600 font-sans">
                {isImage ? "JPG, PNG, WEBP — max 5 MB" : "MP4, WEBM — max 500 MB"}
              </span>
            </>
          )}
        </div>
      </button>
    </div>
  );
}

/* ── live indicator icon ────────────────────────────────────── */
function LiveDot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 10 10" fill="currentColor">
      <circle cx="5" cy="5" r="5" />
    </svg>
  );
}

/* ── main modal ─────────────────────────────────────────────── */
export function CreateRoomModal({ onClose, onCreated }: CreateRoomModalProps) {
  const [name,         setName]         = useState("");
  const [contentTitle, setContentTitle] = useState("");
  const [description,  setDesc]         = useState("");
  const [visibility,   setVis]          = useState<Visibility>("PUBLIC");
  const [passcode,     setPasscode]     = useState("");
  const [coverUrl,     setCoverUrl]     = useState("");
  const [videoUrl,     setVideoUrl]     = useState("");
  const [scheduledAt,  setScheduledAt]  = useState("");
  const [isLive,       setIsLive]       = useState(true);
  const [commChat,     setCommChat]     = useState(true);
  const [commAudio,    setCommAudio]    = useState(false);
  const [commVideo,    setCommVideo]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [uploadState,  setUploadState]  = useState<{ kind: "cover" | "video"; progress: number } | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [visOpen,      setVisOpen]      = useState(false);
  const [inviteLink,   setInviteLink]   = useState("");
  const [copied,       setCopied]       = useState(false);
  const [done,         setDone]         = useState(false);

  const visOpts = [
    { value: "PUBLIC"  as Visibility, label: "Public",  desc: "Anyone can find and join", icon: Globe },
    { value: "PRIVATE" as Visibility, label: "Private", desc: "Invite / link only",        icon: Lock },
  ];
  const selVis = visOpts.find((o) => o.value === visibility)!;

  /* ── upload with XHR so we can track progress ── */
  const upload = (file: File, kind: "cover" | "video") =>
    new Promise<string>((resolve, reject) => {
      setUploadState({ kind, progress: 0 });
      const fd = new FormData();
      fd.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/rooms/upload");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          setUploadState({ kind, progress: Math.round((e.loaded / e.total) * 100) });
      };
      xhr.onload = () => {
        setUploadState(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve(data.url as string);
        } else {
          reject(new Error(JSON.parse(xhr.responseText).error ?? "Upload failed"));
        }
      };
      xhr.onerror = () => { setUploadState(null); reject(new Error("Upload failed")); };
      xhr.send(fd);
    });

  const handleFile = async (file: File, kind: "cover" | "video") => {
    setError(null);
    try {
      const url = await upload(file, kind);
      if (kind === "cover") setCoverUrl(url);
      else                   setVideoUrl(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim())  { setError("Room name is required."); return; }
    if (!commChat && !commAudio && !commVideo) { setError("Select at least one communication method."); return; }
    if (!isLive && !scheduledAt) { setError("Pick a date and time for the scheduled room."); return; }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/rooms", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         name.trim(),
          contentTitle: contentTitle.trim() || undefined,
          description:  description.trim()  || undefined,
          visibility,
          passcode:     visibility === "PRIVATE" && passcode ? passcode : undefined,
          coverUrl:     coverUrl  || undefined,
          videoUrl:     videoUrl  || undefined,
          scheduledAt:  !isLive && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          commChat, commAudio, commVideo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Surface Zod issues if present
        const msg = data.issues
          ? data.issues.map((i: { message: string }) => i.message).join(", ")
          : (data.error ?? "Failed to create room.");
        setError(msg);
        return;
      }

      setInviteLink(`${window.location.origin}/room/${data.room.slug}?invite=${data.inviteToken}`);
      setDone(true);
      onCreated(data.room);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4 py-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-[#18181b] border border-neutral-700/60 rounded-2xl shadow-2xl shadow-black/60 flex flex-col max-h-[90vh]">

        {/* ── header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
          <h2 className="text-sm font-extrabold text-white font-sans">Create a Room</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        </div>

        {/* ── scrollable body ── */}
        <div className="overflow-y-auto scrollbar-hide flex-1">
          <form id="create-room-form" onSubmit={handleSubmit} className="px-5 py-5 space-y-5">

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-sans">{error}</div>
            )}

            {/* names */}
            <div className="grid grid-cols-2 gap-3">
              <Input id="name" label="Room Name" required placeholder="Friday Movie Night" maxLength={80}
                value={name} onChange={(e) => setName(e.target.value)} />
              <Input id="contentTitle" label="Title of Content" placeholder="Solo Leveling Ep. 12" maxLength={120}
                value={contentTitle} onChange={(e) => setContentTitle(e.target.value)} />
            </div>

            {/* cover photo */}
            <UploadZone id="cover" label="Cover Photo" accept="image/*" icon={ImagePlus}
              url={coverUrl} uploading={uploadState?.kind === "cover"} progress={uploadState?.kind === "cover" ? uploadState.progress : 0}
              onFile={(f) => handleFile(f, "cover")} />

            {/* video upload */}
            <UploadZone id="video" label="Upload Video" accept="video/mp4,video/webm,video/ogg" icon={Film}
              url={videoUrl} uploading={uploadState?.kind === "video"} progress={uploadState?.kind === "video" ? uploadState.progress : 0}
              onFile={(f) => handleFile(f, "video")} />

            {/* description */}
            <Textarea id="description" label="Description" placeholder="Tell people what you're watching…"
              maxLength={500} value={description} onChange={(e) => setDesc(e.target.value)} />

            {/* visibility */}
            <div>
              <Label htmlFor="vis">Visibility</Label>
              <div className="relative">
                <button type="button" id="vis" onClick={() => setVisOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-neutral-900 border border-neutral-700 hover:border-neutral-600 rounded-xl transition-colors">
                  <div className="flex items-center gap-2.5">
                    <selVis.icon className="w-4 h-4 text-violet-400 shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-white font-sans">{selVis.label}</p>
                      <p className="text-[10px] text-neutral-500 font-sans">{selVis.desc}</p>
                    </div>
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
                        {visibility === opt.value && (
                          <div className="ml-auto w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* passcode */}
            {visibility === "PRIVATE" && (
              <Input id="passcode" label="Passcode (optional)" placeholder="Min 4 characters"
                minLength={4} maxLength={20} value={passcode} onChange={(e) => setPasscode(e.target.value)} />
            )}

            {/* schedule */}
            <div>
              <Label htmlFor="sched">When</Label>
              <div className="flex gap-2 mb-3">
                {[
                  { val: true,  label: "Go Live Now",        icon: LiveDot },
                  { val: false, label: "Schedule for Later", icon: CalendarClock },
                ].map((opt) => (
                  <button key={String(opt.val)} type="button" onClick={() => setIsLive(opt.val)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold font-sans transition-all ${
                      isLive === opt.val
                        ? "bg-violet-600/20 border-violet-500 text-violet-300"
                        : "bg-neutral-900 border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
                    }`}>
                    <opt.icon className={`w-3 h-3 ${isLive === opt.val && opt.val ? "text-red-400" : ""}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
              {!isLive && (
                <>
                  <input id="sched" type="datetime-local" value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 rounded-xl text-sm text-white outline-none transition-all font-sans" />
                  <p className="text-[10px] text-neutral-600 font-sans mt-1.5">
                    The room becomes live automatically at the scheduled time.
                  </p>
                </>
              )}
            </div>

            {/* communication */}
            <div>
              <Label htmlFor="comm">Communication</Label>
              <div className="flex flex-wrap gap-2">
                <CommToggle icon={MessageSquare} label="Chat"  checked={commChat}  onChange={setCommChat} />
                <CommToggle icon={Mic}           label="Audio" checked={commAudio} onChange={setCommAudio} />
                <CommToggle icon={Video}         label="Video" checked={commVideo} onChange={setCommVideo} />
              </div>
              <p className="text-[10px] text-neutral-600 font-sans mt-1.5">Select all that should apply.</p>
            </div>

            {/* invite link (shown post-creation) */}
            {done && inviteLink && (
              <div>
                <Label htmlFor="invite-link">Invite Link</Label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl min-w-0">
                    <Link2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <span className="text-xs text-neutral-400 truncate font-sans">{inviteLink}</span>
                  </div>
                  <button type="button" onClick={copyLink}
                    className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white transition-colors font-sans shrink-0">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>

        {/* ── footer ── */}
        <div className="px-5 py-4 border-t border-neutral-800 shrink-0 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-neutral-700 hover:border-neutral-500 rounded-xl text-sm font-semibold text-neutral-400 hover:text-white transition-all font-sans">
            {done ? "Close" : "Cancel"}
          </button>
          {!done && (
            <button type="submit" form="create-room-form"
              disabled={loading || uploadState !== null || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-all font-sans shadow-lg shadow-violet-500/20">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                : uploadState
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                  : "Create Room"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
