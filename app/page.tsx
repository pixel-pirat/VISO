import Link from "next/link";
import {
  Play, Users, MessageSquare, Zap, Globe, Lock,
  ArrowRight, Star, X, Link2,
  Tv2, ChevronRight, Radio,
} from "lucide-react";

/* ─── tiny reusable pieces ─────────────────────────────────── */

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-neutral-400 hover:text-white transition-colors font-sans"
    >
      {children}
    </Link>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-widest font-sans">
      {children}
    </span>
  );
}

function FeatureCard({
  icon: Icon, title, desc,
}: {
  icon: React.ElementType; title: string; desc: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/60 hover:border-violet-500/30 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-violet-400" />
      </div>
      <h3 className="text-sm font-bold text-white font-sans">{title}</h3>
      <p className="text-xs text-neutral-500 leading-relaxed font-sans">{desc}</p>
    </div>
  );
}

function StepCard({
  num, title, desc,
}: {
  num: string; title: string; desc: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 relative">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-violet-500/20 font-sans">
        {num}
      </div>
      <h3 className="text-sm font-bold text-white font-sans">{title}</h3>
      <p className="text-xs text-neutral-500 leading-relaxed font-sans max-w-[160px]">{desc}</p>
    </div>
  );
}

function RoomCard({
  title, genre, viewers, live,
}: {
  title: string; genre: string; viewers: string; live?: boolean;
}) {
  return (
    <div className="flex-shrink-0 w-44 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-violet-500/40 transition-colors group cursor-pointer">
      <div className="relative h-24 bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
        <Tv2 className="w-8 h-8 text-neutral-700 group-hover:text-violet-500 transition-colors" />
        {live && (
          <span className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded text-white text-[10px] font-bold font-sans">
            <Radio className="w-2.5 h-2.5" /> LIVE
          </span>
        )}
        <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-neutral-300 font-sans">
          <Users className="w-2.5 h-2.5" /> {viewers}
        </span>
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-white truncate font-sans">{title}</p>
        <p className="text-[10px] text-neutral-500 mt-0.5 font-sans">{genre}</p>
        <button className="mt-2 w-full py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold transition-colors font-sans">
          Join Room
        </button>
      </div>
    </div>
  );
}

function TestimonialCard({
  quote, name,
}: {
  quote: string; name: string;
}) {
  return (
    <div className="flex flex-col gap-4 p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/60">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="text-sm text-neutral-300 leading-relaxed font-sans">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-2 mt-auto">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
        <div>
          <p className="text-xs font-semibold text-white font-sans">{name}</p>
          <p className="text-[10px] text-neutral-500 font-sans">Verified User</p>
        </div>
      </div>
    </div>
  );
}

