import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type EventRow = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number | null;
  location: string | null;
  created_by: string;
};
type Rsvp = { id: string; event_id: string; user_id: string; status: string };

const KINDS = [
  { value: "reading_session", label: "Reading session" },
  { value: "live_discussion", label: "Live discussion" },
  { value: "reading_sprint", label: "Reading sprint" },
  { value: "book_club", label: "Book club meet" },
  { value: "weekly_discussion", label: "Weekly discussion" },
];

export function RoomEvents({ roomId, userId, isMember }: { roomId: string; userId: string; isMember: boolean }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kind: "live_discussion", title: "", description: "", starts_at: "", duration: "60", location: "" });

  const load = async () => {
    const { data } = await (supabase as any)
      .from("room_events").select("*").eq("room_id", roomId).order("starts_at", { ascending: true });
    const ev = (data ?? []) as EventRow[];
    setEvents(ev);
    if (ev.length) {
      const { data: rs } = await (supabase as any).from("room_event_rsvps").select("*").in("event_id", ev.map((e) => e.id));
      setRsvps((rs ?? []) as Rsvp[]);
    }
  };
  useEffect(() => { void load(); }, [roomId]);
  useEffect(() => {
    const ch = supabase.channel(`events-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_events", filter: `room_id=eq.${roomId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_event_rsvps" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  const create = async () => {
    if (!form.title.trim() || !form.starts_at) return toast.error("Title and time required");
    const { error } = await (supabase as any).from("room_events").insert({
      room_id: roomId,
      created_by: userId,
      kind: form.kind,
      title: form.title.trim(),
      description: form.description.trim() || null,
      starts_at: new Date(form.starts_at).toISOString(),
      duration_minutes: parseInt(form.duration, 10) || 60,
      location: form.location.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Event scheduled");
    setOpen(false);
    setForm({ kind: "live_discussion", title: "", description: "", starts_at: "", duration: "60", location: "" });
  };

  const rsvp = async (eventId: string, status: "going" | "maybe" | "declined") => {
    const existing = rsvps.find((r) => r.event_id === eventId && r.user_id === userId);
    if (existing) {
      await (supabase as any).from("room_event_rsvps").update({ status }).eq("id", existing.id);
    } else {
      await (supabase as any).from("room_event_rsvps").insert({ event_id: eventId, user_id: userId, status });
    }
  };

  const deleteEvent = async (id: string) => {
    if (!window.confirm("Delete event?")) return;
    await (supabase as any).from("room_events").delete().eq("id", id);
  };

  const upcoming = events.filter((e) => new Date(e.starts_at) >= new Date(Date.now() - 60 * 60 * 1000));
  const past = events.filter((e) => new Date(e.starts_at) < new Date(Date.now() - 60 * 60 * 1000));

  return (
    <div className="space-y-6">
      {isMember && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>+ Schedule event</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Duration (min)" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                  <Input placeholder="Location / link" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <Button onClick={create} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {events.length === 0 && (
        <div className="rounded-3xl border border-border p-10 text-center text-foreground/60">
          <p className="font-serif text-xl">No events scheduled.</p>
          <p className="text-sm mt-1">Schedule a sprint, discussion, or book-club meet.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-widest text-foreground/60 mb-3">Upcoming</h3>
          <div className="space-y-3">{upcoming.map((e) => <EventCard key={e.id} e={e} rsvps={rsvps} userId={userId} onRsvp={rsvp} onDelete={deleteEvent} />)}</div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-widest text-foreground/60 mb-3">Past</h3>
          <div className="space-y-3 opacity-60">{past.slice(0, 5).map((e) => <EventCard key={e.id} e={e} rsvps={rsvps} userId={userId} onRsvp={rsvp} onDelete={deleteEvent} />)}</div>
        </section>
      )}
    </div>
  );
}

function EventCard({ e, rsvps, userId, onRsvp, onDelete }: { e: EventRow; rsvps: Rsvp[]; userId: string; onRsvp: (id: string, s: "going" | "maybe" | "declined") => void; onDelete: (id: string) => void; }) {
  const er = rsvps.filter((r) => r.event_id === e.id);
  const going = er.filter((r) => r.status === "going").length;
  const mine = er.find((r) => r.user_id === userId);
  const date = new Date(e.starts_at);
  return (
    <article className="rounded-3xl border border-border p-5 bg-background">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-foreground/60">{KINDS.find((k) => k.value === e.kind)?.label}</p>
          <h4 className="font-serif text-lg leading-tight mt-1">{e.title}</h4>
          <p className="text-xs text-foreground/60 mt-1">{date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {e.duration_minutes ?? 60} min{e.location ? ` · ${e.location}` : ""}</p>
          {e.description && <p className="text-sm mt-2 text-foreground/80">{e.description}</p>}
        </div>
        {e.created_by === userId && (
          <button onClick={() => onDelete(e.id)} className="text-foreground/40 hover:text-burgundy text-sm">×</button>
        )}
      </header>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-foreground/60">{going} going</span>
        <div className="flex gap-1">
          {(["going", "maybe", "declined"] as const).map((s) => (
            <button key={s} onClick={() => onRsvp(e.id, s)} className={`text-xs px-3 py-1 rounded-full border ${mine?.status === s ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40"}`}>
              {s === "going" ? "Going" : s === "maybe" ? "Maybe" : "Decline"}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
