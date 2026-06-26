"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2, Camera, Save, User, AtSign, Tag, LogOut, Shield, Bell, Palette, Trash2, Check } from "lucide-react";
import { Sidebar } from "../_components/Sidebar";
import { Topbar } from "../_components/Topbar";

type ProfileUser = {
  id: string; name: string; email: string; username: string | null;
  displayName: string | null; avatarUrl: string | null; image: string | null;
  status: string; createdAt: string;
};

const STATUS_OPTIONS = [
  { value: "ONLINE",         label: "Online",         dot: "bg-emerald-500" },
  { value: "IDLE",           label: "Idle",            dot: "bg-yellow-500"  },
  { value: "DO_NOT_DISTURB", label: "Do Not Disturb",  dot: "bg-red-500"     },
  { value: "OFFLINE",        label: "Appear Offline",  dot: "bg-neutral-600" },
];

function SettingSection({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-6">
      <div className="mb-5">
        <h2 className="text-sm font-bold text-white font-sans">{title}</h2>
        <p className="text-xs text-neutral-500 font-sans mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 font-sans">{label}</label>
      {children}
    </div>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 rounded-xl text-sm text-white placeholder-neutral-600 outline-none transition-all font-sans" />
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const avatarRef = useRef<HTMLInputElement>(null);

  const [user,          setUser]          = useState<ProfileUser | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [uploadingAvatar, setUploading]   = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // Form state
  const [name,        setName]        = useState("");
  const [username,    setUsername]    = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status,      setStatus]      = useState("ONLINE");

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/profile")
      .then(r => r.json())
      .then(d => {
        const u = d.user as ProfileUser;
        setUser(u);
        setName(u.name ?? "");
        setUsername(u.username ?? "");
        setDisplayName(u.displayName ?? "");
        setStatus(u.status ?? "ONLINE");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session]);

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(prev => prev ? { ...prev, avatarUrl: data.avatarUrl, image: data.avatarUrl } : prev);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const res  = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, username: username || undefined, displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.issues ? data.issues.map((i: {message:string}) => i.message).join(", ") : data.error;
        setError(msg);
        return;
      }
      setUser(prev => prev ? { ...prev, ...data.user } : data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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

  const avatar   = user?.avatarUrl ?? user?.image ?? null;
  const initials = user?.name?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="flex h-screen bg-[#111113] text-neutral-200 overflow-hidden">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={session.user} unreadCount={0} />

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-extrabold text-white font-sans">Settings</h1>
                <p className="text-xs text-neutral-500 font-sans mt-0.5">Manage your account and preferences</p>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-colors font-sans shadow-lg shadow-violet-500/20">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 font-sans">{error}</div>
            )}

            {/* ── Avatar ── */}
            <SettingSection title="Profile Photo" desc="Upload a photo to personalise your account">
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-neutral-800 border border-neutral-700 overflow-hidden flex items-center justify-center">
                    {avatar
                      ? <img src={avatar} alt="" className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                      : <span className="text-2xl font-extrabold bg-linear-to-tr from-violet-400 to-fuchsia-400 bg-clip-text text-transparent font-sans">{initials}</span>}
                  </div>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
                  <button onClick={() => avatarRef.current?.click()} disabled={uploadingAvatar}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm font-semibold text-neutral-300 hover:text-white transition-colors font-sans">
                    <Camera className="w-3.5 h-3.5" /> {uploadingAvatar ? "Uploading…" : "Change Photo"}
                  </button>
                  <p className="text-[10px] text-neutral-600 font-sans">JPG, PNG, WEBP or GIF — max 5 MB</p>
                </div>
              </div>
            </SettingSection>

            {/* ── Profile Info ── */}
            <SettingSection title="Profile Information" desc="This is how others see you on VISO">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Full Name">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                      <Input placeholder="Your full name" value={name} onChange={e => setName(e.target.value)}
                        className="pl-10" style={{ paddingLeft: "2.5rem" }} />
                    </div>
                  </Field>
                  <Field label="Username">
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                      <Input placeholder="username" value={username} onChange={e => setUsername(e.target.value)}
                        style={{ paddingLeft: "2.5rem" }} />
                    </div>
                  </Field>
                </div>
                <Field label="Display Name (optional)">
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                    <Input placeholder="How you want to be called" value={displayName}
                      onChange={e => setDisplayName(e.target.value)} style={{ paddingLeft: "2.5rem" }} />
                  </div>
                  <p className="text-[10px] text-neutral-600 font-sans mt-1">Shown instead of your full name if set</p>
                </Field>
                <Field label="Email Address">
                  <Input value={user?.email ?? ""} disabled
                    className="opacity-50 cursor-not-allowed" />
                  <p className="text-[10px] text-neutral-600 font-sans mt-1">Email cannot be changed</p>
                </Field>
              </div>
            </SettingSection>

            {/* ── Status ── */}
            <SettingSection title="Presence Status" desc="Let friends know what you're up to">
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setStatus(opt.value)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold font-sans transition-all ${
                      status === opt.value
                        ? "bg-violet-600/20 border-violet-500 text-white"
                        : "bg-neutral-800/60 border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
                    }`}>
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.dot}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </SettingSection>

            {/* ── Account ── */}
            <SettingSection title="Account" desc="Manage your account security and sessions">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-violet-400" />
                    <div>
                      <p className="text-sm font-semibold text-white font-sans">Password</p>
                      <p className="text-xs text-neutral-500 font-sans">Managed by VISO Auth</p>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-600 font-sans">••••••••</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-violet-400" />
                    <div>
                      <p className="text-sm font-semibold text-white font-sans">Notifications</p>
                      <p className="text-xs text-neutral-500 font-sans">Friend requests, room invites</p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold font-sans">Enabled</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <Palette className="w-4 h-4 text-violet-400" />
                    <div>
                      <p className="text-sm font-semibold text-white font-sans">Appearance</p>
                      <p className="text-xs text-neutral-500 font-sans">Dark mode</p>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400 font-sans">Dark</span>
                </div>
              </div>
            </SettingSection>

            {/* ── Danger zone ── */}
            <SettingSection title="Account Actions" desc="Sign out or manage your session">
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleSignOut}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-neutral-700 hover:border-red-500/40 hover:bg-red-500/5 rounded-xl text-sm font-semibold text-neutral-400 hover:text-red-400 transition-all font-sans">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
                <button disabled
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-neutral-800 rounded-xl text-sm font-semibold text-neutral-700 cursor-not-allowed font-sans"
                  title="Contact support to delete your account">
                  <Trash2 className="w-4 h-4" /> Delete Account
                </button>
              </div>
            </SettingSection>

          </div>
        </div>
      </div>
    </div>
  );
}
