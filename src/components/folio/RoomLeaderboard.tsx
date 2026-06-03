import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  room_id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  current_page: number | null;
  role: string;
  messages_count: number;
  highlights_count: number;
};

export function RoomLeaderboard({ roomId }: { roomId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const load = async () => {
    const { data } = await (supabase as any).from("room_leaderboard").select("*").eq("room_id", roomId);
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { void load(); }, [roomId]);

  const score = (r: Row) => (r.messages_count ?? 0) + (r.highlights_count ?? 0) * 3 + (r.current_page ?? 0) * 0.1;
  const sorted = [...rows].sort((a, b) => score(b) - score(a));
  const max = Math.max(1, ...sorted.map(score));

  return (
    <div className="space-y-6">
      <Section title="Most active overall">
        {sorted.map((r, i) => (
          <Bar key={r.user_id} rank={i + 1} name={r.display_name ?? r.username ?? "Reader"} avatar={r.avatar_url} value={Math.round(score(r))} pct={Math.round((score(r) / max) * 100)} suffix="pts" />
        ))}
      </Section>
      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Most messages">
          {[...rows].sort((a, b) => b.messages_count - a.messages_count).slice(0, 5).map((r, i) => (
            <Bar key={r.user_id} rank={i + 1} name={r.display_name ?? r.username ?? "Reader"} avatar={r.avatar_url} value={r.messages_count} pct={Math.round((r.messages_count / Math.max(1, ...rows.map((x) => x.messages_count))) * 100)} suffix="msgs" />
          ))}
        </Section>
        <Section title="Most highlights">
          {[...rows].sort((a, b) => b.highlights_count - a.highlights_count).slice(0, 5).map((r, i) => (
            <Bar key={r.user_id} rank={i + 1} name={r.display_name ?? r.username ?? "Reader"} avatar={r.avatar_url} value={r.highlights_count} pct={Math.round((r.highlights_count / Math.max(1, ...rows.map((x) => x.highlights_count))) * 100)} suffix="hl" />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-background p-5">
      <h3 className="text-xs uppercase tracking-widest text-foreground/60 mb-4">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
function Bar({ rank, name, avatar, value, pct, suffix }: { rank: number; name: string; avatar: string | null; value: number; pct: number; suffix: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-5 text-foreground/60 text-xs">{rank}</span>
      {avatar ? <img src={avatar} alt="" className="h-6 w-6 rounded-full object-cover" /> : <div className="h-6 w-6 rounded-full bg-muted" />}
      <span className="flex-1 truncate">{name}</span>
      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-forest" style={{ width: `${pct}%` }} /></div>
      <span className="text-xs text-foreground/60 w-16 text-right">{value} {suffix}</span>
    </div>
  );
}
