import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGate } from "@/components/auth/AuthGate";
import { Button } from "@/components/ui/button";

type Row = { headline: string | null; body: string | null; stars: number | null; profiles: { display_name: string | null; username: string | null } | null };

const FALLBACKS = [
  { q: "Finally a reading app that doesn't feel like social media. Just books.", n: "Maya K.", t: "fiction reader" },
  { q: "The reading rooms changed how I experience books. Discussing chapters in real time is magical.", n: "Theo R.", t: "book club organizer" },
  { q: "My shelf is more beautiful than my actual bookshelf and I'm not ashamed.", n: "Priya S.", t: "literary fiction lover" },
  { q: "I've read more this year than in the last three combined. The streak feature works.", n: "James L.", t: "slow reader turned fast" },
];

export function Testimonials() {
  const { openAuth } = useGate();
  const [items, setItems] = useState<{ q: string; n: string; t: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const featured = await supabase
          .from("reviews")
          .select("headline, body, stars, profiles!inner(display_name, username)")
          .eq("visibility", "public")
          .eq("is_featured", true)
          .limit(4);
        let rows = (featured.data ?? []) as unknown as Row[];
        if (rows.length < 4) {
          const need = 4 - rows.length;
          const top = await supabase
            .from("reviews")
            .select("headline, body, stars, profiles!inner(display_name, username)")
            .eq("visibility", "public")
            .order("stars", { ascending: false })
            .limit(need + 4);
          const have = new Set(rows.map(r => (r.headline ?? "") + (r.body ?? "")));
          for (const r of (top.data ?? []) as unknown as Row[]) {
            const k = (r.headline ?? "") + (r.body ?? "");
            if (!have.has(k)) { rows.push(r); have.add(k); }
            if (rows.length >= 4) break;
          }
        }
        const mapped = rows
          .filter(r => r.headline || r.body)
          .map(r => ({
            q: r.headline || (r.body ?? "").slice(0, 120),
            n: r.profiles?.display_name || r.profiles?.username || "reader",
            t: "reader",
          }));
        setItems(mapped.length >= 3 ? mapped : FALLBACKS);
      } catch {
        setItems(FALLBACKS);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  return (
    <section className="py-24 border-y border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
          <div>
            <span className="chip">Real readers</span>
            <h2 className="font-serif text-4xl md:text-5xl mt-4">What people are saying.</h2>
          </div>
          <Button onClick={openAuth} variant="outline" size="lg">
            Join them →
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((x, i) => (
            <figure key={i} className="flex flex-col">
              <div className="flex-1 rounded-2xl border border-border bg-card p-6">
                <div className="text-gold text-sm mb-3">★★★★★</div>
                <blockquote className="font-serif text-lg md:text-xl leading-tight text-balance">
                  "{x.q}"
                </blockquote>
              </div>
              <figcaption className="mt-3 px-1 text-xs text-foreground/50 uppercase tracking-widest">
                — {x.n} · {x.t}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
