import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Footer } from "@/components/folio/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useGate } from "@/components/auth/AuthGate";
import { ensureBook, type OLBook } from "@/lib/openlibrary";
import { toast } from "sonner";

export const Route = createFileRoute("/list/$listId")({
  head: () => ({
    meta: [
      { title: "Reading list — Folio" },
      { name: "description", content: "A curated reading list on Folio." },
    ],
  }),
  component: ListDetailPage,
});

type BookRow = {
  id: string; ol_id: string | null; title: string; author: string | null;
  cover_url: string | null; isbn: string | null; published_year: number | null;
  listBookId: string;
};

const SHELF_STATUSES = [
  { value: "want", label: "Want to read" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
  { value: "dnf", label: "Did Not Finish" },
] as const;

function ListDetailPage() {
  const { listId } = Route.useParams();
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["list", listId],
    queryFn: async () => {
      const { data: list } = await (supabase as any)
        .from("reading_lists")
        .select("id, name, description, is_public, user_id, profiles:profiles(display_name, username)")
        .eq("id", listId)
        .maybeSingle();
      if (!list) return { list: null, books: [] as BookRow[] };
      const { data: lb } = await supabase
        .from("list_books")
        .select("id, sort_order, book:books(id, ol_id, title, author, cover_url, isbn, published_year)")
        .eq("list_id", listId)
        .order("sort_order", { ascending: true });
      const books: BookRow[] = ((lb ?? []) as any[])
        .filter(r => r.book)
        .map(r => ({ ...(r.book as any), listBookId: r.id }));
      return { list: list as any, books };
    },
  });

  const list = data?.list;
  const books = data?.books ?? [];
  const isOwner = !!user && !!list && list.user_id === user.id;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        
        <div className="mx-auto max-w-7xl px-6 py-20 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
        </div>
      </main>
    );
  }

  if (!list) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        
        <div className="mx-auto max-w-3xl px-6 py-32 text-center">
          <h1 className="font-serif text-5xl">List not found</h1>
          <p className="mt-3 text-foreground/60">It may be private or no longer exist.</p>
          <Link to="/" className="mt-6 inline-flex rounded-full bg-foreground px-5 py-2 text-sm text-background">Back home</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const creator = list.profiles?.display_name ?? list.profiles?.username ?? "anon";

  return (
    <main className="min-h-screen bg-background text-foreground">
      
      <header className="mx-auto max-w-7xl px-6 pt-16 pb-10">
        <span className="chip">Reading list</span>
        <h1 className="font-serif text-5xl md:text-7xl mt-4 leading-[1]">{list.name}</h1>
        {list.description && (
          <p className="text-foreground/65 text-lg max-w-2xl mt-4">{list.description}</p>
        )}
        <p className="text-sm text-foreground/55 mt-3">
          by @{creator} · {books.length} book{books.length === 1 ? "" : "s"}
        </p>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        {books.length === 0 ? (
          <p className="text-foreground/60 italic">No books in this list yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map(b => (
              <ListBookCard key={b.listBookId} b={b} isOwner={isOwner} onRemoved={refetch} />
            ))}
          </div>
        )}

        {isOwner && (
          <div className="mt-16 border-t border-border pt-8 flex justify-end">
            <DeleteListButton listId={list.id} />
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}

function ListBookCard({ b, isOwner, onRemoved }: { b: BookRow; isOwner: boolean; onRemoved: () => void }) {
  const { user } = useAuth();
  const { openAuth } = useGate();
  const [removing, setRemoving] = useState(false);

  const add = async (status: typeof SHELF_STATUSES[number]["value"]) => {
    if (!user) { openAuth(); return; }
    try {
      const ol: OLBook = {
        ol_id: b.ol_id ?? b.id, title: b.title, author: b.author ?? "Unknown",
        cover_url: b.cover_url, isbn: b.isbn, published_year: b.published_year,
      };
      const bookId = await ensureBook(ol);
      const today = new Date().toISOString().slice(0, 10);
      const patch: Record<string, string> = { user_id: user.id, book_id: bookId, status };
      if (status === "reading") patch.started_at = today;
      if (status === "read") { patch.started_at = today; patch.finished_at = today; }
      const { error } = await supabase.from("user_books").upsert(
        patch as never,
        { onConflict: "user_id,book_id" }
      );
      if (error) throw error;
      const found = SHELF_STATUSES.find(s => s.value === status);
      toast.success(`Added to ${found?.label ?? status}`);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      const { error } = await supabase.from("list_books").delete().eq("id", b.listBookId);
      if (error) throw error;
      toast.success("Removed");
      onRemoved();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setRemoving(false); }
  };

  return (
    <div className="group">
      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted shadow-md relative">
        {b.cover_url ? (
          <img src={b.cover_url} alt={b.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-foreground/40 p-3 text-center font-serif">{b.title}</div>
        )}
        {isOwner && (
          <button
            onClick={remove}
            disabled={removing}
            aria-label="Remove from list"
            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-foreground/80 text-background text-xs opacity-0 group-hover:opacity-100 transition"
          >×</button>
        )}
      </div>
      <p className="mt-2 font-serif text-sm leading-tight line-clamp-2">{b.title}</p>
      <p className="text-[11px] text-foreground/55 line-clamp-1">{b.author ?? "Unknown"}</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="mt-2 h-7 px-3 text-[11px]">+ Add to shelf</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {SHELF_STATUSES.map(s => (
            <DropdownMenuItem key={s.value} onSelect={() => add(s.value)}>
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DeleteListButton({ listId }: { listId: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const doDelete = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("reading_lists").delete().eq("id", listId);
      if (error) throw error;
      toast.success("List deleted");
      navigate({ to: "/" });
    } catch (e: any) { toast.error(e.message ?? "Failed"); setBusy(false); }
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger className="text-xs px-4 py-2 rounded-full border border-border text-foreground/70 hover:text-burgundy hover:border-burgundy transition">
        Delete list
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this list?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={doDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
