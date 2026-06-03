import readerPortrait from "@/assets/reader-portrait.jpg";
import { useGate } from "@/components/auth/AuthGate";
import { Button } from "@/components/ui/button";

const PILLARS = [
  {
    icon: "📚",
    title: "Track every book",
    body: "Shelves for what you're reading, want to read, and have finished. Log your page, your mood, your pace.",
  },
  {
    icon: "🎯",
    title: "Reading goals that stick",
    body: "Set a yearly target and watch your progress in real time. Streaks, milestones, and a year-in-review worth sharing.",
  },
  {
    icon: "💬",
    title: "Discuss with real readers",
    body: "Reading Rooms bring small groups together around a single book — no algorithms, just people who care about the same pages.",
  },
];

const GOODREADS_DIFF = [
  { them: "Cluttered, ad-heavy feed", us: "Clean, focused reading experience" },
  { them: "Follower counts over taste", us: "Matched by reading DNA, not popularity" },
  { them: "Shallow star ratings", us: "Thoughtful reviews + quote saving" },
  { them: "No reading rooms", us: "Live group reading with discussion threads" },
];

export function WhyFolio() {
  const { openAuth } = useGate();
  return (
    <section id="why-folio" className="py-28 md:py-36">
      <div className="mx-auto max-w-7xl px-6">

        {/* Section header */}
        <div className="max-w-2xl mb-20">
          <span className="chip">Why Folio</span>
          <h2 className="font-serif text-5xl md:text-6xl mt-4 leading-[1.05] text-balance">
            Reading deserves better than <em className="text-burgundy">Goodreads.</em>
          </h2>
          <p className="mt-5 text-lg text-foreground/65 leading-relaxed">
            Built by readers who got tired of a cluttered feed, shallow ratings, and an experience that hadn't changed in a decade.
          </p>
        </div>

        {/* Three pillars */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-3xl border border-border bg-card p-8">
              <div className="text-3xl mb-4">{p.icon}</div>
              <h3 className="font-serif text-2xl">{p.title}</h3>
              <p className="mt-3 text-foreground/65 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>

        {/* Goodreads comparison */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="chip">Folio vs Goodreads</span>
            <h3 className="font-serif text-4xl mt-4 mb-8">Not another book list. A real reading life.</h3>
            <div className="space-y-3">
              {GOODREADS_DIFF.map((row) => (
                <div key={row.us} className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2 text-foreground/50">
                    <span className="mt-0.5 text-foreground/30 shrink-0">✗</span>
                    {row.them}
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-forest shrink-0">✓</span>
                    <span className="font-medium">{row.us}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={openAuth} size="lg" className="mt-10">
              Try Folio free →
            </Button>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
              <img src={readerPortrait} alt="A reader enjoying a book" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-6 -left-6 rounded-2xl bg-gold/90 text-foreground p-5 shadow-xl max-w-[220px]">
              <p className="font-serif text-3xl font-semibold">12 books</p>
              <p className="text-sm mt-1 opacity-80">read this year · on pace for 24</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
