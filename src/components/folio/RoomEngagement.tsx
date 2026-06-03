import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePollVotes, useRsvps, useCheckpoints } from "@/lib/engagement";
import { toast } from "sonner";

type Props = { roomId: string; bookPages?: number };

// Deterministic seed-based mock data so each room shows its own polls /
// schedule / checkpoints without a DB schema change.
function seedRand(seed: string) {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return () => { h = (h * 1664525 + 1013904223) | 0; return ((h >>> 0) % 10000) / 10000; };
}

export function RoomEngagement({ roomId, bookPages = 320 }: Props) {
  const { user } = useAuth();
  const uid = user?.id || "guest";

  const rng = useMemo(() => seedRand(roomId), [roomId]);

  // Polls
  const polls = useMemo(() => {
    const questions = [
      { q: "Best chapter so far?", opts: ["Chapter 3", "Chapter 7", "Chapter 12", "The opening"] },
      { q: "Which character do you root for?", opts: ["The narrator", "The sister", "The professor", "The dog"] },
      { q: "How are you reading?", opts: ["Print", "Ebook", "Audio", "Mix"] },
    ];
    return questions.slice(0, 2).map((p, i) => {
      const id = `${roomId}:poll:${i}`;
      const counts = p.opts.map(() => Math.floor(5 + rng() * 30));
      return { id, q: p.q, opts: p.opts.map((label, j) => ({ id: `${id}:${j}`, label, base: counts[j] })) };
    });
  }, [roomId, rng]);

  // Schedule
  const schedule = useMemo(() => {
    const titles = ["Kickoff discussion", "Mid-read check-in", "Spoiler-friendly finale", "Author Q&A watch-party"];
    const now = new Date();
    return titles.slice(0, 3).map((t, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() + (i + 1) * 7);
      d.setHours(19, 0, 0, 0);
      return { id: `${roomId}:evt:${i}`, title: t, when: d };
    });
  }, [roomId]);

  // Checkpoints — split book into 6 milestones
  const checkpoints = useMemo(() => {
    const total = 6;
    return Array.from({ length: total }).map((_, i) => ({
      chapter: i + 1,
      label: `Checkpoint ${i + 1}`,
      page: Math.round(((i + 1) / total) * bookPages),
    }));
  }, [bookPages]);

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-xl">In the room</h3>

      {/* Polls */}
      <div className="grid sm:grid-cols-2 gap-3">
        {polls.map(p => <Poll key={p.id} poll={p} uid={uid} />)}
      </div>

      {/* Scheduled discussions */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <p className="font-serif text-lg">Scheduled discussions</p>
          <p className="text-[11px] text-foreground/60">RSVPs are private to the room</p>
        </div>
        <ul className="mt-3 divide-y divide-border">
          {schedule.map(e => <ScheduleItem key={e.id} evt={e} uid={uid} />)}
        </ul>
      </div>

      {/* Chapter checkpoints */}
      <Checkpoints roomId={roomId} uid={uid} items={checkpoints} />
    </div>
  );
}

function Poll({ poll, uid }: { poll: { id: string; q: string; opts: { id: string; label: string; base: number }[] }; uid: string }) {
  const votes = usePollVotes(uid);
  const my = votes.voteFor(poll.id);
  const counts = poll.opts.map(o => o.base + (my === o.id ? 1 : 0));
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-serif text-base">{poll.q}</p>
      <ul className="mt-3 space-y-1.5">
        {poll.opts.map((o, i) => {
          const pct = total ? Math.round((counts[i] / total) * 100) : 0;
          const picked = my === o.id;
          return (
            <li key={o.id}>
              <button
                onClick={() => { votes.vote(poll.id, o.id); }}
                className={`relative w-full text-left rounded-lg border px-3 py-2 text-sm overflow-hidden ${picked ? "border-rose" : "border-border hover:border-foreground/30"}`}
              >
                <div className="absolute inset-y-0 left-0 bg-rose/10" style={{ width: `${pct}%` }} aria-hidden />
                <div className="relative flex justify-between">
                  <span>{o.label} {picked && "✓"}</span>
                  <span className="text-foreground/60 text-xs">{pct}% · {counts[i]}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-foreground/50">{total} votes</p>
    </div>
  );
}

function ScheduleItem({ evt, uid }: { evt: { id: string; title: string; when: Date }; uid: string }) {
  const rsvp = useRsvps(uid);
  const going = rsvp.isGoing(evt.id);
  const dateStr = evt.when.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timeStr = evt.when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <li className="py-3 flex items-center gap-3">
      <div className="h-11 w-11 grid place-items-center rounded-xl bg-muted text-center">
        <span className="font-serif text-base leading-none">{evt.when.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{evt.title}</p>
        <p className="text-xs text-foreground/60">{dateStr} · {timeStr}</p>
      </div>
      <button
        onClick={() => { rsvp.toggle(evt.id); toast.success(going ? "RSVP removed" : "You're in"); }}
        className={`text-xs px-3 py-1.5 rounded-full ${going ? "bg-rose/10 text-rose border border-rose/40" : "bg-foreground text-background"}`}
      >
        {going ? "Going" : "RSVP"}
      </button>
    </li>
  );
}

function Checkpoints({ roomId, uid, items }: { roomId: string; uid: string; items: { chapter: number; label: string; page: number }[] }) {
  const cp = useCheckpoints(uid, roomId);
  const pct = cp.progress(items.length);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-serif text-lg">Chapter checkpoints</p>
        <p className="text-xs text-foreground/60">{pct}% complete</p>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-rose transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-4 grid sm:grid-cols-2 gap-2">
        {items.map(it => {
          const done = cp.isDone(it.chapter);
          return (
            <li key={it.chapter}>
              <button
                onClick={() => cp.toggle(it.chapter)}
                className={`w-full text-left flex items-center gap-3 rounded-xl border p-3 text-sm ${done ? "border-rose bg-rose/5" : "border-border hover:border-foreground/30"}`}
              >
                <span className={`h-5 w-5 rounded-full grid place-items-center text-[10px] ${done ? "bg-rose text-background" : "border border-border"}`}>
                  {done ? "✓" : it.chapter}
                </span>
                <span className="flex-1">{it.label}</span>
                <span className="text-[11px] text-foreground/50">p. {it.page}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-foreground/50">Tap to mark when you reach a checkpoint. Spoiler-safe discussion unlocks per checkpoint.</p>
    </div>
  );
}
