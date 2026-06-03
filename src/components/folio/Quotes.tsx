import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGate } from "@/components/auth/AuthGate";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type Quote = { id: string; text: string; author: string | null; book_title: string | null; save_count: number | null; user_id: string | null };

const BG = ["bg-rose text-ivory", "bg-ivory text-foreground", "bg-forest-deep text-cream", "bg-gold text-ink", "bg-burgundy text-ivory", "bg-lavender text-ink"];
const ROT = ["-rotate-2", "rotate-1", "rotate-3", "-rotate-3", "rotate-2", "-rotate-1"];


export function Quotes() {
  const { user } = useAuth();
  const { openAuth } = useGate();
  const [real, setReal] = useState<Quote[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);

  const load = async () => {
    const { data } = await supabase.from("quotes").select("id, text, author, book_title, save_count, user_id").order("created_at", { ascending: false }).limit(18);
    setReal((data ?? []) as Quote[]);
    if (user) {
      const { data: sv } = await supabase.from("saved_quotes").select("quote_id");
      setSavedIds(new Set((sv ?? []).map((s: any) => s.quote_id)));
    } else {
      setSavedIds(new Set());
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    const ch = supabase.channel("quotes_wall")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const toggleSave = async (q: Quote) => {
    if (!user) return openAuth();
    if (savedIds.has(q.id)) {
      await supabase.from("saved_quotes").delete().eq("quote_id", q.id).eq("user_id", user.id);
      await (supabase as any).rpc("decrement_save_count", { quote_id: q.id });
      setSavedIds((s) => { const n = new Set(s); n.delete(q.id); return n; });
    } else {
      await supabase.from("saved_quotes").insert({ quote_id: q.id, user_id: user.id });
      await (supabase as any).rpc("increment_save_count", { quote_id: q.id });
      setSavedIds((s) => new Set(s).add(q.id));
      toast.success("Saved to your wall");
    }
    load();
  };


  const all = real.slice(0, 18);

  return (
    <section id="quotes" className="relative">
      <>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-foreground/50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
            <h2 className="text-sm uppercase tracking-widest text-foreground/50 font-medium">Saved quotes</h2>
          </div>
          <Button size="sm" variant="outline" onClick={() => user ? setAddOpen(true) : openAuth()}>
            + Add quote
          </Button>
        </div>

        {all.length === 0 && (
          <p className="text-center text-foreground/60 py-12">No quotes yet. Be the first to pin a line to the wall.</p>
        )}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
          {all.map((q, i) => {
            const saved = savedIds.has(q.id);
            return (
              <div
                key={q.id}
                className={`mb-6 break-inside-avoid p-7 md:p-9 rounded-3xl ${BG[i % BG.length]} ${ROT[i % ROT.length]} shadow-xl hover:rotate-0 hover:scale-[1.02] transition-all duration-500`}
              >
                <span className="font-serif text-6xl leading-none opacity-30">"</span>
                <p className="font-serif text-2xl md:text-3xl leading-snug -mt-4 text-balance">{q.text}</p>
                <div className="mt-6 flex items-center justify-between text-[11px] uppercase tracking-widest opacity-75">
                  <span className="truncate">{q.author ?? "Unknown"} · <em className="normal-case font-serif text-base opacity-90">{q.book_title ?? ""}</em></span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleSave(q)} className="hover:scale-110 transition-transform">
                      {saved ? "♥" : "♡"} {q.save_count ?? 0}
                    </button>
                    {user && q.user_id === user.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="px-1.5 opacity-70 hover:opacity-100">⋯</DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(q)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={async () => {
                            if (!confirm("Delete this quote?")) return;
                            const { error } = await supabase.from("quotes").delete().eq("id", q.id);
                            if (error) return toast.error(error.message);
                            toast.success("Deleted"); load();
                          }}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>

      <AddQuoteModal open={addOpen} onOpenChange={setAddOpen} onAdded={load} />
      <EditQuoteModal quote={editing} onOpenChange={(o) => !o && setEditing(null)} onSaved={load} />
    </section>
  );
}

function AddQuoteModal({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; onAdded: () => void }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("quotes").insert({
      text, author: author || null, book_title: bookTitle || null, user_id: user.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Quote added to the wall");
    setText(""); setAuthor(""); setBookTitle("");
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="font-serif text-2xl">Add a quote</DialogTitle>
        <form onSubmit={submit} className="space-y-3">
          <Textarea required maxLength={1000} placeholder="The line that wrecked you…" value={text} onChange={(e) => setText(e.target.value)} className="min-h-28 font-serif text-base" />
          <Input placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
          <Input placeholder="Book title" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
          <Button type="submit" disabled={busy || !text.trim()} className="w-full">
            Pin to the wall
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditQuoteModal({ quote, onOpenChange, onSaved }: { quote: Quote | null; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (quote) {
      setText(quote.text);
      setAuthor(quote.author ?? "");
      setBookTitle(quote.book_title ?? "");
    }
  }, [quote?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;
    setBusy(true);
    const { error } = await supabase.from("quotes").update({
      text, author: author || null, book_title: bookTitle || null,
    }).eq("id", quote.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={!!quote} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="font-serif text-2xl">Edit quote</DialogTitle>
        <form onSubmit={submit} className="space-y-3">
          <Textarea required maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} className="min-h-28 font-serif text-base" />
          <Input placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
          <Input placeholder="Book title" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
          <Button type="submit" disabled={busy || !text.trim()} className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
