import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Footer } from "@/components/folio/Footer";
import { LockedPreview } from "@/components/folio/LockedPreview";
import { ReaderDNACard } from "@/components/folio/ReaderDNACard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { usePremium } from "@/lib/premium";
import { dnaForSeed, compatibility, similarReaders } from "@/lib/dna";
import { useFollows } from "@/lib/engagement";
import { useBooks, useReaders, type CatalogBook } from "@/lib/use-real-data";
import { useEffect, useMemo, useState } from "react";

const searchSchema = z.object({
  tab: z.enum(["dna", "analytics", "compatibility", "recommendations"]).optional().catch("dna"),
  u: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/insights")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Insights · Folio" },
      { name: "description", content: "Your Reader DNA, analytics, compatibility and personalised recommendations — all in one place." },
      { property: "og:title", content: "Insights · Folio" },
    ],
  }),
  component: InsightsPage,
});

const TABS = [
  { id: "dna", label: "DNA" },
  { id: "analytics", label: "Analytics" },
  { id: "compatibility", label: "Compatibility" },
  { id: "recommendations", label: "Recommendations" },
] as const;

type Tab = typeof TABS[number]["id"];

function InsightsPage() {
  const { tab = "dna", u } = useSearch({ from: "/insights" });
  const navigate = useNavigate();

  const setTab = (t: Tab) =>
    navigate({ to: "/insights", search: (prev) => ({ ...prev, tab: t }), replace: true });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-10">
        <p className="text-xs uppercase tracking-[0.25em] text-rose">Insights</p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-2">Your reading life, measured.</h1>
        <p className="mt-2 text-foreground/70 max-w-2xl">
          Everything about who you are as a reader — your DNA, stats, compatibility and picks.
        </p>

        {/* Tab bar */}
        <div className="mt-8 flex gap-1 overflow-x-auto rounded-2xl bg-muted p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === "dna" && <DNATab u={u} />}
          {tab === "analytics" && <AnalyticsTab />}
          {tab === "compatibility" && <CompatibilityTab />}
          {tab === "recommendations" && <RecommendationsTab />}
        </div>
      </section>
      <Footer />
    </main>
  );
}

/* ─── DNA TAB ─────────────────────────────────────────────────────────────── */

