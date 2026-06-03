import bookshelf from "@/assets/bookshelf.jpg";
import notebook from "@/assets/notebook.jpg";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

type LiveData = {
  books: number; reviews: number; quotes: number;
  current: { title: string; author: string | null; cover_url: string | null; page: number | null; total: number | null } | null;
  bio: string | null; archetype: string | null;
};

export function ReadingWorlds() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<LiveData | null>({
    queryKey: ["reading-world", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const [booksRes, reviewsRes, quotesRes, currentRes, profileRes] = await Promise.all([
        supabase.from("user_books").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("quotes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_books")
          .select("progress_page, updated_at, book:books(title, author, cover_url, page_count)")
          .eq("user_id", user.id).eq("status", "reading")
          .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        (supabase as any).from("profiles").select("bio, archetype").eq("id", user.id).maybeSingle(),
      ]);
      const cur: any = currentRes.data;
      const prof: any = profileRes.data;
      return {
        books: booksRes.count ?? 0,
        reviews: reviewsRes.count ?? 0,
        quotes: quotesRes.count ?? 0,
        current: cur?.book ? {
          title: cur.book.title, author: cur.book.author,
          cover_url: cur.book.cover_url,
          page: cur.progress_page ?? null, total: cur.book.page_count ?? null,
        } : null,
        bio: prof?.bio ?? null,
        archetype: prof?.archetype ?? null,
      };
    },
  });

  const live = !!user && !!data;
  const showSkeleton = !!user && isLoading;
  const fmt = (n: number) => (n > 0 ? n.toLocaleString() : "—");
  const pct = data?.current?.page && data?.current?.total
    ? Math.min(100, Math.round((data.current.page / data.current.total) * 100))
    : 0;

  return (
    <section id="worlds" className="relative py-28 md:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
          <div>
            <span className="chip">Reading Worlds</span>
            <h2 className="font-serif text-5xl md:text-7xl mt-4 max-w-3xl leading-[1] text-balance">
              A whole <em>tiny universe</em> at folio.app/you.
            </h2>
          </div>
          <p className="max-w-md text-foreground/65 text-lg">
            Not a profile. A living, scrollable answer to <em className="font-serif">who are you as a reader?</em> — built from what you read, save and love.
          </p>
        </div>

        {/* Anatomy of a Reading World — anonymous, illustrative */}
        <div className="grid lg:grid-cols-12 gap-5">
          {/* Big bio / identity card */}
          <div className="lg:col-span-7 rounded-3xl bg-forest-deep text-cream p-8 md:p-10 relative overflow-hidden min-h-[340px]">
            <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
            <p className="text-[11px] uppercase tracking-widest text-cream/50">your bio</p>
            <p className="font-serif text-4xl md:text-5xl mt-4 leading-tight max-w-lg italic">
              "{live && data?.bio ? data.bio : "books, dog-eared pages and the quiet between chapters."}"
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                ...(live && data?.archetype ? [data.archetype] : []),
                "slow reader", "dark academia", "translated lit", "poetry curious",
              ].map((t) => (
                <span key={t} className="text-xs px-3 py-1.5 rounded-full bg-cream/10 border border-cream/20">{t}</span>
              ))}
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 text-cream/80">
              {(live
                ? [[fmt(data!.books), "books"], [fmt(data!.reviews), "reviews"], [fmt(data!.quotes), "quotes"]]
                : [["127", "books"], ["89", "reviews"], ["412", "quotes"]]
              ).map(([n, l]) => (
                <div key={l}>
                  {showSkeleton ? (
                    <Skeleton className="h-9 w-16 bg-cream/20" />
                  ) : (
                    <p className="font-serif text-4xl text-gold">{n}</p>
                  )}
                  <p className="text-[11px] uppercase tracking-widest mt-1">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Currently reading */}
          <div className="lg:col-span-5 rounded-3xl bg-card border border-border p-7 min-h-[340px] flex flex-col">
            <p className="text-[11px] uppercase tracking-widest text-foreground/50">currently reading</p>
            {showSkeleton ? (
              <>
                <Skeleton className="h-8 w-2/3 mt-3" />
                <Skeleton className="h-4 w-1/3 mt-2" />
              </>
            ) : live && data?.current ? (
              <>
                <p className="font-serif text-3xl mt-3 leading-tight">{data.current.title}</p>
                <p className="text-sm text-foreground/60">{data.current.author ?? "Unknown"}</p>
                <div className="mt-5 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-rose" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-foreground/60">
                  {data.current.page && data.current.total
                    ? `page ${data.current.page} of ${data.current.total} · ${pct}%`
                    : "just started"}
                </p>
              </>
            ) : live ? (
              <>
                <p className="font-serif text-3xl mt-3 leading-tight italic text-foreground/50">nothing yet</p>
                <p className="text-sm text-foreground/60">add a book to your shelf to start</p>
              </>
            ) : (
              <>
                <p className="font-serif text-3xl mt-3 leading-tight">Pachinko</p>
                <p className="text-sm text-foreground/60">Min Jin Lee</p>
                <div className="mt-5 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[62%] bg-rose" />
                </div>
                <p className="mt-2 text-xs text-foreground/60">page 312 of 496 · 62%</p>
              </>
            )}

            <div className="mt-auto pt-6 border-t border-border">
              <p className="text-[11px] uppercase tracking-widest text-foreground/50 mb-3">today's note</p>
              <p className="font-serif italic text-lg leading-snug">"history has failed us, but no matter."</p>
            </div>
          </div>

          {/* Favorite shelf */}
          <div className="lg:col-span-5 rounded-3xl border border-border overflow-hidden bg-ivory">
            <img src={bookshelf} alt="Reading world shelf" loading="lazy" className="h-44 w-full object-cover" />
            <div className="p-7">
              <p className="text-[11px] uppercase tracking-widest text-foreground/50">favorite shelf</p>
              <p className="font-serif text-3xl mt-2">Books that broke me, kindly.</p>
              <p className="text-sm text-foreground/60 mt-2">a slow-burning shelf of grief, light and quiet survival.</p>
            </div>
          </div>

          {/* Quote */}
          <div className="lg:col-span-4 rounded-3xl bg-rose text-ivory p-8 flex flex-col justify-between min-h-[260px]">
            <span className="font-serif text-7xl leading-none opacity-40">"</span>
            <p className="font-serif text-2xl leading-snug -mt-6">
              The most beautiful experiences we can have are the mysterious.
            </p>
            <p className="mt-4 text-[11px] uppercase tracking-widest opacity-70">saved from a notebook</p>
          </div>

          {/* Year so far */}
          <div className="lg:col-span-3 rounded-3xl bg-gold text-ink p-7 flex flex-col justify-between min-h-[260px]">
            <p className="text-[11px] uppercase tracking-widest opacity-60">2026 so far</p>
            <div>
              <p className="font-serif text-7xl leading-none">42</p>
              <p className="font-serif text-xl italic">books in</p>
            </div>
            <div className="grid grid-cols-12 gap-0.5">
              {Array.from({ length: 36 }).map((_, i) => (
                <div key={i} className="h-3 rounded-sm" style={{ background: `oklch(0.2 0.015 60 / ${Math.random() * 0.7 + 0.05})` }} />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="lg:col-span-5 rounded-3xl border border-border overflow-hidden bg-card">
            <div className="p-7">
              <p className="text-[11px] uppercase tracking-widest text-foreground/50">from your notebook</p>
              <p className="font-serif text-2xl mt-3 leading-snug">
                margin scribbles, screenshots, half-thoughts and the lines you keep coming back to.
              </p>
            </div>
            <img src={notebook} alt="" loading="lazy" className="h-40 w-full object-cover" />
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-foreground/55">
          everything you see above is yours to arrange, theme, and share — or keep entirely private.
        </p>
      </div>
    </section>
  );
}
