import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const MOODS = ["devastating","funny","slow burn","unputdownable","cozy","thought-provoking","emotional","dark","hopeful","beautiful","confusing","life-changing"];
const VIS = [["public","Public"],["friends","Friends only"],["private","Just me"]] as const;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  book: { id: string; title: string; author: string | null; cover_url: string | null };
}

export function ReviewSheet({ open, onOpenChange, book }: Props) {
  const { user } = useAuth();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [quote, setQuote] = useState("");
  const [visibility, setVisibility] = useState<"public"|"friends"|"private">("public");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data } = await supabase.from("reviews").select("*").eq("user_id", user.id).eq("book_id", book.id).maybeSingle();
      if (data) {
        setStars(data.stars ?? 0);
        setHeadline(data.headline ?? "");
        setBody(data.body ?? "");
        setMoods(data.mood_tags ?? []);
        setQuote(data.favorite_quote ?? "");
        setVisibility((data.visibility as any) ?? "public");
      } else {
        setStars(0); setHeadline(""); setBody(""); setMoods([]); setQuote(""); setVisibility("public");
      }
    })();
  }, [open, user?.id, book.id]);

  const toggleMood = (m: string) =>
    setMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const save = async () => {
    if (!user) { toast.error("Sign in to review"); return; }
    if (!stars) { toast.error("Pick a rating"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("reviews").upsert({
        user_id: user.id,
        book_id: book.id,
        stars,
        headline: headline || null,
        body: body || null,
        mood_tags: moods.length ? moods : null,
        favorite_quote: quote || null,
        visibility,
      }, { onConflict: "user_id,book_id" });
      if (error) throw error;
      await supabase.from("user_books").update({ rating: stars }).eq("user_id", user.id).eq("book_id", book.id);
      if (quote.trim()) {
        await supabase.from("quotes").insert({
          user_id: user.id, book_id: book.id, text: quote.trim(),
          author: book.author, book_title: book.title,
        });
      }
      toast.success("Review saved ✓");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[500px] overflow-y-auto bg-ivory">
        <SheetHeader className="text-left">
          <SheetTitle className="sr-only">Write a review</SheetTitle>
          <div className="flex gap-3 items-start">
            {book.cover_url ? (
              <img src={book.cover_url} alt="" style={{ width: 60, height: 80 }} className="object-cover rounded shadow" />
            ) : (
              <div style={{ width: 60, height: 80 }} className="rounded bg-foreground/10" />
            )}
            <div>
              <p className="font-serif text-xl leading-tight">{book.title}</p>
              <p className="text-xs text-foreground/60 mt-1">{book.author}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-1 text-4xl text-gold">
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button"
                onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                onClick={() => setStars(n)}
                className={`transition ${n <= (hover || stars) ? "" : "opacity-25"}`}>★</button>
            ))}
          </div>

          <input
            value={headline} onChange={(e) => setHeadline(e.target.value)}
            placeholder="Sum it up in one line…"
            className="w-full bg-transparent border-0 border-b border-border focus:outline-none focus:border-foreground py-2 font-serif text-lg italic placeholder:text-foreground/40"
          />

          <textarea
            rows={4} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="What did you think?"
            className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:border-foreground/40"
          />

          <div>
            <p className="text-[11px] uppercase tracking-widest text-foreground/55 mb-3">How did it feel?</p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m => {
                const on = moods.includes(m);
                return (
                  <button key={m} type="button" onClick={() => toggleMood(m)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${on ? "bg-forest-deep text-cream border-forest-deep" : "border-border bg-background hover:border-foreground/40"}`}>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-widest text-foreground/55 mb-2">Favorite quote</p>
            <textarea
              rows={3} value={quote} onChange={(e) => setQuote(e.target.value)}
              placeholder="A line you can't stop thinking about…"
              className="w-full rounded-xl border border-border bg-background p-3 text-sm font-serif italic focus:outline-none focus:border-foreground/40"
            />
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-widest text-foreground/55 mb-2">Visibility</p>
            <div className="inline-flex rounded-full border border-border p-1 bg-background">
              {VIS.map(([k, l]) => (
                <button key={k} type="button" onClick={() => setVisibility(k)}
                  className={`text-xs px-4 py-1.5 rounded-full transition ${visibility === k ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={save} disabled={saving} size="lg" className="w-full">
            {saving ? "Saving…" : "Save review"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