function DNATab({ u }: { u?: string }) {
  const { user, displayName } = useAuth();
  const { isPremium } = usePremium();
  const seed = u || user?.id || "guest";
  const dna = useMemo(() => dnaForSeed(seed), [seed]);

  return (
    <div>
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <ReaderDNACard dna={dna} displayName={displayName} username={u || null} />
        </div>

        <div className="space-y-6">
          <Section title="Genre breakdown">
            <div className="space-y-2.5">
              {dna.genres.map((g) => (
                <div key={g.genre}>
                  <div className="flex justify-between text-xs">
                    <span>{g.genre}</span>
                    <span className="text-foreground/60">{g.pct}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full bg-${g.color}`} style={{ width: `${g.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Reading personality">
            <p className="text-sm text-foreground/70 mb-3">{dna.archetype.description}</p>
            <LockedPreview
              isPremium={isPremium}
              title="Full trait breakdown"
              blurb="See every reading trait, your mood arc and era distribution — and watch them shift each month."
            >
              <div className="space-y-2.5">
                {dna.traits.map((t) => (
                  <div key={t.label}>
                    <div className="flex justify-between text-xs">
                      <span>{t.label}</span>
                      <span className="text-foreground/60">{t.value}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-foreground/80" style={{ width: `${t.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </LockedPreview>
          </Section>

          <Section title="Reading behavior">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Mini label="Pace" value={dna.pace} />
              <Mini label="Rereader index" value={`${dna.rereader}/100`} />
              <Mini label="Top mood" value={dna.moodArc[0]?.mood ?? "—"} />
              <Mini label="Era anchor" value={dna.era.sort((a, b) => b.pct - a.pct)[0]?.label ?? "—"} />
            </div>
            <LockedPreview isPremium={isPremium} compact title="Format & era charts" blurb="Print vs ebook vs audio. Pre-1950 vs contemporary. The whole picture.">
              <div className="mt-4 space-y-3">
                <BarRow label="Formats" rows={dna.format} />
                <BarRow label="Eras" rows={dna.era} />
              </div>
            </LockedPreview>
          </Section>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <Link to="/readers" className="rounded-full border border-border px-5 py-2.5 text-sm min-h-11 inline-flex items-center">
          Find readers like you
        </Link>
      </div>
    </div>
  );
}

/* ─── ANALYTICS TAB ───────────────────────────────────────────────────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function seriesForSeed(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  const rng = () => { h = (h * 1664525 + 1013904223) | 0; return ((h >>> 0) % 10000) / 10000; };
  const books = MONTHS.map((_, i) => Math.round(1 + rng() * 5 + (i > 8 ? 1 : 0)));
  const pages = books.map((b) => b * (180 + Math.floor(rng() * 220)));
  const days = Array.from({ length: 84 }).map(() => rng() > 0.22);
  let streak = 0; for (let i = days.length - 1; i >= 0; i--) { if (days[i]) streak++; else break; }
  let longest = 0, cur = 0;
  for (const d of days) { if (d) { cur++; longest = Math.max(longest, cur); } else cur = 0; }
  return { books, pages, days, streak, longest };
}

function AnalyticsTab() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const seed = user?.id || "guest";
  const dna = useMemo(() => dnaForSeed(seed), [seed]);
  const series = useMemo(() => seriesForSeed(seed), [seed]);

  const totalBooks = series.books.reduce((a, b) => a + b, 0);
  const totalPages = series.pages.reduce((a, b) => a + b, 0);
  const pacePerWeek = Math.round(((totalPages / 52) + Number.EPSILON) * 10) / 10;
  const avgBooksPerMonth = (totalBooks / 12).toFixed(1);
  const maxBooks = Math.max(...series.books);
  const trendDelta = series.books.slice(-3).reduce((a, b) => a + b, 0) - series.books.slice(-6, -3).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat big label="Reading streak" value={`${series.streak} days`} sub={`Longest ${series.longest}`} accent="rose" />
        <Stat big label="Pace" value={`${pacePerWeek} pg/wk`} sub="Average over 12 months" />
        <Stat big label="Books this year" value={String(totalBooks)} sub={`${avgBooksPerMonth} / month`} />
        <Stat big label="Pages this year" value={totalPages.toLocaleString()} sub="All formats" />
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-5">
        <Card title="Books per month" sub={trendDelta >= 0 ? `↑ ${trendDelta} vs last quarter` : `↓ ${Math.abs(trendDelta)} vs last quarter`}>
          <BarChart values={series.books} labels={MONTHS} max={maxBooks} color="rose" />
        </Card>
        <Card title="Pages per month">
          <BarChart values={series.pages} labels={MONTHS} max={Math.max(...series.pages)} color="gold" format={(v) => `${(v / 1000).toFixed(1)}k`} />
        </Card>
        <Card title="Streak heatmap" sub="Last 12 weeks">
          <div className="grid grid-cols-12 gap-1.5">
            {series.days.map((d, i) => (
              <div key={i} className={`aspect-square rounded-sm ${d ? "bg-rose/80" : "bg-muted"}`} title={d ? "Read" : "Off day"} />
            ))}
          </div>
          <p className="mt-3 text-xs text-foreground/60">Each cell is one day. Current streak: <span className="text-foreground">{series.streak} days</span>.</p>
        </Card>
        <Card title="Genre evolution" sub="How your mix shifted across the year">
          <LockedPreview isPremium={isPremium} compact title="Watch your genres drift" blurb="See each genre's share over 12 months, with month-by-month markers when a new one enters your rotation.">
            <div className="space-y-3">
              {dna.genres.slice(0, 5).map((g, gi) => (
                <div key={g.genre}>
                  <div className="flex justify-between text-xs">
                    <span>{g.genre}</span>
                    <span className="text-foreground/60">{g.pct}%</span>
                  </div>
                  <div className="mt-1 flex h-2 gap-0.5">
                    {MONTHS.map((_, mi) => {
                      const wob = Math.max(2, g.pct + ((mi * 7 + gi * 3) % 11) - 5);
                      return <div key={mi} className={`flex-1 rounded-sm bg-${g.color}`} style={{ opacity: wob / 60 }} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </LockedPreview>
        </Card>
      </div>

      <div className="mt-6">
        <LockedPreview isPremium={isPremium} title="Reading trends" blurb="What you're reading more of, less of, and the genres quietly taking over your nightstand.">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Trend dir="up" label="Speculative" delta="+38%" />
            <Trend dir="up" label="Translated work" delta="+22%" />
            <Trend dir="up" label="Audiobooks" delta="+18%" />
            <Trend dir="down" label="Mystery" delta="-12%" />
            <Trend dir="down" label="Pre-1950" delta="-9%" />
            <Trend dir="flat" label="Memoir" delta="±0%" />
          </div>
        </LockedPreview>
      </div>
    </div>
  );
}

/* ─── COMPATIBILITY TAB ───────────────────────────────────────────────────── */

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

function CompatibilityTab() {
  const { user, displayName } = useAuth();
  const { isPremium } = usePremium();
  const { data: readers = [], isLoading } = useReaders({ excludeId: user?.id });
  const { data: books = [] } = useBooks();

  const mine = useMemo(() => dnaForSeed(user?.id || "guest"), [user?.id]);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { if (!selected && readers[0]) setSelected(readers[0].id); }, [readers, selected]);

  const them = useMemo(() => {
    const r = readers.find((x) => x.id === selected) ?? readers[0];
    return r ? { reader: r, dna: dnaForSeed(r.id) } : null;
  }, [selected, readers]);

  const compat = useMemo(() => (them ? compatibility(mine, them.dna) : null), [mine, them]);
  const ranked = useMemo(() => similarReaders(mine, readers, (r) => r.id), [mine, readers]);
  const sharedBooks = useMemo(() => {
    if (!them || books.length === 0) return [];
    const myBooks = pickBooks(user?.id || "guest", books, 8);
    const theirBooks = pickBooks(them.reader.id, books, 8);
    return myBooks.filter((b) => theirBooks.some((t) => t.id === b.id));
  }, [user?.id, them, books]);

  if (isLoading) return <div className="text-sm text-foreground/60">Loading readers…</div>;
  if (readers.length === 0) return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <p className="font-serif text-xl">No one to compare with yet.</p>
      <p className="mt-1 text-sm text-foreground/60">Invite a friend to join and find your reading twin.</p>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
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
          <LockedPreview isPremium={isPremium} title="Unlock full compatibility" blurb="See the full overlap with everyone you follow, plus a private weekly digest of new strong matches.">
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
                <button className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm min-h-11">Send a book swap →</button>
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
                  <p className="text-[11px] text-foreground/60 truncate">{sharedGenres.slice(0, 3).join(" · ") || "No genre overlap yet"}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${score > 75 ? "bg-rose/15 text-rose" : score > 55 ? "bg-gold/15" : "bg-muted"}`}>{score}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─── RECOMMENDATIONS TAB ─────────────────────────────────────────────────── */

function pickRec(seed: string, books: CatalogBook[], n: number, exclude: Set<string> = new Set()): CatalogBook[] {
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

function RecommendationsTab() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const seed = user?.id || "guest";
  const mine = useMemo(() => dnaForSeed(seed), [seed]);
  const follows = useFollows(seed);
  const { data: books = [], isLoading } = useBooks();
  const { data: readers = [] } = useReaders({ excludeId: user?.id });

  const because = useMemo(() => pickRec(seed, books, 4), [seed, books]);
  const becauseAnchor = because[0];
  const more = useMemo(() => pickRec(seed + ":2", books, 4, new Set(because.map((b) => b.id))), [seed, books, because]);
  const topGenre = mine.genres[0]?.genre ?? "Literary Fiction";
  const trending = useMemo(() => books.filter((b) => b.genre === topGenre).slice(0, 4), [books, topGenre]);
  const friendsRecs = useMemo(() => {
    if (readers.length === 0) return [];
    const followedIds = follows.all.length ? follows.all : readers.slice(0, 2).map((r) => r.id);
    const candidates = similarReaders(mine, readers.filter((r) => followedIds.includes(r.id)), (r) => r.id);
    const ids = new Set<string>();
    const out: CatalogBook[] = [];
    candidates.forEach((c) => pickRec(c.reader.id, books, 2).forEach((b) => { if (!ids.has(b.id)) { ids.add(b.id); out.push(b); } }));
    return out.slice(0, 4);
  }, [follows.all, mine, readers, books]);

  if (isLoading) return <div className="text-sm text-foreground/60">Pulling fresh picks…</div>;
  if (books.length === 0) return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <p className="font-serif text-xl">No books in the catalogue yet.</p>
      <p className="mt-1 text-sm text-foreground/60">Search and add the first book — the more you log, the sharper your picks get.</p>
      <div className="mt-4"><Button asChild><Link to="/discover">Add your first book</Link></Button></div>
    </div>
  );

  return (
    <div className="animate-fade-in-soft">
      <div className="flex flex-wrap gap-2 text-[11px] mb-2">
        <span className="text-foreground/50 uppercase tracking-widest">From your DNA</span>
        <span className="text-foreground/30">·</span>
        <Link to="/readers" className="story-link text-foreground/70 hover:text-foreground">Add more readers to your circle</Link>
        <span className="text-foreground/30">·</span>
        <Link to="/rooms" className="story-link text-foreground/70 hover:text-foreground">Join a reading room</Link>
      </div>

      <RecSection title={`Because you read ${becauseAnchor?.title ?? "your last book"}`} why={`Matched themes, pacing and tone against the ${mine.genres[0]?.genre ?? "books"} on your shelf.`} books={because} />
      <RecSection title="Readers like you also loved" why="Picked from shelves of readers whose Reader DNA overlaps most with yours." books={more} />
      {trending.length > 0 && (
        <RecSection title={`Trending in ${topGenre}`} why={`${topGenre} is the top strand in your Reader DNA right now — these are climbing fast.`} books={trending} />
      )}

      <div className="mt-12">
        <div className="flex items-baseline justify-between mb-3 gap-3">
          <h2 className="font-serif text-2xl">Popular among friends</h2>
          <span className="text-[11px] text-foreground/55 uppercase tracking-widest">From people you follow</span>
        </div>
        <LockedPreview isPremium={isPremium} title="See what your circle is loving" blurb="A live ranking of the books the readers you follow have rated 4★+ in the last 60 days.">
          {friendsRecs.length > 0 ? <BookGrid books={friendsRecs} /> : <p className="text-sm text-foreground/60 p-4">Follow some readers and their favourites will show up here.</p>}
        </LockedPreview>
      </div>

      <div className="mt-14 card-surface p-6 sm:p-8 bg-gradient-warm">
        <p className="text-xs uppercase tracking-[0.25em] text-burgundy">What's next</p>
        <h2 className="font-serif text-2xl sm:text-3xl mt-2">Make these even better.</h2>
        <p className="mt-2 text-sm text-foreground/70 max-w-xl">Rate more books and add the ones you're currently reading — your DNA gets sharper, and so do the picks here.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/readers" className="rounded-full border border-border bg-background/60 px-5 py-2.5 text-sm min-h-11 inline-flex items-center hover:border-foreground/40 transition">Find readers like you</Link>
          <Link to="/rooms" className="rounded-full border border-border bg-background/60 px-5 py-2.5 text-sm min-h-11 inline-flex items-center hover:border-foreground/40 transition">Join a reading room</Link>
        </div>
      </div>
    </div>
  );
}

/* ─── SHARED COMPONENTS ───────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <p className="font-serif text-xl mb-3">{title}</p>
      {children}
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-[10px] uppercase tracking-widest text-foreground/50">{label}</p>
      <p className="font-serif text-base mt-1">{value}</p>
    </div>
  );
}
function BarRow({ label, rows }: { label: string; rows: { label: string; pct: number }[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-foreground/50 mb-1">{label}</p>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {rows.map((r, i) => <div key={r.label} className={i % 2 ? "bg-gold" : "bg-rose"} style={{ width: `${r.pct}%` }} title={`${r.label} ${r.pct}%`} />)}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-foreground/60">
        {rows.map((r) => <span key={r.label}>{r.label} {r.pct}%</span>)}
      </div>
    </div>
  );
}
function Stat({ label, value, sub, accent, big }: { label: string; value: string; sub?: string; accent?: string; big?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[10px] uppercase tracking-widest text-foreground/50">{label}</p>
      <p className={`font-serif mt-1 ${big ? "text-3xl" : "text-xl"} ${accent === "rose" ? "text-rose" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}
function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-serif text-xl">{title}</p>
        {sub && <p className="text-xs text-foreground/60">{sub}</p>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
function BarChart({ values, labels, max, color, format }: { values: number[]; labels: string[]; max: number; color: string; format?: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-end gap-1.5 h-32">
        {values.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-full rounded-t-sm bg-${color}`} style={{ height: `${Math.max(4, (v / max) * 100)}%` }} title={format ? format(v) : String(v)} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 text-[10px] text-foreground/50">
        {labels.map((l) => <div key={l} className="flex-1 text-center">{l[0]}</div>)}
      </div>
    </div>
  );
}
function Trend({ dir, label, delta }: { dir: "up" | "down" | "flat"; label: string; delta: string }) {
  const sym = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  const color = dir === "up" ? "text-rose" : dir === "down" ? "text-burgundy" : "text-foreground/60";
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <span className={`text-sm font-serif ${color}`}>{sym} {delta}</span>
    </div>
  );
}
function Block({ title, items, fallback }: { title: string; items: string[]; fallback: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-foreground/50 mb-1.5">{title}</p>
      {items.length === 0 ? <p className="text-sm text-foreground/50 italic">{fallback}</p> : <ul className="space-y-1">{items.map((x) => <li key={x} className="text-sm">{x}</li>)}</ul>}
    </div>
  );
}
function ScoreRing({ score }: { score: number }) {
  const r = 28, c = 2 * Math.PI * r, dash = (score / 100) * c;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90">
        <circle cx="32" cy="32" r={r} stroke="currentColor" strokeWidth="6" className="text-muted" fill="none" />
        <circle cx="32" cy="32" r={r} stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          className={score > 75 ? "text-rose" : score > 55 ? "text-gold" : "text-foreground/60"}
          fill="none" strokeDasharray={`${dash} ${c - dash}`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-serif text-lg">{score}%</span>
      </div>
    </div>
  );
}
function RecSection({ title, why, books }: { title: string; why?: string; books: CatalogBook[] }) {
  if (books.length === 0) return null;
  return (
    <div className="mt-12">
      <h2 className="font-serif text-2xl mb-1">{title}</h2>
      {why && <p className="text-[12px] text-foreground/55 mb-4 max-w-xl">{why}</p>}
      <BookGrid books={books} />
    </div>
  );
}
function BookGrid({ books }: { books: CatalogBook[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
      {books.map((b) => (
        <Link key={b.id} to="/book/$bookId" params={{ bookId: b.id }} className="group block hover-lift">
          <div className="aspect-[2/3] rounded-xl bg-muted overflow-hidden shadow-book">
            <img src={b.cover} alt={b.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          </div>
          <p className="mt-2 font-serif text-base leading-tight line-clamp-2">{b.title}</p>
          <p className="text-xs text-foreground/60">{b.author}</p>
          <p className="text-[11px] text-foreground/50">{b.genre} · {b.year}</p>
        </Link>
      ))}
    </div>
  );
}
