import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/folio/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Crown, Sparkles, BarChart3, Users, BookOpen, Palette, Check } from "lucide-react";

const FEATURES = [
  {
    icon: <Sparkles className="h-5 w-5 text-rose" />,
    title: "Reader DNA",
    body: "A continually-evolving portrait of who you are as a reader — moods, genres, eras, pace. Updated as you read.",
  },
  {
    icon: <Users className="h-5 w-5 text-lavender" />,
    title: "Compatibility Scores",
    body: "See how your reading taste lines up with friends, partners, and people you follow.",
  },
  {
    icon: <BarChart3 className="h-5 w-5 text-gold" />,
    title: "Advanced Analytics",
    body: "Pages per week, genre evolution, mood arcs, reread patterns — all charted beautifully.",
  },
  {
    icon: <BookOpen className="h-5 w-5 text-forest" />,
    title: "Smart Recommendations",
    body: "Recs tuned by your Reader DNA, not just genre tags. The more you read, the better they get.",
  },
  {
    icon: <Crown className="h-5 w-5 text-gold" />,
    title: "Advanced Wrapped",
    body: "A richer year-in-reading. Print it, share it, gift it. More stats, more moments.",
  },
  {
    icon: <Palette className="h-5 w-5 text-burgundy" />,
    title: "Profile Themes & Badges",
    body: "Custom profile covers, premium badges, and signature fonts to make your Reading World yours.",
  },
];

const COMPARE = [
  { label: "Search, shelves, reviews", free: true, premium: true },
  { label: "Reading rooms & lists", free: true, premium: true },
  { label: "Follow readers & activity feed", free: true, premium: true },
  { label: "Reading goals & streaks", free: true, premium: true },
  { label: "Reader DNA & archetypes", free: false, premium: true },
  { label: "Compatibility scores", free: false, premium: true },
  { label: "Advanced analytics & insights", free: false, premium: true },
  { label: "Smart recommendations", free: false, premium: true },
  { label: "Advanced Wrapped", free: false, premium: true },
  { label: "Profile themes & badges", free: false, premium: true },
  { label: "Unlimited rooms & lists", free: false, premium: true },
];

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "Folio Premium — Your reading life, in higher fidelity" },
      { name: "description", content: "Unlock Reader DNA, compatibility scores, advanced analytics, and a richer Year in Reading with Folio Premium." },
    ],
    links: [{ rel: "canonical", href: "/premium" }],
  }),
  component: PremiumPage,
});

function PremiumPage() {
  const startTrial = () => {
    toast.success("You're on the early-access list", {
      description: "Premium launches with the next release. We'll be in touch.",
    });
  };

  return (
    <main className="min-h-screen bg-background">

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rose/30 bg-rose/5 text-rose text-xs font-medium uppercase tracking-widest mb-6">
          <Crown className="h-3.5 w-3.5" />
          Folio Premium
        </div>
        <h1 className="font-serif text-5xl sm:text-6xl leading-tight text-balance">
          Your reading life, in higher fidelity.
        </h1>
        <p className="mt-5 text-foreground/65 max-w-xl mx-auto text-lg leading-relaxed">
          Core reading stays free, forever. Premium adds the parts that make Folio deeply personal — your Reader DNA, compatibility, deeper analytics, and a Year in Reading worth printing.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={startTrial} size="xl" className="group">
            Start 14-day free trial
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Button>
          <Link to="/home" search={{ tab: "library" }}
            className="rounded-full border border-border px-7 py-3 text-sm min-h-12 inline-flex items-center hover:border-foreground/40 transition-colors">
            Keep using Free
          </Link>
        </div>
        <p className="mt-4 text-xs text-foreground/40">$5/month or $48/year · Cancel anytime</p>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="p-6 rounded-2xl border border-border bg-card hover:border-foreground/25 transition-colors">
              <div className="mb-3">{f.icon}</div>
              <p className="font-serif text-xl">{f.title}</p>
              <p className="text-sm text-foreground/65 mt-2 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <h2 className="font-serif text-3xl mb-6 text-center">Free vs Premium</h2>
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-3 bg-muted/60 text-xs uppercase tracking-widest text-foreground/50 font-medium">
            <div className="p-3 col-span-1">Feature</div>
            <div className="p-3 text-center border-l border-border">Free</div>
            <div className="p-3 text-center border-l border-border text-rose">Premium</div>
          </div>
          <div className="divide-y divide-border">
            {COMPARE.map(row => (
              <div key={row.label} className="grid grid-cols-3 text-sm">
                <div className="p-3.5 text-foreground/80">{row.label}</div>
                <div className="p-3.5 text-center border-l border-border">
                  {row.free
                    ? <Check className="h-4 w-4 text-forest mx-auto" />
                    : <span className="text-foreground/25 text-base">—</span>
                  }
                </div>
                <div className="p-3.5 text-center border-l border-border">
                  <Check className="h-4 w-4 text-rose mx-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Button onClick={startTrial} size="lg">Start free trial →</Button>
          <p className="mt-3 text-xs text-foreground/40">No credit card required during trial</p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
