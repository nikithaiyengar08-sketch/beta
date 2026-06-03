import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

const EMOJI = ["❤️", "😭", "🔥", "🤯", "😂", "⭐"] as const;
type Highlight = { id: string; user_id: string; page_number: number | null; text: string; created_at: string; profile?: { display_name: string | null; username: string | null; avatar_url: string | null } };

export function RoomHighlights({ roomId, userId, bookId }: { roomId: string; userId: string; bookId: string | null }) {
  const [items, setItems] = useState<Highlight[]>([]);
  const [reactions, setReactions] = useState<Record<string, { emoji: string; user_id: string }[]>>({});
  const [text, setText] = useState("");
  const [page, setPage] = useState("");

  const load = async () => {
    const { data } = await (supabase as any)
      .from("room_highlights")
      .select("id, user_id, page_number, text, created_at, profile:profiles(display_name, username, avatar_url)")
      .eq("room_id", roomId)
      .order("page_number", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    const hs = (data ?? []) as Highlight[];
    setItems(hs);
    if (hs.length === 0) return setReactions({});
    const { data: rx } = await (supabase as any).from("room_reactions").select("highlight_id, emoji, user_id").in("highlight_id", hs.map((h) => h.id));
    const map: Record<string, { emoji: string; user_id: string }[]> = {};
    for (const r of (rx ?? []) as any[]) (map[r.highlight_id] ||= []).push(r);
    setReactions(map);
  };
  useEffect(() => { void load(); }, [roomId]);
  useEffect(() => {
    const ch = supabase.channel(`hl-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_highlights", filter: `room_id=eq.${roomId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_reactions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const { error } = await (supabase as any).from("room_highlights").insert({
      room_id: roomId, user_id: userId, text: text.trim(), page_number: page ? parseInt(page, 10) : null,
    });
    if (error) return toast.error(error.message);
    await logActivity({ type: "posted_highlight", room_id: roomId, book_id: bookId });
    setText(""); setPage("");
  };
  const toggleReaction = async (id: string, emoji: string) => {
    const has = (reactions[id] ?? []).some((r) => r.user_id === userId && r.emoji === emoji);
    if (has) await (supabase as any).from("room_reactions").delete().eq("highlight_id", id).eq("user_id", userId).eq("emoji", emoji);
    else await (supabase as any).from("room_reactions").insert({ highlight_id: id, user_id: userId, emoji });
  };

  return (
    <div className="space-y-5">
      {items.length === 0 && <div className="rounded-3xl border border-border bg-ivory p-10 text-center"><p className="font-serif text-xl">No highlights yet.</p><p className="text-sm text-foreground/60 mt-1">Share a line that hit.</p></div>}
      {items.map((h) => {
        const rx = reactions[h.id] ?? [];
        const counts: Record<string, number> = {};
        for (const r of rx) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
        return (
          <article key={h.id} className="rounded-3xl border border-border p-5 bg-background">
            <header className="flex items-center justify-between text-xs text-foreground/60 mb-3">
              <span>{h.profile?.display_name ?? h.profile?.username ?? "Reader"}{h.page_number ? ` · p. ${h.page_number}` : ""}</span>
              {h.user_id === userId && <button onClick={async () => { if (window.confirm("Delete?")) await (supabase as any).from("room_highlights").delete().eq("id", h.id); }} className="text-foreground/40 hover:text-burgundy">×</button>}
            </header>
            <blockquote className="font-serif text-xl leading-snug border-l-2 border-rose pl-4">{h.text}</blockquote>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {EMOJI.map((e) => {
                const mine = rx.some((r) => r.user_id === userId && r.emoji === e);
                const n = counts[e] ?? 0;
                return (
                  <button key={e} onClick={() => toggleReaction(h.id, e)} className={`text-xs px-2.5 py-1 rounded-full border transition ${mine ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40"}`}>
                    {e}{n > 0 && <span className="ml-1 opacity-80">{n}</span>}
                  </button>
                );
              })}
            </div>
          </article>
        );
      })}
      <form onSubmit={post} className="rounded-3xl border border-border bg-background p-4 space-y-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Drop a line that hit you…" className="min-h-20 font-serif text-base" />
        <div className="flex gap-2">
          <Input type="number" min={0} placeholder="page" value={page} onChange={(e) => setPage(e.target.value)} className="max-w-24 text-sm" />
          <Button type="submit" disabled={!text.trim()} className="flex-1">Share highlight</Button>
        </div>
      </form>
    </div>
  );
}
