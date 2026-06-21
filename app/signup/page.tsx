"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Play, Mail, Lock, Eye, EyeOff, Loader2, User, AtSign, ArrowRight } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !email || !password) { setError("All fields are required."); return; }
    setError(null);
    setLoading(true);
    await authClient.signUp.email(
      { email, password, name, username, callbackURL: "/dashboard" },
      {
        onRequest: () => setLoading(true),
        onSuccess: () => { setLoading(false); router.push("/dashboard"); router.refresh(); },
        onError: (ctx) => { setLoading(false); setError(ctx.error.message || "Failed to create account."); },
      }
    );
  };

  return (
    <div className="min-h-screen flex bg-neutral-950">
      {/* ── left panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-neutral-900/60 border-r border-neutral-800 p-10 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />
        <Link href="/" className="flex items-center gap-2 z-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Play className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-base font-extrabold tracking-widest text-white uppercase font-sans">VISO</span>
        </Link>
        <div className="z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-widest font-sans">
            Free forever
          </div>
          <h2 className="text-3xl font-extrabold text-white leading-snug font-sans">
            Join the party.<br />
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              It&apos;s free.
            </span>
          </h2>
          <ul className="space-y-2">
            {["Unlimited watch parties", "HD synchronized playback", "Voice & video chat", "Real-time reactions"].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-neutral-400 font-sans">
                <div className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                </div>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="z-10 flex items-center gap-3">
          <div className="flex -space-x-2">
            {["from-violet-500 to-fuchsia-500","from-blue-500 to-cyan-500","from-emerald-500 to-teal-500","from-orange-500 to-rose-500"].map((g, i) => (
              <div key={i} className={`w-8 h-8 rounded-full bg-gradient-to-br ${g} border-2 border-neutral-900`} />
            ))}
          </div>
          <p className="text-xs text-neutral-500 font-sans">Join 10K+ users today</p>
        </div>
      </div>

      {/* ── right panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm z-10">
          {/* mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="text-sm font-extrabold tracking-widest text-white uppercase font-sans">VISO</span>
          </div>

          <h1 className="text-2xl font-extrabold text-white font-sans mb-1">Create your account</h1>
          <p className="text-sm text-neutral-500 font-sans mb-8">Start watching together for free</p>

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 font-sans">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 font-sans">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe" required
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-xl text-sm outline-none transition-all placeholder-neutral-700 text-white font-sans"
                />
              </div>
            </div>

            {/* username */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 font-sans">Username</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe" required
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-xl text-sm outline-none transition-all placeholder-neutral-700 text-white font-sans"
                />
              </div>
            </div>

            {/* email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 font-sans">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-xl text-sm outline-none transition-all placeholder-neutral-700 text-white font-sans"
                />
              </div>
            </div>

            {/* password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 font-sans">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters" required
                  className="w-full pl-10 pr-10 py-2.5 bg-neutral-900 border border-neutral-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-xl text-sm outline-none transition-all placeholder-neutral-700 text-white font-sans"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60 rounded-xl text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-all font-sans mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-600 font-sans mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
