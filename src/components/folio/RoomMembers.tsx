import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Member = {
  id: string;
  user_id: string;
  role: "owner" | "moderator" | "member";
  current_page: number | null;
  joined_at: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null };
};

export function RoomMembers({ roomId, userId, isMod, isOwner }: { roomId: string; userId: string; isMod: boolean; isOwner: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("room_members")
      .select("id, user_id, role, current_page, joined_at, profile:profiles(display_name, username, avatar_url)")
      .eq("room_id", roomId)
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true });
    setMembers((data ?? []) as Member[]);
  };
  useEffect(() => { void load(); }, [roomId]);
  useEffect(() => {
    const ch = supabase.channel(`mem-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  const setRole = async (m: Member, role: "moderator" | "member") => {
    if (!isOwner || m.role === "owner") return;
    const { error } = await (supabase as any).from("room_members").update({ role }).eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success(`Set ${role}`);
  };

  const remove = async (m: Member) => {
    if (!isMod || m.role === "owner") return;
    if (!window.confirm(`Remove ${m.profile?.display_name ?? "this member"}?`)) return;
    const { error } = await (supabase as any).from("room_members").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
  };

  return (
    <div className="rounded-3xl border border-border bg-background p-5">
      <p className="text-xs uppercase tracking-widest text-foreground/60 mb-3">{members.length} member{members.length === 1 ? "" : "s"}</p>
      <ul className="divide-y divide-border">
        {members.map((m) => (
          <li key={m.id} className="py-3 flex items-center gap-3">
            {m.profile?.avatar_url ? (
              <img src={m.profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-muted" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{m.profile?.display_name ?? m.profile?.username ?? "Reader"}</p>
              <p className="text-[11px] text-foreground/60">
                <span className={`uppercase tracking-widest ${m.role === "owner" ? "text-burgundy" : m.role === "moderator" ? "text-forest" : ""}`}>{m.role}</span>
                {m.current_page != null && ` · page ${m.current_page}`}
              </p>
            </div>
            {isMod && m.user_id !== userId && m.role !== "owner" && (
              <div className="flex gap-1">
                {isOwner && (
                  m.role === "moderator"
                    ? <button onClick={() => setRole(m, "member")} className="text-[11px] px-2 py-1 rounded-full border border-border hover:border-foreground/40">Demote</button>
                    : <button onClick={() => setRole(m, "moderator")} className="text-[11px] px-2 py-1 rounded-full border border-border hover:border-foreground/40">Make mod</button>
                )}
                <button onClick={() => remove(m)} className="text-[11px] px-2 py-1 rounded-full border border-border hover:border-burgundy hover:text-burgundy">Remove</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
