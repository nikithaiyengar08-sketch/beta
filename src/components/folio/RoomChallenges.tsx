import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  target_value: number | null;
  target_genre: string | null;
  starts_on: string;
  ends_on: string | null;
};
type Progress = { id: string; challenge_id: string; user_id: string; progress_value: number; completed_at: string | null };

const KINDS = [
  { value: "books_count", label: "Read N books" },
  { value: "pages_count", label: "Read N pages" },
  { value: "genre_focus", label: "Genre focus" },
  { value: "custom", label: "Custom" },
];

export function RoomChallenges({ roomId, userId, isMod }: { roomId: string; userId: string; isMod: boolean }) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", kind: "books_count", target_value: "5", target_genre: "", ends_on: "" });

  const load = async () => {
    const { data } = await (supabase as any).from("room_challenges").select("*").eq("room_id", roomId).order("starts_on", { ascending: false });
    const ch = (data ?? []) as Challenge[];
    setChallenges(ch);
    if (ch.length) {
      const { data: p } = await (supabase as any).from("room_challenge_progress").select("*").in("challenge_id", ch.map((c) => c.id));
      setProgress((p ?? []) as Progress[]);
    }
  };
  useEffect(() => { void load(); }, [roomId]);
  useEffect(() => {
    const ch = supabase.channel(`challenges-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_challenges", filter: `room_id=eq.${roomId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_challenge_progress" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  const create = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    const { error } = await (supabase as any).from("room_challenges").insert({
      room_id: roomId,
      created_by: userId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      kind: form.kind,
      target_value: form.kind !== "custom" ? parseInt(form.target_value, 10) || null : null,
      target_genre: form.kind === "genre_focus" ? form.target_genre.trim() || null : null,
      ends_on: form.ends_on || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Challenge created");
    setOpen(false);
    setForm({ title: "", description: "", kind: "books_count", target_value: "5", target_genre: "", ends_on: "" });
  };

  const updateMine = async (c: Challenge, delta: number) => {
    const mine = progress.find((p) => p.challenge_id === c.id && p.user_id === userId);
    const cur = mine?.progress_value ?? 0;
    const next = Math.max(0, cur + delta);
    const done = c.target_value && next >= c.target_value;
    if (mine) {
      await (supabase as any).from("room_challenge_progress").update({
        progress_value: next,
        completed_at: done ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", mine.id);
    } else {
      await (supabase as any).from("room_challenge_progress").insert({
        challenge_id: c.id, user_id: userId, progress_value: next,
        completed_at: done ? new Date().toISOString() : null,
      });
    }
  };

  return (
    <div className="space-y-5">
      {isMod && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>+ New challenge</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create challenge</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Title (e.g. Read 5 mysteries this month)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
                </Select>
                {form.kind !== "custom" && <Input type="number" placeholder="Target" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} />}
                {form.kind === "genre_focus" && <Input placeholder="Genre" value={form.target_genre} onChange={(e) => setForm({ ...form, target_genre: e.target.value })} />}
                <div>
                  <label className="text-xs text-foreground/60">Ends on (optional)</label>
                  <Input type="date" value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} />
                </div>
                <Button onClick={create} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {challenges.length === 0 && (
        <div className="rounded-3xl border border-border p-10 text-center text-foreground/60">
          <p className="font-serif text-xl">No challenges yet.</p>
          {isMod && <p className="text-sm mt-1">Spin one up to keep the room engaged.</p>}
        </div>
      )}

      {challenges.map((c) => {
        const mine = progress.find((p) => p.challenge_id === c.id && p.user_id === userId);
        const cur = mine?.progress_value ?? 0;
        const pct = c.target_value ? Math.min(100, Math.round((cur / c.target_value) * 100)) : 0;
        const participants = progress.filter((p) => p.challenge_id === c.id).length;
        const completed = progress.filter((p) => p.challenge_id === c.id && p.completed_at).length;
        return (
          <article key={c.id} className="rounded-3xl border border-border bg-background p-5">
            <header className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-foreground/60">{KINDS.find((k) => k.value === c.kind)?.label}</p>
                <h4 className="font-serif text-lg leading-tight mt-1">{c.title}</h4>
                {c.description && <p className="text-sm mt-1 text-foreground/80">{c.description}</p>}
                <p className="text-xs text-foreground/60 mt-1">{new Date(c.starts_on).toLocaleDateString()}{c.ends_on ? ` → ${new Date(c.ends_on).toLocaleDateString()}` : ""} · {participants} joined · {completed} completed</p>
              </div>
            </header>
            {c.target_value && (
              <>
                <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-forest transition-all" style={{ width: `${pct}%` }} /></div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span>{cur} / {c.target_value}{mine?.completed_at && " · ✓ done"}</span>
                  <div className="flex gap-1">
                    <button onClick={() => updateMine(c, -1)} className="px-2 py-0.5 rounded-full border border-border">−</button>
                    <button onClick={() => updateMine(c, 1)} className="px-2 py-0.5 rounded-full border border-border">+</button>
                  </div>
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
