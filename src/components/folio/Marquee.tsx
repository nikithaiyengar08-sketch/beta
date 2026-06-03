import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK = [
  "track every book you read",
  "★ your shelf, your identity",
  "join a reading room",
  "discover readers like you",
  "✦ no algorithms — just taste",
  "save the quotes that stay with you",
  "your year in reading, beautifully told",
  "✦ better than Goodreads",
];

export function Marquee() {
  const [items, setItems] = useState<string[]>(FALLBACK);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("books")
          .select("title")
          .order("created_at", { ascending: false })
          .limit(20);
        const titles = (data ?? []).map((r: any) => r.title).filter(Boolean);
        if (titles.length >= 6) setItems(titles);
      } catch {}
    })();
  }, []);

  return (
    <div className="relative border-y border-border bg-ivory/50 py-4 overflow-hidden ticker-mask">
      <div className="flex gap-10 animate-marquee whitespace-nowrap font-serif text-xl md:text-2xl italic text-foreground/55">
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-10">
            {t}
            <span className="text-rose not-italic text-base">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
