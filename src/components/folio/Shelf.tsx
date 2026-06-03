import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGate } from "@/components/auth/AuthGate";
import { toast } from "sonner";
import { ReviewSheet } from "./ReviewSheet";
import { Button } from "@/components/ui/button";

type UB = {
  id: string;
  status: string | null;
  rating: number | null;
  progress_page: number | null;
  book: { id: string; title: string; author: string | null; cover_url: string | null } | null;
};

const STATUS_DOT: Record<string, string> = {
  reading: "bg-rose",
  read: "bg-forest",
  want: "bg-gold",
  dnf: "bg-foreground/40",
};

const STATUS_LABELS: Record<string, string> = {
  reading: "Reading",
  read: "Read",
  want: "Want to read",
  dnf: "Did Not Finish",
};

const ALL_STATUSES = [
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
  { value: "want", label: "Want to read" },
  { value: "dnf", label: "Did Not Finish" },
] as const;

const SPINE_COLORS = ["oklch(0.42 0.07 155)","oklch(0.38 0.13 18)","oklch(0.78 0.13 75)","oklch(0.28 0.06 158)","oklch(0.72 0.09 20)","oklch(0.65 0.08 50)","oklch(0.5 0.1 145)","oklch(0.4 0.1 30)","oklch(0.55 0.12 95)","oklch(0.72 0.05 295)"];

