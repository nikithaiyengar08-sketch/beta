import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "@/components/folio/Footer";
import { LockedPreview } from "@/components/folio/LockedPreview";
import { useAuth } from "@/lib/auth-context";
import { usePremium } from "@/lib/premium";
import { dnaForSeed } from "@/lib/dna";
import { useMemo } from "react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Reading Analytics · Folio" },
      { name: "description", content: "Streaks, pace, books per month, genre evolution and the trends shaping your reading life." },
      { property: "og:title", content: "Reading Analytics · Folio" },
    ],
  }),
  component: AnalyticsPage,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function seriesForSeed(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  const rng = () => {
    h = (h * 1664525 + 1013904223) | 0;
    return ((h >>> 0) % 10000) / 10000;
  };
  const books = MONTHS.map((_, i) => Math.round(1 + rng() * 5 + (i > 8 ? 1 : 0)));
  const pages = books.map(b => b * (180 + Math.floor(rng() * 220)));
  // streak: walk recent days
  const days = Array.from({ length: 84 }).map(() => rng() > 0.22);
  let streak = 0; for (let i = days.length - 1; i >= 0; i--) { if (days[i]) streak++; else break; }
  let longest = 0, cur = 0;
  for (const d of days) { if (d) { cur++; longest = Math.max(longest, cur); } else cur = 0; }
  return { books, pages, days, streak, longest };
}

function AnalyticsPage() {
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
    <main className="min-h-screen bg-background text-foreground">
      
      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-10">
        <p className="text-xs uppercase tracking-[0.25em] text-rose">Analytics</p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-2">Your reading year, measured.</h1>
        <p className="mt-2 text-foreground/70 max-w-2xl">
          Streaks, pace, books and pages a month, how your genres evolved, what's trending up.
        </p>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <BarChart values={series.pages} labels={MONTHS} max={Math.max(...series.pages)} color="gold" format={v => `${(v / 1000).toFixed(1)}k`} />
          </Card>

          <Card title="Streak heatmap" sub="Last 12 weeks">
            <div className="grid grid-cols-12 gap-1.5">
              {series.days.map((d, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-sm ${d ? "bg-rose/80" : "bg-muted"}`}
                  title={d ? "Read" : "Off day"}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-foreground/60">Each cell is one day. Current streak: <span className="text-foreground">{series.streak} days</span>.</p>
          </Card>

          <Card title="Genre evolution" sub="How your mix shifted across the year">
            <LockedPreview
              isPremium={isPremium}
              compact
              title="Watch your genres drift"
              blurb="See each genre's share over 12 months, with month-by-month markers when a new one enters your rotation."
            >
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
          <LockedPreview
            isPremium={isPremium}
            title="Reading trends"
            blurb="What you're reading more of, less of, and the genres quietly taking over your nightstand."
          >
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
      </section>
      <Footer />
    </main>
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
        {labels.map(l => <div key={l} className="flex-1 text-center">{l[0]}</div>)}
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