/* ─── page ─────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-neutral-800/60 backdrop-blur-xl bg-neutral-950/80">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="text-sm font-extrabold tracking-widest text-white uppercase font-sans">
              VISO
            </span>
          </Link>
          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#rooms">Rooms</NavLink>
            <NavLink href="#about">About</NavLink>
            <NavLink href="#pricing">Pricing</NavLink>
          </nav>
          {/* Auth */}
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-neutral-400 hover:text-white transition-colors font-sans hidden sm:block">
              Login
            </Link>
            <Link
              href="/signup"
              className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg text-sm font-semibold text-white transition-all font-sans shadow-lg shadow-violet-500/20"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* glows */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 -right-40 w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* left */}
          <div className="flex flex-col gap-6 z-10">
            <Badge><Radio className="w-3 h-3" /> Watch Parties, Reimagined</Badge>
            <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.08] tracking-tight text-white font-sans">
              Watch Together.<br />
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Experience Together.
              </span>
            </h1>
            <p className="text-base text-neutral-400 leading-relaxed max-w-md font-sans">
              Create or join synchronized watch parties with video, voice, live chat and real-time reactions.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all group font-sans"
              >
                Start Watching <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="#rooms"
                className="inline-flex items-center gap-2 px-5 py-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-xl text-sm font-semibold text-neutral-300 hover:text-white transition-all font-sans"
              >
                Explore Rooms
              </Link>
            </div>
            <p className="text-xs text-neutral-600 font-sans">10K+ users are watching together now</p>
          </div>

          {/* right — mock player UI */}
          <div className="relative z-10 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/60 shadow-2xl shadow-black/40">
            {/* top bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500 rounded text-white text-[10px] font-bold font-sans">
                  <Radio className="w-2.5 h-2.5" /> LIVE
                </span>
                <span className="text-xs text-neutral-400 font-sans">2.5k watching</span>
              </div>
              <span className="text-xs text-neutral-500 font-sans">Room Chat</span>
            </div>
            {/* player area */}
            <div className="aspect-video bg-gradient-to-br from-indigo-900/60 via-neutral-900 to-neutral-950 flex items-center justify-center relative">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </div>
              {/* fake film strip thumbnails */}
              <div className="absolute bottom-3 inset-x-3 flex gap-1.5 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-1 h-10 rounded-md bg-neutral-800/80 border border-neutral-700/60" />
                ))}
              </div>
            </div>
            {/* chat strip */}
            <div className="px-4 py-3 space-y-2 bg-neutral-900/80">
              {[
                { user: "Kavin", msg: "This scene is insane! 🔥", emoji: "🔥", count: 154 },
                { user: "Sara", msg: "That fight scene gave me chills", emoji: "😮", count: 88 },
                { user: "Daniel", msg: "The animation quality is next level", emoji: "🤩", count: 221 },
              ].map((m) => (
                <div key={m.user} className="flex items-start gap-2 text-xs">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-violet-400 font-sans">{m.user} </span>
                    <span className="text-neutral-400 font-sans">{m.msg}</span>
                  </div>
                  <span className="text-lg leading-none">{m.emoji}</span>
                  <span className="text-neutral-600 font-sans ml-0.5">{m.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6 border-t border-neutral-900">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <Badge>How it works</Badge>
          <h2 className="mt-4 text-3xl font-extrabold text-white font-sans">
            Three simple steps to your next movie night
          </h2>
        </div>
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
          {/* connector lines */}
          <div className="hidden sm:block absolute top-6 left-[calc(33%-8px)] right-[calc(33%-8px)] h-px bg-gradient-to-r from-violet-500/30 via-fuchsia-500/30 to-violet-500/30" />
          <StepCard num="1" title="Create Room" desc="Create your own virtual theatre in seconds. Make it public or invite-only." />
          <StepCard num="2" title="Invite Friends" desc="Share the link with your friends. They can join instantly from any device." />
          <StepCard num="3" title="Watch Together" desc="Enjoy movies, voice & video chat, live reactions and an amazing experience." />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 px-6 border-t border-neutral-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge>Built for shared experiences</Badge>
            <h2 className="mt-4 text-3xl font-extrabold text-white font-sans">
              Everything you need for the perfect watch party
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FeatureCard icon={Play}    title="Synchronized Playback"   desc="Everyone stays in sync, always." />
            <FeatureCard icon={Tv2}     title="Video Communication"     desc="See your friends while you watch." />
            <FeatureCard icon={MessageSquare} title="Voice Chat"        desc="High quality voice chat with your crew." />
            <FeatureCard icon={Zap}     title="Live Reactions"          desc="React in real-time with emojis." />
            <FeatureCard icon={Globe}   title="Public Rooms"            desc="Join live rooms and meet new people." />
            <FeatureCard icon={Lock}    title="Private Rooms"           desc="Only invite who you want." />
          </div>
        </div>
      </section>

      {/* ── POPULAR ROOMS ── */}
      <section id="rooms" className="py-20 px-6 border-t border-neutral-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <Badge><Radio className="w-3 h-3" /> Live Now</Badge>
              <h2 className="mt-3 text-2xl font-extrabold text-white font-sans">Popular Live Rooms</h2>
              <p className="text-sm text-neutral-500 font-sans mt-1">Join thousands of users in live watch parties</p>
            </div>
            <button className="hidden sm:flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 font-semibold font-sans transition-colors">
              View all rooms <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
            <RoomCard title="Solo Leveling"     genre="Anime · Action"  viewers="2.5k" live />
            <RoomCard title="Avengers: Endgame" genre="Action · Sci-Fi" viewers="1.2k" live />
            <RoomCard title="The Batman"        genre="Action · Crime"  viewers="754"  live />
            <RoomCard title="Demon Slayer S3"   genre="Anime · Fantasy" viewers="890"  live />
            <RoomCard title="Interstellar"      genre="Sci-Fi · Drama"  viewers="632"  live />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-6 border-t border-neutral-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge>What our users say</Badge>
            <h2 className="mt-4 text-3xl font-extrabold text-white font-sans">
              Loved by thousands of movie lovers
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TestimonialCard quote="Movie nights with friends have never been better. VISO is a game changer!" name="Kavin" />
            <TestimonialCard quote="Feels like Discord and Netflix had the perfect baby." name="Danielle" />
            <TestimonialCard quote="The best way to watch anime with my squad. 10/10." name="Joshua" />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 border-t border-neutral-900">
        <div className="max-w-4xl mx-auto relative rounded-3xl overflow-hidden">
          {/* bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-fuchsia-600/20 to-neutral-950" />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8 p-10 border border-white/5 rounded-3xl backdrop-blur-sm">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-sans">
                Ready for your next watch party?
              </h2>
              <p className="text-sm text-neutral-400 mt-2 font-sans">
                Create a room or join a live one in just a click.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all font-sans"
              >
                Start Watching <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-3 bg-neutral-900 border border-neutral-700 hover:border-neutral-500 rounded-xl text-sm font-semibold text-neutral-300 hover:text-white transition-all font-sans"
              >
                + Create a Room
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-900 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* brand */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <span className="text-sm font-extrabold tracking-widest text-white uppercase font-sans">VISO</span>
            </Link>
            <p className="text-xs text-neutral-500 font-sans leading-relaxed">
              Watch together.<br />Experience together.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="text-neutral-600 hover:text-neutral-300 transition-colors"><X className="w-4 h-4" /></a>
              <a href="#" className="text-neutral-600 hover:text-neutral-300 transition-colors"><Link2 className="w-4 h-4" /></a>
              <a href="#" className="text-neutral-600 hover:text-neutral-300 transition-colors"><Globe className="w-4 h-4" /></a>
            </div>
          </div>
          {/* cols */}
          {[
            { label: "Product",  links: ["Features", "Rooms", "Pricing", "Download"] },
            { label: "Company",  links: ["About Us", "Blog", "Careers", "Contact"] },
            { label: "Support",  links: ["Help Center", "Community", "Terms of Service", "Privacy Policy"] },
          ].map((col) => (
            <div key={col.label} className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 font-sans">{col.label}</p>
              {col.links.map((l) => (
                <a key={l} href="#" className="text-xs text-neutral-600 hover:text-neutral-300 transition-colors font-sans">{l}</a>
              ))}
            </div>
          ))}
          {/* newsletter */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 font-sans">Newsletter</p>
            <p className="text-xs text-neutral-600 font-sans">Get the latest updates and new features.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg text-xs outline-none text-neutral-200 placeholder-neutral-600 font-sans"
              />
              <button className="px-3 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors">
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-neutral-900">
          <p className="text-xs text-neutral-700 font-sans text-center">
            © 2026 VISO. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