export function Shelf() {
  const { user } = useAuth();
  const { openSearch, openAuth } = useGate();
  const [items, setItems] = useState<UB[] | null>(null);
  const [filter, setFilter] = useState<"all" | "reading" | "read" | "want" | "dnf">("all");

  const load = async () => {
    if (!user) { setItems(null); return; }
    const { data } = await supabase
      .from("user_books")
      .select("id, status, rating, progress_page, book:books(id, title, author, cover_url)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setItems((data ?? []) as any);
  };


  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("user_books_shelf")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_books", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const rate = async (id: string, rating: number) => {
    const { error } = await supabase.from("user_books").update({ rating }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Rated");
  };

  const changeStatus = async (id: string, status: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const patch: Record<string, string | null> = { status };
    if (status === "reading") patch.started_at = today;
    if (status === "read") patch.finished_at = today;
    const { error } = await supabase.from("user_books").update(patch as never).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(`Moved to ${STATUS_LABELS[status] ?? status}`);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("user_books").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const real = items ?? [];
  const filtered = filter === "all" ? real : real.filter(i => i.status === filter);
  const counts = {
    all: real.length,
    reading: real.filter(i => i.status === "reading").length,
    read: real.filter(i => i.status === "read").length,
    want: real.filter(i => i.status === "want").length,
    dnf: real.filter(i => i.status === "dnf").length,
  };

  return (
    <section id="shelf" className="relative">
      <>
        <div className="flex items-center gap-2 mb-4">
          <svg className="h-4 w-4 text-foreground/50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <h2 className="text-sm uppercase tracking-widest text-foreground/50 font-medium">Your library</h2>
        </div>

        <div className="relative mb-6">
          <button
            onClick={openSearch}
            className="w-full flex items-center gap-3 rounded-full bg-background border border-border px-5 py-4 shadow-sm text-left hover:border-foreground/40 transition"
          >
            <svg className="h-5 w-5 text-foreground/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <span className="flex-1 text-foreground/40 font-serif text-lg italic">Search any book by title, author or ISBN…</span>
            <span className="text-xs px-3 py-1.5 rounded-full bg-foreground text-background">add</span>
          </button>
          <p className="mt-2 text-xs text-foreground/50 text-center">powered by Open Library · over 3 million books</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {([
            { l: "All books", k: "all", n: counts.all, dot: undefined as string | undefined },
            { l: "Reading", k: "reading", n: counts.reading, dot: "bg-rose" },
            { l: "Read", k: "read", n: counts.read, dot: "bg-forest" },
            { l: "Want to read", k: "want", n: counts.want, dot: "bg-gold" },
            { l: "DNF", k: "dnf", n: counts.dnf, dot: "bg-foreground/40" },
          ] as const).map((s) => (
            <button
              key={s.k}
              onClick={() => setFilter(s.k)}
              className={`inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full border transition ${filter === s.k ? "bg-foreground text-background border-foreground" : "border-border bg-background hover:border-foreground/40"}`}
            >
              {s.dot && <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
              {s.l}
              <span className="opacity-50">{user ? s.n : "—"}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <div className="flex items-end gap-2 md:gap-3 px-4 pt-12 pb-3 overflow-x-auto scrollbar-none min-h-[340px]">
            {!user && (
              <div className="mx-auto text-center max-w-sm">
                <p className="font-serif text-2xl">Sign in to start your shelf.</p>
                <Button onClick={openAuth} className="mt-4">Sign in</Button>
              </div>
            )}
            {user && items === null && (
              <div className="flex items-end gap-2 md:gap-3" aria-hidden>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-12 md:w-14 rounded-sm bg-muted animate-pulse"
                    style={{ height: `${260 + ((i * 37) % 80)}px` }}
                  />
                ))}
              </div>
            )}
            {user && items !== null && filtered.length === 0 && (
              <div className="mx-auto text-center max-w-sm">
                <p className="font-serif text-2xl">Your shelf is waiting.</p>
                <p className="text-sm text-foreground/60 mt-2">Add the book you're reading right now.</p>
                <Button onClick={openSearch} className="mt-4">+ Add a book</Button>
              </div>
            )}
            {user && items !== null && filtered.map((ub, i) => {
              const c = SPINE_COLORS[i % SPINE_COLORS.length];
              const h = 260 + ((i * 37) % 80);
              return (
                <RealSpine key={ub.id} ub={ub} color={c} height={h} onRate={rate} onRemove={remove} onChangeStatus={changeStatus} />
              );
            })}
          </div>
          <div className="h-4 bg-gradient-to-b from-[oklch(0.55_0.06_50)] to-[oklch(0.4_0.05_50)] rounded-sm shadow-2xl" />
          <div className="h-1.5 mx-3 bg-[oklch(0.3_0.04_50)] rounded-b-sm" />
        </div>
      </>
    </section>
  );
}

function RealSpine({ ub, color, height, onRate, onRemove, onChangeStatus }: {
  ub: UB;
  color: string;
  height: number;
  onRate: (id: string, r: number) => void;
  onRemove: (id: string) => void;
  onChangeStatus: (id: string, status: string) => void;
}) {
  const status = ub.status ?? "want";
  const cover = ub.book?.cover_url;
  const [reviewOpen, setReviewOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <div className="relative flex-shrink-0 group">
      <span className={`absolute -top-3 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full ${STATUS_DOT[status] ?? "bg-foreground/40"} ring-4 ring-ivory z-10`} />
      <div
        className="book-spine relative flex flex-col justify-between items-center py-5 px-2 w-12 md:w-14 cursor-pointer overflow-hidden"
        style={cover
          ? { height: `${height}px`, backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center", color: "oklch(0.97 0.02 85)" }
          : { height: `${height}px`, background: color, color: "oklch(0.97 0.02 85)" }}
      >
        {cover && (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.6))" }} />
        )}
        <span className="relative font-serif text-[13px] leading-none line-clamp-6 text-cream" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          {ub.book?.title ?? "Untitled"}
        </span>
        <span className="relative text-[9px] uppercase tracking-widest opacity-80 font-sans truncate max-w-full text-cream">
          {ub.book?.author ?? ""}
        </span>
      </div>

      {/* Hover popup */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-64 rounded-2xl bg-background border border-border p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 text-left">
        {ub.book?.cover_url && <img src={ub.book.cover_url} className="h-24 w-16 object-cover rounded shadow mb-2" alt="" />}
        <p className="font-serif text-lg leading-tight">{ub.book?.title}</p>
        <p className="text-xs text-foreground/60">{ub.book?.author}</p>

        {/* Star rating */}
        <div className="mt-3 flex items-center gap-1 text-gold text-sm">
          {Array.from({ length: 5 }).map((_, k) => (
            <button key={k} onClick={() => onRate(ub.id, k + 1)} className={k < (ub.rating ?? 0) ? "" : "opacity-20 hover:opacity-60"}>★</button>
          ))}
        </div>

        {/* Status change */}
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide text-foreground/40 mb-1">Status</p>
          {statusOpen ? (
            <div className="flex flex-col gap-1">
              {ALL_STATUSES.filter(s => s.value !== status).map(s => (
                <button
                  key={s.value}
                  onClick={() => { onChangeStatus(ub.id, s.value); setStatusOpen(false); }}
                  className="text-left text-xs px-2 py-1 rounded hover:bg-muted transition"
                >
                  → {s.label}
                </button>
              ))}
              <button onClick={() => setStatusOpen(false)} className="text-[10px] text-foreground/40 mt-1">cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setStatusOpen(true)}
              className="text-xs px-2 py-1 rounded border border-border hover:border-foreground/40 transition flex items-center gap-1"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? "bg-foreground/40"}`} />
              {STATUS_LABELS[status] ?? status}
              <span className="text-foreground/30 ml-1">▾</span>
            </button>
          )}
        </div>

        {ub.book && (
          <button onClick={() => setReviewOpen(true)} className="mt-3 block text-[11px] text-foreground/70 hover:text-foreground underline">Write review</button>
        )}
        {ub.book && (
          <Link to="/book/$bookId" params={{ bookId: ub.book.id }} className="mt-1 block text-[11px] text-foreground/70 hover:text-foreground underline">View book page →</Link>
        )}
        <button onClick={() => onRemove(ub.id)} className="mt-2 text-[10px] text-foreground/50 hover:text-burgundy">Remove from shelf</button>
      </div>

      {ub.book && (
        <ReviewSheet open={reviewOpen} onOpenChange={setReviewOpen} book={{ id: ub.book.id, title: ub.book.title, author: ub.book.author, cover_url: ub.book.cover_url }} />
      )}
    </div>
  );
}
