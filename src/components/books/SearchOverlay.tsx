import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchOpenLibrary, ensureBook, type OLBook } from "@/lib/openlibrary";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const STATUSES = [
  { value: "want", label: "Want to read", primary: false },
  { value: "reading", label: "Reading", primary: false },
  { value: "read", label: "Read", primary: true },
  { value: "dnf", label: "DNF", primary: false },
] as const;

type Status = typeof STATUSES[number]["value"];

export function SearchOverlay({
  open,
  onOpenChange,
  onRequireAuth,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRequireAuth: () => void;
  onAdded?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<OLBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setQ(""); setResults([]); }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchOpenLibrary(q);
        setResults(r);
        if (user) supabase.from("search_logs").insert({ query: q }).then(() => {});
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const addToShelf = async (b: OLBook, status: Status) => {
    if (!user) { onRequireAuth(); return; }
    setAdding(b.ol_id + status);
    try {
      const book_id = await ensureBook(b);
      const today = new Date().toISOString().slice(0, 10);
      const patch: Record<string, string> = { user_id: user.id, book_id, status };
      if (status === "reading") patch.started_at = today;
      if (status === "read") { patch.started_at = today; patch.finished_at = today; }
      const { error } = await supabase.from("user_books").upsert(
        patch as never,
        { onConflict: "user_id,book_id", ignoreDuplicates: false },
      );
      if (error) throw error;
      toast.success(`Added "${b.title}"`);
      onAdded?.();
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't add book");
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background">
        <DialogTitle className="font-serif text-2xl">Search any book on earth</DialogTitle>
        <Input
          autoFocus
          placeholder="Title, author, ISBN…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="text-base"
        />
        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {loading && <p className="text-xs text-foreground/50 text-center py-6">searching…</p>}
          {!loading && q && results.length === 0 && (
            <p className="text-xs text-foreground/50 text-center py-6">no results</p>
          )}
          {results.map((b) => (
            <div key={b.ol_id} className="flex gap-3 p-3 rounded-2xl border border-border hover:bg-muted/40">
              {b.cover_url ? (
                <img src={b.cover_url} alt={b.title} className="h-20 w-14 object-cover rounded shadow" />
              ) : (
                <div className="h-20 w-14 rounded bg-muted" />
              )}
              <div className="flex-1 min-w-0">
                <button
                  onClick={async () => {
                    setOpening(b.ol_id);
                    try {
                      const id = await ensureBook(b);
                      onOpenChange(false);
                      navigate({ to: "/book/$bookId", params: { bookId: id } });
                    } catch (e: any) { toast.error(e.message ?? "Couldn't open book"); }
                    finally { setOpening(null); }
                  }}
                  className="text-left w-full"
                >
                  <p className="font-serif text-lg truncate hover:underline">{b.title}{opening === b.ol_id ? " …" : ""}</p>
                  <p className="text-xs text-foreground/60 truncate">{b.author}{b.published_year ? ` · ${b.published_year}` : ""}</p>
                </button>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {STATUSES.map(s => (
                    <button
                      key={s.value}
                      disabled={adding !== null}
                      onClick={() => addToShelf(b, s.value)}
                      className={`h-7 px-3 rounded-full text-xs border transition disabled:opacity-50 ${
                        s.primary
                          ? "bg-foreground text-background border-foreground hover:bg-forest-deep"
                          : "border-border hover:border-foreground/40"
                      }`}
                    >
                      {adding === b.ol_id + s.value ? "…" : s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
