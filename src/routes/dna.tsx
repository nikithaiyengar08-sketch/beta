import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { Footer } from "@/components/folio/Footer";
import { LockedPreview } from "@/components/folio/LockedPreview";
import { ReaderDNACard } from "@/components/folio/ReaderDNACard";
import { useAuth } from "@/lib/auth-context";
import { usePremium } from "@/lib/premium";
import { dnaForSeed } from "@/lib/dna";
import { useMemo } from "react";

const searchSchema = z.object({ u: z.string().optional().catch(undefined) });

export const Route = createFileRoute("/dna")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Your Reader DNA · Folio" },
      { name: "description", content: "A portrait of who you are as a reader — genres, traits, pace, mood. Shareable, evolving, yours." },
      { property: "og:title", content: "Reader DNA · Folio" },
      { property: "og:description", content: "What kind of reader are you, really?" },
    ],
  }),
  component: DNAPage,
});

function DNAPage() {
  const { user, displayName } = useAuth();
  const { isPremium } = usePremium();
  const { u } = useSearch({ from: "/dna" });
  const seed = u || user?.id || "guest";
  const dna = useMemo(() => dnaForSeed(seed), [seed]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      
      <section className="mx-auto max-w-5xl px-5 sm:px-6 py-10">
        <p className="text-xs uppercase tracking-[0.25em] text-rose">Reader DNA</p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-2">{u ? `@${u}'s reading self` : "Your reading self, in colour."}</h1>
        <p className="mt-2 text-foreground/70 max-w-2xl">
          Folio reads your shelves and turns them into a living portrait — archetype, genres, traits,
          pace and mood. It evolves as you do.
        </p>

        <div className="mt-8 grid lg:grid-cols-2 gap-8">
          <div>
            <ReaderDNACard dna={dna} displayName={displayName} username={u || null} />
          </div>

          <div className="space-y-6">
            <Section title="Genre breakdown">
              <div className="space-y-2.5">
                {dna.genres.map(g => (
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
                  {dna.traits.map(t => (
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
              <LockedPreview
                isPremium={isPremium}
                compact
                title="Format & era charts"
                blurb="Print vs ebook vs audio. Pre-1950 vs contemporary. The whole picture."
              >
                <div className="mt-4 space-y-3">
                  <BarRow label="Formats" rows={dna.format} />
                  <BarRow label="Eras" rows={dna.era} />
                </div>
              </LockedPreview>
            </Section>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Link to="/compatibility" className="rounded-full border border-border px-5 py-2.5 text-sm min-h-11 inline-flex items-center">
            Compare with a friend →
          </Link>
          <Link to="/readers" className="rounded-full border border-border px-5 py-2.5 text-sm min-h-11 inline-flex items-center">
            Find readers like you
          </Link>
          <Link to="/analytics" className="rounded-full border border-border px-5 py-2.5 text-sm min-h-11 inline-flex items-center">
            Open analytics
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

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
        {rows.map((r, i) => (
          <div key={r.label} className={i % 2 ? "bg-gold" : "bg-rose"} style={{ width: `${r.pct}%` }} title={`${r.label} ${r.pct}%`} />
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-foreground/60">
        {rows.map(r => <span key={r.label}>{r.label} {r.pct}%</span>)}
      </div>
    </div>
  );
}
