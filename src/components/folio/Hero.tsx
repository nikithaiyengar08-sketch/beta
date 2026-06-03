import heroBooks from "@/assets/hero-books.jpg";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGate } from "@/components/auth/AuthGate";
import { Button } from "@/components/ui/button";

function useReaderCount() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let stop = false;
    const fetchN = async () => {
      try {
        const { data } = await supabase.from("user_books").select("user_id");
        if (stop) return;
        const distinct = new Set((data ?? []).map((r: any) => r.user_id)).size;
        setN(distinct);
      } catch { if (!stop) setN(0); }
    };
    fetchN();
    const id = setInterval(fetchN, 60000);
    return () => { stop = true; clearInterval(id); };
  }, []);
  return n;
}

export function Hero() {
  const readers = useReaderCount();
  const { openAuth } = useGate();
  const label = readers && readers > 0 ? `${readers.toLocaleString()} readers` : "10,000+ readers";
  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center">
      <div className="absolute inset-0 paper-grain opacity-40 pointer-events-none" />
      {/* Subtle ambient blurs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-rose/20 blur-3xl" />
      <div className="absolute top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-forest/15 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-24 md:pt-20 md:pb-32 w-full">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
          <div className="animate-fade-up">
            {/* Social proof — first, small, understated */}
            <div className="flex items-center gap-2 mb-8">
              <div className="flex -space-x-2">
                {["#7a5c4a", "#3d6b4d", "#a86b6b", "#c9a44c", "#6b5d8a"].map((c) => (
                  <div key={c} className="h-7 w-7 rounded-full border-2 border-background" style={{ background: c }} />
                ))}
              </div>
              <span className="text-sm text-foreground/55">{label} and counting</span>
            </div>

            {/* Primary headline — clear value prop */}
            <h1 className="font-serif text-[clamp(3rem,7.5vw,7rem)] leading-[0.93] tracking-tight text-balance">
              Track what you read.
              <br />
              <span className="italic text-forest-deep">Discover</span>
              <span className="inline-block mx-3 h-[0.6em] w-[0.6em] rounded-full bg-rose align-middle" />
              readers like you.
            </h1>

            {/* Clear differentiator vs Goodreads */}
            <p className="mt-7 max-w-lg text-lg text-foreground/65 leading-relaxed">
              Folio is reading, done right. Your shelf, your quotes, your goals — and a real community that loves books as deeply as you do. No noise. No algorithms. Just reading.
            </p>

            {/* Primary + secondary CTA */}
            <div className="mt-9 flex flex-wrap gap-3">
              <Button onClick={openAuth} size="xl" className="group">
                Start reading with Folio
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Button>
              <Button asChild variant="outline" size="xl">
                <a href="#why-folio">See what's different</a>
              </Button>
            </div>

            <p className="mt-5 text-xs text-foreground/40">Free to join. No credit card needed.</p>
          </div>

          {/* Right — visual collage */}
          <div className="relative h-[500px] md:h-[580px] hidden sm:block">
            <div className="absolute top-0 right-4 w-[76%] aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl rotate-2 animate-tilt-in">
              <img src={heroBooks} alt="A curated stack of beloved books" className="h-full w-full object-cover" />
            </div>

            {/* Quote card */}
            <div className="absolute -left-2 top-16 w-64 rounded-2xl bg-ivory border border-border p-5 shadow-xl -rotate-5 animate-float" style={{animationDelay: "0.3s"}}>
              <p className="font-serif text-lg leading-snug">
                "We read to know we're not alone."
              </p>
              <p className="mt-3 text-[11px] uppercase tracking-widest text-foreground/50">C.S. Lewis · saved by maya</p>
            </div>

            {/* Currently reading card */}
            <div className="absolute bottom-12 left-4 rounded-2xl bg-forest-deep text-cream p-5 shadow-2xl rotate-1 w-58 animate-float" style={{animationDelay: "1s"}}>
              <p className="text-[11px] uppercase tracking-widest text-cream/55">Currently reading</p>
              <p className="font-serif text-xl mt-1.5 leading-tight">The Bell Jar</p>
              <div className="mt-3 h-1 w-full rounded-full bg-cream/20 overflow-hidden">
                <div className="h-full w-2/3 bg-gold" />
              </div>
              <p className="mt-2 text-[11px] text-cream/55">pg. 142 of 244 · 66%</p>
            </div>

            {/* Rating pill */}
            <div className="absolute bottom-36 right-2 rounded-full bg-rose text-ivory px-5 py-3 shadow-xl rotate-12 font-serif text-2xl animate-float" style={{animationDelay: "1.6s"}}>
              ★ 4.8
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
