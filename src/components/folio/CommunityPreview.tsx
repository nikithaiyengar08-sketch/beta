import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGate } from "@/components/auth/AuthGate";
import { Button } from "@/components/ui/button";

type RecentBook = { id: string; title: string; author: string | null; cover_url: string | null };

export function CommunityPreview() {
  const { openAuth } = useGate();
  const [books, setBooks] = useState<RecentBook[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const since = new Date(Date.now() - 30 * 86400_000).toISOString();
        const { data: ub } = await supabase
          .from("user_books")
          .select("book_id, book:books(id, title, author, cover_url)")
          .gte("created_at", since)
          .limit(300);
        const seen = new Map<string, RecentBook>();
        for (const r of (ub ?? []) as any[]) {
          if (r.book && !seen.has(r.book.id)) seen.set(r.book.id, r.book);
          if (seen.size >= 10) break;
        }
        setBooks([...seen.values()].slice(0, 8));
      } catch {}
    })();
  }, []);

  const STATS = [
    { n: "10K+", label: "readers" },
    { n: "40K+", label: "books tracked" },
    { n: "2K+", label: "reviews written" },
    { n: "500+", label: "reading rooms" },
  ];

  return (
    <section className="py-24 bg-forest-deep text-cream relative overflow-hidden">
      <div className="absolute inset-0 paper-grain opacity-20 pointer-events-none" />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-rose/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-14">
          <span className="chip bg-cream/10 text-cream/70 border-cream/20">The community</span>
          <h2 className="font-serif text-5xl md:text-6xl mt-4 leading-tight text-balance">
            Reading is better <em>together.</em>
          </h2>
          <p className="mt-5 text-cream/65 text-lg leading-relaxed">
            A quiet, thoughtful community of readers. Not influencers. Not algorithms. Just people who love books.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl bg-cream/5 border border-cream/10 p-6">
              <p className="font-serif text-4xl">{s.n}</p>
              <p className="text-cream/60 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent books grid */}
        {books.length > 0 && (
          <div className="mb-14">
            <p className="text-[11px] uppercase tracking-widest text-cream/50 mb-4">Currently being read</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
              {books.map((b) => (
                <div key={b.id} className="shrink-0 w-24 group">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-cream/10">
                    {b.cover_url ? (
                      <img src={b.cover_url} alt={b.title} className="h-full w-full object-cover group-hover:scale-105 transition" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] text-cream/40 p-2 text-center font-serif leading-tight">{b.title}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={openAuth} variant="outline" size="xl" className="border-cream/30 text-cream hover:bg-cream/10 hover:border-cream/60">
          Join the community →
        </Button>
      </div>
    </section>
  );
}
