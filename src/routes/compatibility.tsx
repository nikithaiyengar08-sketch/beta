import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/folio/Footer";
import { LockedPreview } from "@/components/folio/LockedPreview";
import { useAuth } from "@/lib/auth-context";
import { usePremium } from "@/lib/premium";
import { dnaForSeed, compatibility, similarReaders } from "@/lib/dna";
import { useReaders, useBooks, type CatalogBook } from "@/lib/use-real-data";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/compatibility")({
  head: () => ({
    meta: [
      { title: "Reading Compatibility · Folio" },
      { name: "description", content: "See how your reading taste lines up with friends, partners and the people you follow." },
      { property: "og:title", content: "Reading Compatibility · Folio" },
    ],
  }),
  component: CompatibilityPage,
});

function pickBooks(seed: string, books: CatalogBook[], n: number) {
  if (books.length === 0) return [];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  const arr = [...books];
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) | 0;
    const j = Math.abs(h) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

function CompatibilityPage() {
  const { user, displayName } = useAuth();
  const { isPremium } = usePremium();
  const { data: readers = [], isLoading } = useReaders({ excludeId: user?.id });
  const { data: books = [] } = useBooks();

  const mine = useMemo(() => dnaForSeed(user?.id || "guest"), [user?.id]);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (!selected && readers[0]) setSelected(readers[0].id);
  }, [readers, selected]);

  const them = useMemo(() => {
    const r = readers.find((x) => x.id === selected) ?? readers[0];
    return r ? { reader: r, dna: dnaForSeed(r.id) } : null;
  }, [selected, readers]);

  const compat = useMemo(
    () => (them ? compatibility(mine, them.dna) : null),
    [mine, them],
  );
  const ranked = useMemo(
    () => similarReaders(mine, readers, (r) => r.id),
    [mine, readers],
  );
  const sharedBooks = useMemo(() => {
    if (!them || books.length === 0) return [];
    const myBooks = pickBooks(user?.id || "guest", books, 8);
    const theirBooks = pickBooks(them.reader.id, books, 8);
    return myBooks.filter((b) => theirBooks.some((t) => t.id === b.id));
  }, [user?.id, them, books]);

  return (
    <main className="min-h-screen bg-background text-foreground">

      <section className="mx-auto max-w-5xl px-5 sm:px-6 py-10">
        <p className="text-xs uppercase tracking-[0.25em] text-rose">Compatibility</p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-2">How your taste lines up.</h1>
        <p className="mt-2 text-foreground/70 max-w-2xl">
          Pick a reader to see your overlap — shared genres, traits and books — with a score that
          gets warmer the closer your reading lives sit.
        </p>

        {isLoading ? (
          <div className="mt-10 text-sm text-foreground/60">Loading readers…</div>
        ) : readers.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center">
            <p className="font-serif text-xl">No one to compare with yet.</p>
            <p className="mt-1 text-sm text-foreground/60">Invite a friend to join and find your reading twin.</p>
          </div>
        ) : (
          <div className="mt-8 grid lg:grid-cols-[1fr_2fr] gap-6">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[11px] uppercase tracking-widest text-foreground/50 mb-3">Compare with</p>
              <ul className="space-y-1">
                {readers.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelected(r.id)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl ${selected === r.id ? "bg-muted" : "hover:bg-muted/50"}`}
                    >
                      <img src={r.avatar} alt={r.name} className="h-9 w-9 rounded-full" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{r.name}</p>
                        <p className="text-[11px] text-foreground/60 truncate">{r.archetype}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-5">
              {them && compat && (
                <LockedPreview
                  isPremium={isPremium}
                  title="Unlock full compatibility"
                  blurb="See the full overlap with everyone you follow, plus a private weekly digest of new strong matches."
                >
                  <div className="rounded-3xl border border-border bg-card p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-serif text-2xl">{displayName || "You"} × {them.reader.name}</p>
                        <p className="text-sm text-foreground/70 mt-1">{compat.blurb}</p>
                      </div>
                      <ScoreRing score={compat.score} />
                    </div>

                    <div className="mt-6 grid sm:grid-cols-3 gap-4 text-sm">
                      <Block title="Shared genres" items={compat.sharedGenres} fallback="No overlap yet" />
                      <Block title="Shared traits" items={compat.sharedTraits} fallback="—" />
                      <Block title="Shared books" items={sharedBooks.map((b) => b.title)} fallback="None in common yet" />
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <button className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm min-h-11">
                        Send a book swap →
                      </button>
                      <Link to="/readers" className="rounded-full border border-border px-5 py-2.5 text-sm min-h-11 inline-flex items-center">
                        See more readers like {them.reader.name}
                      </Link>
                    </div>
                  </div>
                </LockedPreview>
              )}

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="font-serif text-xl mb-3">Top matches</p>
                <ul className="divide-y divide-border">
                  {ranked.map(({ reader, score, sharedGenres }) => (
                    <li key={reader.id} className="py-2.5 flex items-center gap-3">
                      <img src={reader.avatar} className="h-9 w-9 rounded-full" alt={reader.name} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{reader.name} <span className="text-foreground/50">· {reader.archetype}</span></p>
                        <p className="text-[11px] text-foreground/60 truncate">
                          {sharedGenres.slice(0, 3).join(" · ") || "No genre overlap yet"}
                        </p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full ${score > 75 ? "bg-rose/15 text-rose" : score > 55 ? "bg-gold/15" : "bg-muted"}`}>
                        {score}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}

function Block({ title, items, fallback }: { title: string; items: string[]; fallback: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-foreground/50 mb-1.5">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-foreground/50 italic">{fallback}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((x) => <li key={x} className="text-sm">{x}</li>)}
        </ul>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90">
        <circle cx="32" cy="32" r={r} stroke="currentColor" strokeWidth="6" className="text-muted" fill="none" />
        <circle cx="32" cy="32" r={r} stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          className={score > 75 ? "text-rose" : score > 55 ? "text-gold" : "text-foreground/60"}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-serif text-lg">{score}%</span>
      </div>
    </div>
  );
}
