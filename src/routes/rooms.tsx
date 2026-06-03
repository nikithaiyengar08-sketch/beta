import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Footer } from "@/components/folio/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGate } from "@/components/auth/AuthGate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RoomCreate } from "@/components/folio/RoomCreate";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";

export const Route = createFileRoute("/rooms")({
  head: () => ({ meta: [{ title: "Reading rooms — Folio" }] }),
  component: RoomsPage,
});

type RoomRow = {
  id: string;
  name: string;
  status: string | null;
  invite_code: string | null;
  pace_pages_per_week: number | null;
  genre?: string | null;
  book: { id: string; title: string; author: string | null; cover_url: string | null; page_count: number | null } | null;
  member_count: number;
};

const GENRES = ["Fiction", "Mystery", "Fantasy", "Sci-Fi", "Romance", "Nonfiction", "Memoir", "Poetry"];

function RoomsPage() {
  const { user, loading } = useAuth();
  const { openAuth } = useGate();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [discover, setDiscover] = useState<RoomRow[]>([]);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: memberships } = await (supabase as any)
      .from("room_members").select("room_id").eq("user_id", user.id);
    const roomIds = (memberships ?? []).map((m: any) => m.room_id);
    if (roomIds.length === 0) { setRooms([]); }
    else {
      const { data } = await (supabase as any)
        .from("rooms")
        .select("id, name, status, invite_code, pace_pages_per_week, book:books(id, title, author, cover_url, page_count)")
        .in("id", roomIds)
        .order("created_at", { ascending: false });
      const withCounts: RoomRow[] = await Promise.all(((data ?? []) as any[]).map(async (r) => {
        const { count } = await (supabase as any)
          .from("room_members").select("*", { count: "exact", head: true }).eq("room_id", r.id);
        return { ...r, member_count: count ?? 0 };
      }));
      setRooms(withCounts);
    }
    // discovery: public rooms not yet joined
    let q = (supabase as any)
      .from("rooms")
      .select("id, name, status, invite_code, pace_pages_per_week, genre, book:books(id, title, author, cover_url, page_count)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);
    if (roomIds.length) q = q.not("id", "in", `(${roomIds.join(",")})`);
    if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
    if (genre) q = q.eq("genre", genre);
    const { data: pub } = await q;
    const withCounts: RoomRow[] = await Promise.all(((pub ?? []) as any[]).map(async (r) => {
      const { count } = await (supabase as any).from("room_members").select("*", { count: "exact", head: true }).eq("room_id", r.id);
      return { ...r, member_count: count ?? 0 };
    }));
    setDiscover(withCounts);
  };

  useEffect(() => { if (!loading && !user) openAuth(); }, [loading, user, openAuth]);
  useEffect(() => { load(); }, [user?.id, query, genre]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`rooms-list-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const joinPublic = async (roomId: string, bookId?: string) => {
    if (!user) return openAuth();
    const { error } = await (supabase as any).from("room_members").insert({ room_id: roomId, user_id: user.id });
    if (error && !String(error.message).includes("duplicate")) return toast.error(error.message);
    await logActivity({ type: "joined_room", room_id: roomId, book_id: bookId ?? null });
    navigate({ to: "/rooms/$roomId", params: { roomId } });
  };

  const joinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !code.trim()) return;
    setJoining(true);
    try {
      const { data: room } = await (supabase as any)
        .from("rooms").select("id, book_id").eq("invite_code", code.trim().toLowerCase()).maybeSingle();
      if (!room) { toast.error("No room with that invite code"); return; }
      const { error } = await (supabase as any).from("room_members").insert({ room_id: room.id, user_id: user.id });
      if (error && !String(error.message).includes("duplicate")) throw error;
      await logActivity({ type: "joined_room", room_id: room.id, book_id: room.book_id });
      toast.success("Joined the room");
      setCode("");
      navigate({ to: "/rooms/$roomId", params: { roomId: room.id } });
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't join");
    } finally { setJoining(false); }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="chip">Reading rooms</span>
            <h1 className="font-serif text-5xl md:text-6xl mt-3">Read with your people.</h1>
          </div>
          <Button
            onClick={() => user ? setCreateOpen(true) : openAuth()}
            className="hidden sm:inline-flex hover:gap-3 transition-all"
          >
            + Create a room
          </Button>
        </div>

        {user && (
          <form onSubmit={joinByCode} className="flex gap-2 mb-10 max-w-md">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter invite code" />
            <Button type="submit" disabled={joining || !code.trim()}>Join</Button>
          </form>
        )}

        {user && rooms.length === 0 && (
          <div className="rounded-3xl border border-border bg-ivory p-12 text-center">
            <p className="font-serif text-2xl">No rooms yet.</p>
            <p className="mt-2 text-foreground/60 text-sm">Start one — or paste an invite code above.</p>
            <Button onClick={() => setCreateOpen(true)} className="mt-5">+ Create a room</Button>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {rooms.map(r => (
            <Link key={r.id} to="/rooms/$roomId" params={{ roomId: r.id }} className="group rounded-3xl border border-border p-5 hover:border-foreground/40 transition flex gap-4">
              {r.book?.cover_url ? (
                <img src={r.book.cover_url} alt="" className="h-28 w-20 object-cover rounded shadow shrink-0" />
              ) : (
                <div className="h-28 w-20 bg-muted rounded shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg leading-tight truncate group-hover:text-burgundy transition">{r.name}</p>
                <p className="text-xs text-foreground/60 truncate">{r.book?.title} · {r.book?.author}</p>
                <p className="text-[11px] text-foreground/50 mt-2">{r.member_count} member{r.member_count === 1 ? "" : "s"}{r.pace_pages_per_week ? ` · ${r.pace_pages_per_week} pp/week` : ""}</p>
                {r.status === "finished" && <span className="mt-2 inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-forest text-cream">finished</span>}
              </div>
            </Link>
          ))}
        </div>

        {/* Discovery */}
        <section className="mt-16">
          <div className="flex items-end justify-between mb-5">
            <div>
              <span className="chip">Discover</span>
              <h2 className="font-serif text-3xl md:text-4xl mt-2">Public rooms to join</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rooms by name…"
              className="max-w-xs"
            />
            <button
              type="button"
              onClick={() => setGenre("")}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${genre === "" ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40"}`}
            >All</button>
            {GENRES.map(g => (
              <button
                type="button"
                key={g}
                onClick={() => setGenre(genre === g ? "" : g)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${genre === g ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40"}`}
              >{g}</button>
            ))}
          </div>
          {discover.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-foreground/60">
              No public rooms match. Try another search — or be the first to start one.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {discover.map(r => (
                <div key={r.id} className="rounded-3xl border border-border p-5 hover:border-foreground/40 transition flex gap-4">
                  {r.book?.cover_url ? (
                    <img src={r.book.cover_url} alt="" className="h-28 w-20 object-cover rounded shadow shrink-0" />
                  ) : (
                    <div className="h-28 w-20 bg-muted rounded shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-lg leading-tight truncate">{r.name}</p>
                    <p className="text-xs text-foreground/60 truncate">{r.book?.title} · {r.book?.author}</p>
                    <p className="text-[11px] text-foreground/50 mt-1">{r.member_count} member{r.member_count === 1 ? "" : "s"}{r.genre ? ` · ${r.genre}` : ""}</p>
                    <Button
                      onClick={() => joinPublic(r.id, r.book?.id)}
                      size="sm"
                      className="mt-3"
                    >Join room</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <RoomCreate open={createOpen} onOpenChange={setCreateOpen} />
      <Footer />
    </main>
  );
}
