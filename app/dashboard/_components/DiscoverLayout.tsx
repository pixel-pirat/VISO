"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Loader2, Star, Play, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { tmdbFetch, IMG, type MediaItem, type TMDBPage } from "@/lib/tmdb-client";

/* ── helpers ──────────────────────────────────────────────────── */
function title(m: MediaItem) { return m.title ?? m.name ?? "Untitled"; }
function year(m: MediaItem)  { return (m.release_date ?? m.first_air_date ?? "").slice(0, 4); }
function rating(m: MediaItem){ return m.vote_average.toFixed(1); }

/* ── MediaCard ─────────────────────────────────────────────────── */
function MediaCard({ item, onPlay }: { item: MediaItem; onPlay: (item: MediaItem) => void }) {
  const poster = IMG.poster(item.poster_path, "w342");

  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-violet-500/50 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/10"
      onClick={() => onPlay(item)}
    >
      {/* poster */}
      <div className="aspect-[2/3] bg-neutral-800 overflow-hidden">
        {poster
          ? <img src={poster} alt={title(item)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> // eslint-disable-line @next/next/no-img-element
          : <div className="w-full h-full flex items-center justify-center"><Play className="w-8 h-8 text-neutral-700" /></div>}
      </div>

      {/* overlay on hover */}
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
        <button
          className="w-full flex items-center justify-center gap-2 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-xs font-bold text-white transition-colors font-sans mb-2"
          onClick={(e) => { e.stopPropagation(); onPlay(item); }}
        >
          <Play className="w-3.5 h-3.5 fill-white" /> Watch Trailer
        </button>
      </div>

      {/* info */}
      <div className="p-2.5">
        <p className="text-xs font-semibold text-white font-sans truncate leading-tight">{title(item)}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-neutral-500 font-sans">{year(item)}</span>
          <span className="flex items-center gap-0.5 text-[10px] text-yellow-400 font-semibold font-sans">
            <Star className="w-2.5 h-2.5 fill-yellow-400" />{rating(item)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── HeroSlider ────────────────────────────────────────────────── */
function HeroSlider({ items, onPlay }: { items: MediaItem[]; onPlay: (item: MediaItem) => void }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % items.length), 6000);
  }, [items.length]);

  useEffect(() => { start(); return () => { timerRef.current && clearInterval(timerRef.current); }; }, [start]);

  if (!items.length) return null;
  const item     = items[idx];
  const backdrop = IMG.backdrop(item.backdrop_path, "w1280");

  return (
    <div className="relative w-full rounded-2xl overflow-hidden mb-6" style={{ height: 340 }}>
      {backdrop
        ? <img src={backdrop} alt={title(item)} className="absolute inset-0 w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
        : <div className="absolute inset-0 bg-linear-to-br from-violet-900 to-indigo-950" />}
      <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/50 to-transparent" />

      {/* content */}
      <div className="absolute inset-0 flex flex-col justify-end p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400 font-sans mb-1">{year(item)}</p>
        <h2 className="text-3xl font-extrabold text-white font-sans leading-tight mb-2 max-w-xl">{title(item)}</h2>
        <p className="text-sm text-neutral-300 font-sans max-w-lg line-clamp-2 mb-4">{item.overview}</p>
        <div className="flex items-center gap-3">
          <button onClick={() => onPlay(item)}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-bold text-white transition-colors font-sans shadow-lg shadow-violet-500/20">
            <Play className="w-4 h-4 fill-white" /> Watch Trailer
          </button>
          <div className="flex items-center gap-1 text-sm text-yellow-400 font-semibold font-sans">
            <Star className="w-4 h-4 fill-yellow-400" /> {rating(item)}
          </div>
        </div>
      </div>

      {/* dots */}
      {items.length > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-3">
          <button onClick={() => { setIdx(i => (i - 1 + items.length) % items.length); start(); }}
            className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="flex gap-1">
            {items.map((_, i) => (
              <button key={i} onClick={() => { setIdx(i); start(); }}
                className={`rounded-full transition-all ${i === idx ? "w-4 h-1.5 bg-violet-400" : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"}`} />
            ))}
          </div>
          <button onClick={() => { setIdx(i => (i + 1) % items.length); start(); }}
            className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors">
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── TrailerModal ──────────────────────────────────────────────── */
function TrailerModal({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const type = item.title ? "movie" : "tv";
    tmdbFetch<{ results: { key: string; site: string; type: string; official: boolean }[] }>(
      `/${type}/${item.id}/videos`
    ).then(d => {
      const trailer = d.results.find(v => v.site === "YouTube" && v.type === "Trailer" && v.official)
        ?? d.results.find(v => v.site === "YouTube");
      setVideoKey(trailer?.key ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [item]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl bg-[#18181b] rounded-2xl overflow-hidden shadow-2xl border border-neutral-700/60">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white font-sans truncate">{title(item)}</p>
            <p className="text-[10px] text-neutral-500 font-sans">{year(item)} · ⭐ {rating(item)}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors shrink-0">
            <X className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        </div>

        <div className="aspect-video bg-black flex items-center justify-center">
          {loading ? (
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          ) : videoKey ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&modestbranding=1`}
              allow="autoplay; fullscreen"
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Play className="w-12 h-12 text-neutral-700" />
              <p className="text-sm text-neutral-500 font-sans">No trailer available</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          <p className="text-xs text-neutral-400 font-sans line-clamp-3">{item.overview}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Section with horizontal scroll ───────────────────────────── */
function ScrollSection({ title: sTitle, items, onPlay, loading }: {
  title: string; items: MediaItem[]; onPlay: (i: MediaItem) => void; loading: boolean;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-bold text-white font-sans mb-3">{sTitle}</h2>
      {loading ? (
        <div className="flex gap-3">
          {Array.from({length: 6}).map((_,i) => <div key={i} className="w-36 aspect-[2/3] rounded-xl bg-neutral-800/60 animate-pulse shrink-0" />)}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {items.map(item => <div key={item.id} className="shrink-0 w-36"><MediaCard item={item} onPlay={onPlay} /></div>)}
        </div>
      )}
    </section>
  );
}

/* ── Main export ───────────────────────────────────────────────── */
export interface DiscoverSection { title: string; path: string; params?: Record<string, string> }

interface DiscoverLayoutProps {
  pageTitle:   string;
  heroPath:    string;
  heroParams?: Record<string, string>;
  sections:    DiscoverSection[];
  searchPath:  string;
}

export function DiscoverLayout({ pageTitle, heroPath, heroParams, sections, searchPath }: DiscoverLayoutProps) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [hero,       setHero]       = useState<MediaItem[]>([]);
  const [sectionData,setSectionData]= useState<Record<string, MediaItem[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [query,      setQuery]      = useState("");
  const [searchRes,  setSearchRes]  = useState<MediaItem[]>([]);
  const [searching,  setSearching]  = useState(false);

  useEffect(() => { if (!isPending && !session) router.push("/login"); }, [session, isPending, router]);

  // Load hero
  useEffect(() => {
    if (!session) return;
    tmdbFetch<TMDBPage<MediaItem>>(heroPath, heroParams).then(d => setHero(d.results.slice(0, 8))).catch(() => {});
  }, [session, heroPath, heroParams]);

  // Load sections
  useEffect(() => {
    if (!session) return;
    sections.forEach(sec => {
      setLoadingMap(m => ({ ...m, [sec.title]: true }));
      tmdbFetch<TMDBPage<MediaItem>>(sec.path, sec.params)
        .then(d => { setSectionData(m => ({ ...m, [sec.title]: d.results })); setLoadingMap(m => ({ ...m, [sec.title]: false })); })
        .catch(() => setLoadingMap(m => ({ ...m, [sec.title]: false })));
    });
  }, [session, sections]);

  // Search
  useEffect(() => {
    if (query.length < 2) { setSearchRes([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      tmdbFetch<TMDBPage<MediaItem>>(searchPath, { query })
        .then(d => { setSearchRes(d.results); setSearching(false); })
        .catch(() => setSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [query, searchPath]);

  if (isPending || !session) {
    return <div className="min-h-screen flex items-center justify-center bg-[#111113]"><Loader2 className="w-7 h-7 text-violet-500 animate-spin" /></div>;
  }

  return (
    <div className="flex h-screen bg-[#111113] text-neutral-200 overflow-hidden">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={session.user} unreadCount={0} />

        <main className="flex-1 overflow-y-auto scrollbar-hide px-6 py-5">
          {/* Page title + search */}
          <div className="flex items-center justify-between gap-4 mb-5">
            <h1 className="text-lg font-extrabold text-white font-sans">{pageTitle}</h1>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${pageTitle.toLowerCase()}…`}
                className="w-full pl-9 pr-4 py-2 bg-neutral-800/60 border border-neutral-700/60 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 rounded-xl text-xs text-neutral-200 placeholder-neutral-600 outline-none font-sans"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 animate-spin" />}
            </div>
          </div>

          {/* Search results */}
          {query.length >= 2 && (
            <section className="mb-8">
              <h2 className="text-sm font-bold text-white font-sans mb-3">
                {searchRes.length > 0 ? `Results for "${query}"` : searching ? "Searching…" : `No results for "${query}"`}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {searchRes.map(item => <MediaCard key={item.id} item={item} onPlay={setActiveItem} />)}
              </div>
            </section>
          )}

          {/* Hero + sections — hidden when searching */}
          {query.length < 2 && (
            <>
              <HeroSlider items={hero} onPlay={setActiveItem} />
              {sections.map(sec => (
                <ScrollSection
                  key={sec.title}
                  title={sec.title}
                  items={sectionData[sec.title] ?? []}
                  onPlay={setActiveItem}
                  loading={loadingMap[sec.title] ?? true}
                />
              ))}
            </>
          )}
        </main>
      </div>

      {activeItem && <TrailerModal item={activeItem} onClose={() => setActiveItem(null)} />}
    </div>
  );
}
