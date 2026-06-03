import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGate } from "@/components/auth/AuthGate";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

type UB = {
  id: string;
  progress_page: number | null;
  started_at: string | null;
  book: { id: string; title: string; author: string | null; cover_url: string | null; page_count: number | null } | null;
};

export function CurrentlyReading() {
  const { user } = useAuth();
  const { openSearch } = useGate();
  const [book, setBook] = useState<UB | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_books")
      .select("id, progress_page, started_at, book:books(id, title, author, cover_url, page_count)")
      .eq("user_id", user.id)
      .eq("status", "reading")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setBook((data ?? null) as UB | null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`home-currently-reading-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_books", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const saveProgress = async () => {
    if (!book) return;
    const n = parseInt(page, 10);
    if (Number.isNaN(n) || n < 0) { toast.error("Enter a valid page number"); return; }
    const patch: { progress_page: number; started_at?: string } = { progress_page: n };
    if (!book.started_at) patch.started_at = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("user_books").update(patch).eq("id", book.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Progress saved");
    setEditing(false);
    setPage("");
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
        <div className="flex gap-5">
          <div className="h-36 w-24 rounded-lg bg-muted shrink-0" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-2 bg-muted rounded-full w-full mt-6" />
          </div>
        </div>
      </div>
    );
  }

  const pct = book?.book?.page_count
    ? Math.min(100, Math.round(((book.progress_page ?? 0) / book.book.page_count) * 100))
    : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-4 w-4 text-foreground/50" />
        <h2 className="text-sm uppercase tracking-widest text-foreground/50 font-medium">Continue reading</h2>
      </div>

      {!book ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="font-serif text-xl text-foreground/70">You're not reading anything right now.</p>
          <p className="mt-1.5 text-sm text-foreground/45">Pick up where you left off — or start something new.</p>
          <Button onClick={openSearch} variant="outline" className="mt-5">
            + Add a book
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 flex gap-5">
          {/* Cover */}
          <div className="shrink-0">
            {book.book?.cover_url ? (
              <Link to="/book/$bookId" params={{ bookId: book.book.id }}>
                <img
                  src={book.book.cover_url}
                  alt={book.book.title}
                  className="h-36 w-24 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                />
              </Link>
            ) : (
              <div className="h-36 w-24 rounded-lg bg-muted" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <Link
              to="/book/$bookId"
              params={{ bookId: book.book?.id ?? "" }}
              className="font-serif text-xl md:text-2xl leading-tight hover:text-burgundy transition-colors line-clamp-2"
            >
              {book.book?.title}
            </Link>
            <p className="text-foreground/55 text-sm mt-1">{book.book?.author}</p>

            {/* Progress bar */}
            {book.book?.page_count ? (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-foreground/50 mb-1.5">
                  <span>Page {book.progress_page ?? 0} of {book.book.page_count}</span>
                  <span className="font-medium">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-forest rounded-full transition-all duration-500"
                    style={{ width: `${pct ?? 0}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-foreground/45">Page {book.progress_page ?? 0}</p>
            )}

            {/* Update progress */}
            {editing ? (
              <div className="mt-4 flex gap-2 max-w-xs">
                <input
                  autoFocus
                  type="number"
                  min={0}
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveProgress(); if (e.key === "Escape") setEditing(false); }}
                  placeholder={String(book.progress_page ?? 0)}
                  className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:border-foreground/40 focus:ring-0"
                />
                <Button onClick={saveProgress} size="sm">Save</Button>
                <Button onClick={() => setEditing(false)} size="sm" variant="ghost">✕</Button>
              </div>
            ) : (
              <button
                onClick={() => { setEditing(true); setPage(String(book.progress_page ?? "")); }}
                className="mt-4 text-xs text-foreground/50 hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Update page
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
