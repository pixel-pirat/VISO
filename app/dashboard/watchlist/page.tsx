"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2, BookMarked, Play, X, Tv2, Film } from "lucide-react";
import { Sidebar } from "../_components/Sidebar";
import { Topbar } from "../_components/Topbar";
import { IMG } from "@/lib/tmdb-client";
import Link from "next/link";

type WatchlistItem = {
  id: string; tmdbId: number; mediaType: string;
  title: string; posterPath: string | null; addedAt: string;
};

export default function WatchlistPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [items,   setItems]   = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => { if (!isPending && !session) router.push("/login"); }, [session, isPending, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/library/watchlist")
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  const remove = async (id: string) => {
    setRemoving(id);
    await fetch(`/api/library/watchlist/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
    setRemoving(null);
  };

  if (isPending || !session) {
    return <div className="min-h-screen flex items-center justify-center bg-[#111113]"><Loader2 className="w-7 h-7 text-violet-500 animate-spin" /></div>;
  }

  const movies = items.filter(i => i.mediaType === "movie");
  const shows  = items.filter(i => i.mediaType === "tv");

  return (
    <div className="flex h-screen bg-[#111113] text-neutral-200 overflow-hidden">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={session.user} unreadCount={0} />

        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-extrabold text-white font-sans">Watchlist</h1>
              <p className="text-xs text-neutral-500 font-sans mt-0.5">{items.length} saved title{items.length !== 1 ? "s" : ""}</p>
            </div>
            <Link href="/dashboard/trending"
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold text-white transition-colors font-sans">
              <Play className="w-3.5 h-3.5 fill-white" /> Browse More
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {Array.from({length: 12}).map((_,i) => <div key={i} className="aspect-[2/3] rounded-xl bg-neutral-800/60 animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <BookMarked className="w-12 h-12 text-neutral-700" />
              <p className="text-sm text-neutral-500 font-sans">Your watchlist is empty</p>
              <p className="text-xs text-neutral-600 font-sans">Browse Discover and hit "+ Watchlist" on any title</p>
              <Link href="/dashboard/movies"
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold text-white transition-colors font-sans mt-1">
                Browse Movies
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {movies.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Film className="w-4 h-4 text-violet-400" />
                    <h2 className="text-sm font-bold text-white font-sans">Movies ({movies.length})</h2>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {movies.map(item => (
                      <WatchlistCard key={item.id} item={item} onRemove={remove} removing={removing === item.id} />
                    ))}
                  </div>
                </section>
              )}
              {shows.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Tv2 className="w-4 h-4 text-violet-400" />
                    <h2 className="text-sm font-bold text-white font-sans">TV Shows ({shows.length})</h2>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {shows.map(item => (
                      <WatchlistCard key={item.id} item={item} onRemove={remove} removing={removing === item.id} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WatchlistCard({ item, onRemove, removing }: {
  item: WatchlistItem; onRemove: (id: string) => void; removing: boolean;
}) {
  const poster = IMG.poster(item.posterPath, "w342");
  return (
    <div className="group relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-violet-500/40 transition-colors">
      <div className="aspect-[2/3] bg-neutral-800">
        {poster
          ? <img src={poster} alt={item.title} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
          : <div className="w-full h-full flex items-center justify-center"><Play className="w-6 h-6 text-neutral-700" /></div>}
      </div>
      <button
        onClick={() => onRemove(item.id)} disabled={removing}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
      >
        {removing ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <X className="w-3 h-3 text-white" />}
      </button>
      <div className="p-2">
        <p className="text-[10px] font-semibold text-white font-sans truncate">{item.title}</p>
        <p className="text-[9px] text-neutral-600 font-sans capitalize">{item.mediaType}</p>
      </div>
    </div>
  );
}
