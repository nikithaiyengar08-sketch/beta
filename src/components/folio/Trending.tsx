import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

type Book = { id: string; title: string; author: string | null; cover_url: string | null; genres: string[] | null; reads: number };

export function Trending() {
  const [books, setBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<{ genre: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 30-day trending books by user_books inserts
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data: ub } = await supabase
        .from("user_books")
        .select("book_id, book:books(id, title, author, cover_url, genres)")
        .gte("created_at", since)
        .limit(500);
      if (cancelled) return;

      const tally = new Map<string, { b: any; n: number }>();
      const genreTally = new Map<string, number>();
      for (const row of (ub ?? []) as any[]) {
        if (!row.book) continue;
        const cur = tally.get(row.book.id) ?? { b: row.book, n: 0 };
        cur.n++; tally.set(row.book.id, cur);
        for (const g of (row.book.genres ?? []).slice(0, 2)) {
          genreTally.set(g, (genreTally.get(g) ?? 0) + 1);
        }
      }
      const top = [...tally.values()].sort((a, b) => b.n - a.n).slice(0, 8)
        .map(({ b, n }): Book => ({ id: b.id, title: b.title, author: b.author, cover_url: b.cover_url, genres: b.genres, reads: n }));
      const topGenres = [...genreTally.entries()].map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count).slice(0, 12);
      setBooks(top); setGenres(topGenres); setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <span className="chip">Trending · last 30 days</span>
          <h2 className="font-serif text-5xl md:text-6xl mt-4 leading-[1]">What Folio is reading <em>right now.</em></h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : books.length === 0 ? (
          <p className="text-foreground/60 py-12 text-center">No trending books yet — add the first one.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {books.map((b, i) => (
              <div key={b.id} className="group">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg bg-muted">
                  {b.cover_url ? (
                    <img src={b.cover_url} alt={b.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-foreground/30 text-xs px-3 text-center">{b.title}</div>
                  )}
                  <span className="absolute top-2 left-2 text-[10px] uppercase tracking-widest bg-foreground text-background rounded-full px-2 py-1">#{i + 1}</span>
                </div>
                <p className="mt-3 font-serif text-base leading-tight line-clamp-2">{b.title}</p>
                <p className="text-xs text-foreground/60">{b.author ?? "Unknown"} · {b.reads} {b.reads === 1 ? "reader" : "readers"}</p>
              </div>
            ))}
          </div>
        )}

        {genres.length > 0 && (
          <div className="mt-20">
            <span className="chip">Genre pulse</span>
            <h3 className="font-serif text-3xl md:text-4xl mt-3 mb-6">Where the energy is.</h3>
            <div className="flex flex-wrap gap-3">
              {genres.map((g) => {
                const size = Math.min(2.5, 0.85 + g.count / Math.max(1, genres[0].count) * 1.6);
                return (
                  <Link
                    key={g.genre}
                    to="/discover"
                    className="rounded-full border border-border hover:border-foreground/40 px-5 py-2 capitalize transition-all hover:bg-foreground hover:text-background"
                    style={{ fontSize: `${size}rem`, lineHeight: 1.2 }}
                  >
                    {g.genre} <span className="text-[0.5em] opacity-50 align-middle">{g.count}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}