import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { searchOpenLibrary, ensureBook, type OLBook } from "@/lib/openlibrary";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

const GENRES = ["Fiction", "Mystery", "Fantasy", "Sci-Fi", "Romance", "Nonfiction", "Memoir", "Poetry"];

export function RoomCreate({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<OLBook[]>([]);
  const [picked, setPicked] = useState<OLBook | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [pace, setPace] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await searchOpenLibrary(q);
      setResults(r.slice(0, 8));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !picked) return;
    setBusy(true);
    try {
      const bookId = await ensureBook(picked);
      const { data: room, error } = await (supabase as any)
        .from("rooms")
        .insert({
          book_id: bookId,
          name: name.trim() || picked.title,
          description: description.trim() || null,
          genre: genre || null,
          is_public: isPublic,
          created_by: user.id,
          pace_pages_per_week: pace ? parseInt(pace, 10) : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      // owner-member row auto-created by trigger; insert is now a no-op safeguard
      await (supabase as any).from("room_members").upsert({ room_id: room.id, user_id: user.id, role: "owner" }, { onConflict: "room_id,user_id" });
      await logActivity({ type: "joined_room", book_id: bookId, room_id: room.id });
      toast.success("Room created");
      onOpenChange(false);
      setQ(""); setPicked(null); setName(""); setDescription(""); setGenre(""); setIsPublic(true); setPace("");
      navigate({ to: "/rooms/$roomId", params: { roomId: room.id } });
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't create room");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="font-serif text-2xl">Start a reading room</DialogTitle>
        <DialogDescription>Pick a book, invite friends, share highlights as you go.</DialogDescription>
        <form onSubmit={submit} className="space-y-4 mt-2">
          {picked ? (
            <div className="flex gap-3 items-center rounded-2xl border border-border p-3">
              {picked.cover_url && <img src={picked.cover_url} alt="" className="h-16 w-12 object-cover rounded" />}
              <div className="flex-1 min-w-0">
                <p className="font-serif text-lg leading-tight truncate">{picked.title}</p>
                <p className="text-xs text-foreground/60 truncate">{picked.author}</p>
              </div>
              <button type="button" onClick={() => setPicked(null)} className="text-xs text-foreground/60 hover:text-foreground">change</button>
            </div>
          ) : (
            <div>
              <Input placeholder="Search for a book…" value={q} onChange={(e) => setQ(e.target.value)} />
              {results.length > 0 && (
                <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-border divide-y divide-border">
                  {results.map(b => (
                    <button
                      type="button"
                      key={b.ol_id}
                      onClick={() => { setPicked(b); if (!name) setName(b.title); }}
                      className="flex w-full items-center gap-3 p-2 text-left hover:bg-muted"
                    >
                      {b.cover_url ? <img src={b.cover_url} alt="" className="h-12 w-9 object-cover rounded" /> : <div className="h-12 w-9 bg-muted rounded" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{b.title}</p>
                        <p className="text-[11px] text-foreground/60 truncate">{b.author}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <Input placeholder="Room name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="What's this room about? (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <div className="flex flex-wrap gap-2">
            {GENRES.map(g => (
              <button
                type="button"
                key={g}
                onClick={() => setGenre(genre === g ? "" : g)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${genre === g ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40"}`}
              >{g}</button>
            ))}
          </div>
          <Input placeholder="Pace: pages/week (optional)" type="number" min={0} value={pace} onChange={(e) => setPace(e.target.value)} />
          <div className="flex items-center justify-between rounded-2xl border border-border p-3">
            <div>
              <Label htmlFor="public-toggle" className="font-serif text-base">Public room</Label>
              <p className="text-xs text-foreground/60">Discoverable by everyone. Turn off for invite-only.</p>
            </div>
            <Switch id="public-toggle" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <Button type="submit" disabled={busy || !picked} className="w-full">
            {busy ? "Creating…" : "Create room"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}