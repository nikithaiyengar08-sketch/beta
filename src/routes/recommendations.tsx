import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/folio/Footer";
import { LockedPreview } from "@/components/folio/LockedPreview";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { usePremium } from "@/lib/premium";
import { dnaForSeed, similarReaders } from "@/lib/dna";
import { useFollows } from "@/lib/engagement";
import { useBooks, useReaders, type CatalogBook } from "@/lib/use-real-data";
import { useMemo } from "react";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendations · Folio" },
      { name: "description", content: "Books picked from your Reader DNA, your follows, and what's trending in the genres you love." },
      { property: "og:title", content: "Recommendations · Folio" },
    ],
  }),
  component: RecsPage,
});

function pick(seed: string, books: CatalogBook[], n: number, exclude: Set<string> = new Set()): CatalogBook[] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  const arr = books.filter((b) => !exclude.has(b.id));
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) | 0;
    const j = Math.abs(h) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

function RecsPage() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const seed = user?.id || "guest";
  const mine = useMemo(() => dnaForSeed(seed), [seed]);
  const follows = useFollows(seed);
  const { data: books = [], isLoading } = useBooks();
  const { data: readers = [] } = useReaders({ excludeId: user?.id });

  const because = useMemo(() => pick(seed, books, 4), [seed, books]);
  const becauseAnchor = because[0];
  const more = useMemo(
    () => pick(seed + ":2", books, 4, new Set(because.map((b) => b.id))),
    [seed, books, because],
  );
  const topGenre = mine.genres[0]?.genre ?? "Literary Fiction";
  const trending = useMemo(
    () => books.filter((b) => b.genre === topGenre).slice(0, 4),
    [books, topGenre],
  );
  const friendsRecs = useMemo(() => {
    if (readers.length === 0) return [];
    const followedIds = follows.all.length ? follows.all : readers.slice(0, 2).map((r) => r.id);
    const candidates = similarReaders(
      mine,
      readers.filter((r) => followedIds.includes(r.id)),
      (r) => r.id,
    );
    const ids = new Set<string>();
    const out: CatalogBook[] = [];
    candidates.forEach((c) =>
      pick(c.reader.id, books, 2).forEach((b) => {
        if (!ids.has(b.id)) {
          ids.add(b.id);
          out.push(b);
        }
      }),
    );
    return out.slice(0, 4);
  }, [follows.all, mine, readers, books]);

  return (
    <main className="min-h-screen bg-background text-foreground">

      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-10 animate-fade-in-soft">
        <p className="text-xs uppercase tracking-[0.25em] text-rose">For you</p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-2">Picked from your DNA.</h1>
        <p className="mt-2 text-foreground/70 max-w-2xl leading-relaxed">
          Recommendations from the books you've loved, the readers you follow, and the corners of
          the catalog matching your archetype. Every shelf below explains where it came from.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          <Link to="/dna" className="story-link text-foreground/70 hover:text-foreground">How your DNA shapes this</Link>
          <span className="text-foreground/30">·</span>
          <Link to="/readers" className="story-link text-foreground/70 hover:text-foreground">Add more readers to your circle</Link>
          <span className="text-foreground/30">·</span>
          <Link to="/rooms" className="story-link text-foreground/70 hover:text-foreground">Join a reading room</Link>
        </div>

        {isLoading ? (
          <div className="mt-10 text-sm text-foreground/60">Pulling fresh picks…</div>
        ) : books.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center">
            <p className="font-serif text-xl">No books in the catalogue yet.</p>
            <p className="mt-1 text-sm text-foreground/60">
              Search and add the first book — the more you log, the sharper your picks get.
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link to="/discover">Add your first book</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Section
              title={`Because you read ${becauseAnchor?.title ?? "your last book"}`}
              why={`We matched themes, pacing and tone against the ${mine.genres[0]?.genre ?? "books"} on your shelf.`}
              books={because}
            />
            <Section
              title="Readers like you also loved"
              why={`Picked from shelves of readers whose Reader DNA overlaps most with yours.`}
              books={more}
            />
            {trending.length > 0 && (
              <Section
                title={`Trending in ${topGenre}`}
                why={`${topGenre} is the top strand in your Reader DNA right now — these are climbing fast.`}
                books={trending}
              />
            )}

            <div className="mt-12">
              <div className="flex items-baseline justify-between mb-3 gap-3">
                <h2 className="font-serif text-2xl">Popular among friends</h2>
                <span className="text-[11px] text-foreground/55 uppercase tracking-widest">From people you follow</span>
              </div>
              <LockedPreview
                isPremium={isPremium}
                title="See what your circle is loving"
                blurb="A live ranking of the books the readers you follow have rated 4★+ in the last 60 days."
              >
                {friendsRecs.length > 0 ? (
                  <Grid books={friendsRecs} />
                ) : (
                  <p className="text-sm text-foreground/60 p-4">
                    Follow some readers and their favourites will show up here.
                  </p>
                )}
              </LockedPreview>
            </div>
          </>
        )}

        {/* What's next */}
        <div className="mt-14 card-surface p-6 sm:p-8 bg-gradient-warm">
          <p className="text-xs uppercase tracking-[0.25em] text-burgundy">What's next</p>
          <h2 className="font-serif text-2xl sm:text-3xl mt-2">Make these even better.</h2>
          <p className="mt-2 text-sm text-foreground/70 max-w-xl">
            Rate more books and add the ones you're currently reading — your DNA gets sharper, and
            so do the picks here.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to="/dna">Tune your DNA →</Link>
            </Button>
            <Link to="/readers" className="rounded-full border border-border bg-background/60 px-5 py-2.5 text-sm min-h-11 inline-flex items-center hover:border-foreground/40 transition">
              Find readers like you
            </Link>
            <Link to="/rooms" className="rounded-full border border-border bg-background/60 px-5 py-2.5 text-sm min-h-11 inline-flex items-center hover:border-foreground/40 transition">
              Join a reading room
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function Section({ title, why, books }: { title: string; why?: string; books: CatalogBook[] }) {
  if (books.length === 0) return null;
  return (
    <div className="mt-12">
      <div className="flex items-baseline justify-between mb-1 gap-3">
        <h2 className="font-serif text-2xl">{title}</h2>
      </div>
      {why && <p className="text-[12px] text-foreground/55 mb-4 max-w-xl">{why}</p>}
      <Grid books={books} />
    </div>
  );
}

function Grid({ books }: { books: CatalogBook[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
      {books.map((b) => (
        <Link key={b.id} to="/book/$bookId" params={{ bookId: b.id }} className="group block hover-lift">
          <div className="aspect-[2/3] rounded-xl bg-muted overflow-hidden shadow-book">
            <img
              src={b.cover}
              alt={b.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <p className="mt-2 font-serif text-base leading-tight line-clamp-2">{b.title}</p>
          <p className="text-xs text-foreground/60">{b.author}</p>
          <p className="text-[11px] text-foreground/50">{b.genre} · {b.year}</p>
        </Link>
      ))}
    </div>
  );
}
