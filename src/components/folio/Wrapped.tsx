import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Stats = {
  booksRead: number;
  pagesRead: number;
  quotesSaved: number;
  reviewsWritten: number;
  monthly: { month: string; count: number }[];
  topGenres: { genre: string; count: number }[];
  favLine: { text: string; title: string; author: string | null } | null;
  topAuthor: { author: string; count: number } | null;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function Wrapped() {
  const { user, displayName } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!user) { setStats(null); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const yStart = `${year}-01-01`, yEnd = `${year}-12-31`;
        const [readRes, quotesRes, reviewsRes, favRes] = await Promise.all([
          supabase.from("user_books")
            .select("finished_at, book:books(page_count, genres, author)")
            .eq("user_id", user.id).eq("status", "read")
            .gte("finished_at", yStart).lte("finished_at", yEnd),
          supabase.from("quotes").select("id", { count: "exact", head: true })
            .eq("user_id", user.id).gte("created_at", yStart).lte("created_at", yEnd),
          supabase.from("reviews").select("id", { count: "exact", head: true })
            .eq("user_id", user.id).gte("created_at", yStart).lte("created_at", yEnd),
          supabase.from("reviews")
            .select("favorite_quote, stars, book:books(title, author)")
            .eq("user_id", user.id)
            .not("favorite_quote", "is", null)
            .order("stars", { ascending: false })
            .limit(1),
        ]);
        if (cancelled) return;

        const rows = (readRes.data ?? []) as any[];
        const monthly = MONTHS.map((m) => ({ month: m, count: 0 }));
        const genreTally = new Map<string, number>();
        const authorTally = new Map<string, number>();
        let pages = 0;
        for (const r of rows) {
          if (r.finished_at) {
            const m = new Date(r.finished_at).getMonth();
            monthly[m].count++;
          }
          pages += r.book?.page_count ?? 0;
          for (const g of (r.book?.genres ?? []).slice(0, 3)) genreTally.set(g, (genreTally.get(g) ?? 0) + 1);
          if (r.book?.author) authorTally.set(r.book.author, (authorTally.get(r.book.author) ?? 0) + 1);
        }
        const topGenres = [...genreTally.entries()].map(([genre, count]) => ({ genre, count })).sort((a,b) => b.count - a.count).slice(0, 5);
        const topAuthorEntry = [...authorTally.entries()].sort((a,b) => b[1] - a[1])[0];
        const fav = (favRes.data ?? [])[0] as any;

        setStats({
          booksRead: rows.length,
          pagesRead: pages,
          quotesSaved: quotesRes.count ?? 0,
          reviewsWritten: reviewsRes.count ?? 0,
          monthly,
          topGenres,
          favLine: fav?.favorite_quote && fav.book ? { text: fav.favorite_quote, title: fav.book.title, author: fav.book.author } : null,
          topAuthor: topAuthorEntry ? { author: topAuthorEntry[0], count: topAuthorEntry[1] } : null,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, year]);

  const downloadCard = async () => {
    if (!posterRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: "#fcfbf8",
        scale: 2,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 8000,
        onclone: (doc: Document) => {
          doc.querySelectorAll("img").forEach((img: HTMLImageElement) => {
            if (!img.complete || img.naturalWidth === 0) {
              img.style.visibility = "hidden";
            }
          });
        },
      });
      const link = document.createElement("a");
      link.download = `folio-${year}-wrapped.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Your share card is downloaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't generate image");
    } finally {
      setDownloading(false);
    }
  };


  if (!user) {
    return (
      <section className="py-28 text-center">
        <p className="font-serif text-3xl">Sign in to see your year in reading.</p>
      </section>
    );
  }

  if (loading || !stats) {
    return (
      <section className="py-28 mx-auto max-w-7xl px-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
        </div>
        <Skeleton className="h-72 rounded-3xl" />
      </section>
    );
  }

  const allZero = stats.booksRead === 0 && stats.pagesRead === 0 && stats.quotesSaved === 0 && stats.reviewsWritten === 0;
  const maxMonth = Math.max(...stats.monthly.map(m => m.count), 1);

  return (
    <section className="py-20 md:py-28 bg-ivory border-y border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <span className="chip">Year in Reading · {year}</span>
          <h2 className="font-serif text-4xl md:text-6xl mt-4">Your {year} so far.</h2>
        </div>

        {allZero ? (
          <div className="rounded-3xl bg-background border border-border p-12 text-center">
            <p className="font-serif text-2xl">Your reading year is just getting started.</p>
            <p className="mt-2 text-foreground/60">Add your first book to start tallying.</p>
          </div>
        ) : (
          <>
            {/* 3a Headline stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Books read" value={stats.booksRead} />
              <StatCard label="Pages read" value={stats.pagesRead.toLocaleString()} />
              <StatCard label="Quotes saved" value={stats.quotesSaved} />
              <StatCard label="Reviews written" value={stats.reviewsWritten} />
            </div>

            {/* 3b Reading Pace */}
            <div className="mt-10 rounded-3xl bg-background border border-border p-6 md:p-8">
              <h3 className="font-serif text-2xl mb-4">Reading pace</h3>
              {stats.booksRead === 0 ? (
                <p className="text-foreground/60 py-12 text-center">Finish a book to see your pace.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.monthly}>
                      <XAxis dataKey="month" stroke="currentColor" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} stroke="currentColor" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {stats.monthly.map((_, i) => <Cell key={i} fill="oklch(0.42 0.07 155)" />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 3c Top genres + 3e Most-read author */}
            <div className="grid lg:grid-cols-2 gap-6 mt-6">
              <div className="rounded-3xl bg-background border border-border p-6 md:p-8">
                <h3 className="font-serif text-2xl mb-4">Top genres</h3>
                {stats.topGenres.length === 0 ? (
                  <p className="text-foreground/60 py-8 text-center text-sm">Add genres when adding books to see your taste.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topGenres.map((g) => (
                      <div key={g.genre}>
                        <div className="flex justify-between text-xs mb-1"><span className="capitalize">{g.genre}</span><span>{g.count}</span></div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-burgundy" style={{ width: `${(g.count / stats.topGenres[0].count) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-3xl bg-background border border-border p-6 md:p-8">
                <h3 className="font-serif text-2xl mb-4">Most read author</h3>
                {stats.topAuthor ? (
                  <div className="text-center py-6">
                    <p className="font-serif text-4xl md:text-5xl">{stats.topAuthor.author}</p>
                    <p className="mt-2 text-foreground/60">{stats.topAuthor.count} {stats.topAuthor.count === 1 ? "book" : "books"} this year</p>
                  </div>
                ) : (
                  <p className="text-foreground/60 py-8 text-center text-sm">No author data yet.</p>
                )}
              </div>
            </div>

            {/* 3d Favourite quote */}
            <div className="mt-6 rounded-3xl bg-background border border-border p-8 md:p-12 text-center">
              <h3 className="font-serif text-2xl mb-6">Favourite quote of {year}</h3>
              {stats.favLine ? (
                <>
                  <p className="font-serif text-3xl md:text-5xl italic text-balance leading-snug">"{stats.favLine.text}"</p>
                  <p className="mt-6 text-sm text-foreground/60">— {stats.favLine.author ?? "Unknown"} · {stats.favLine.title}</p>
                </>
              ) : (
                <p className="text-foreground/60 py-4">Write a review and save a favourite quote to see it here.</p>
              )}
            </div>

            {/* 3f Share card */}
            <div className="mt-10">
              <h3 className="font-serif text-2xl mb-4">Share your year</h3>
              <div className="flex flex-col items-center gap-6">
                <div
                  ref={posterRef}
                  className="w-[360px] aspect-[9/16] rounded-3xl p-8 text-cream flex flex-col"
                  style={{ background: "linear-gradient(135deg, oklch(0.28 0.06 158), oklch(0.22 0.02 65), oklch(0.4 0.1 30))" }}
                >
                  <p className="text-[10px] uppercase tracking-[0.3em] opacity-70">Folio · {year}</p>
                  <p className="mt-3 font-serif text-3xl leading-tight">{displayName || "Reader"}'s year in reading</p>

                  <div className="mt-8 space-y-5">
                    <div>
                      <p className="font-serif text-7xl leading-none">{stats.booksRead}</p>
                      <p className="text-sm opacity-70 mt-1">books read</p>
                    </div>
                    <div>
                      <p className="font-serif text-4xl leading-none">{stats.pagesRead.toLocaleString()}</p>
                      <p className="text-sm opacity-70 mt-1">pages turned</p>
                    </div>
                    {stats.topAuthor && (
                      <div>
                        <p className="text-xs uppercase tracking-widest opacity-60">most read</p>
                        <p className="font-serif text-2xl mt-1">{stats.topAuthor.author}</p>
                      </div>
                    )}
                    {stats.topGenres[0] && (
                      <div>
                        <p className="text-xs uppercase tracking-widest opacity-60">top genre</p>
                        <p className="font-serif text-2xl capitalize mt-1">{stats.topGenres[0].genre}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-6 text-[10px] uppercase tracking-[0.3em] opacity-60">folio.app</div>
                </div>
                <Button onClick={downloadCard} disabled={downloading} size="lg">
                  {downloading ? "Generating…" : "Download share card"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl bg-background border border-border p-6">
      <p className="font-serif text-4xl md:text-5xl">{value}</p>
      <p className="text-xs text-foreground/60 uppercase tracking-widest mt-2">{label}</p>
    </div>
  );
}
