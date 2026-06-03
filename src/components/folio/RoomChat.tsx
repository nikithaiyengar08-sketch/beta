import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const EMOJI = ["❤️", "🔥", "😂", "🤯", "😭", "👀"] as const;

type Message = {
  id: string;
  user_id: string;
  body: string;
  reply_to_id: string | null;
  pinned_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null };
};
type Reaction = { message_id: string; user_id: string; emoji: string };

type Props = {
  roomId: string;
  userId: string;
  isMod: boolean;
};

export function RoomChat({ roomId, userId, isMod }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [typing, setTyping] = useState<Record<string, { name: string; at: number }>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingRef = useRef(0);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("room_messages")
      .select("id, user_id, body, reply_to_id, pinned_at, edited_at, deleted_at, created_at, profile:profiles(display_name, username, avatar_url)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(200);
    const msgs = (data ?? []) as Message[];
    setMessages(msgs);
    if (msgs.length) {
      const { data: rx } = await (supabase as any)
        .from("room_message_reactions")
        .select("message_id, user_id, emoji")
        .in("message_id", msgs.map((m) => m.id));
      const map: Record<string, Reaction[]> = {};
      for (const r of (rx ?? []) as Reaction[]) (map[r.message_id] ||= []).push(r);
      setReactions(map);
    }
  };

  useEffect(() => {
    void load();
  }, [roomId]);

  useEffect(() => {
    const ch = supabase
      .channel(`chat-${roomId}`, { config: { presence: { key: userId } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_message_reactions" }, load)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId === userId) return;
        setTyping((t) => ({ ...t, [payload.userId]: { name: payload.name, at: Date.now() } }));
      })
      .subscribe();
    channelRef.current = ch;
    const interval = setInterval(() => {
      setTyping((t) => {
        const now = Date.now();
        const next: typeof t = {};
        for (const [k, v] of Object.entries(t)) if (now - v.at < 3000) next[k] = v;
        return next;
      });
    }, 1000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(ch);
    };
  }, [roomId, userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const broadcastTyping = () => {
    const now = Date.now();
    if (now - lastTypingRef.current < 1500) return;
    lastTypingRef.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId, name: "Someone" },
    });
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    const { error } = await (supabase as any).from("room_messages").insert({
      room_id: roomId,
      user_id: userId,
      body: text,
      reply_to_id: replyTo?.id ?? null,
    });
    if (error) return toast.error(error.message);
    setBody("");
    setReplyTo(null);
  };

  const toggleReaction = async (mid: string, emoji: string) => {
    const mine = (reactions[mid] ?? []).some((r) => r.user_id === userId && r.emoji === emoji);
    if (mine) {
      await (supabase as any).from("room_message_reactions").delete()
        .eq("message_id", mid).eq("user_id", userId).eq("emoji", emoji);
    } else {
      await (supabase as any).from("room_message_reactions").insert({ message_id: mid, user_id: userId, emoji });
    }
  };

  const pin = async (m: Message) => {
    if (!isMod) return;
    const isPinned = !!m.pinned_at;
    await (supabase as any).from("room_messages").update({
      pinned_at: isPinned ? null : new Date().toISOString(),
      pinned_by: isPinned ? null : userId,
    }).eq("id", m.id);
  };

  const startEdit = (m: Message) => {
    setEditingId(m.id);
    setEditingBody(m.body);
  };
  const saveEdit = async () => {
    if (!editingId) return;
    const text = editingBody.trim();
    if (!text) return;
    await (supabase as any).from("room_messages").update({ body: text, edited_at: new Date().toISOString() }).eq("id", editingId);
    setEditingId(null);
    setEditingBody("");
  };

  const softDelete = async (m: Message) => {
    if (!window.confirm("Delete message?")) return;
    await (supabase as any).from("room_messages").update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
      body: "[deleted]",
    }).eq("id", m.id);
  };

  const pinned = messages.filter((m) => m.pinned_at && !m.deleted_at);
  const typers = Object.values(typing).map((t) => t.name);

  const renderMessage = (m: Message) => {
    const rx = reactions[m.id] ?? [];
    const counts: Record<string, number> = {};
    for (const r of rx) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    const replied = m.reply_to_id ? messages.find((x) => x.id === m.reply_to_id) : null;
    const name = m.profile?.display_name ?? m.profile?.username ?? "Reader";
    return (
      <div key={m.id} className="group rounded-2xl px-3 py-2 hover:bg-muted/40 transition">
        {replied && (
          <div className="text-[11px] text-foreground/50 border-l-2 border-border pl-2 mb-1 truncate">
            ↪ {replied.profile?.display_name ?? "Reader"}: {replied.body.slice(0, 80)}
          </div>
        )}
        <div className="flex items-baseline gap-2 text-xs text-foreground/60">
          <span className="font-medium text-foreground">{name}</span>
          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {m.edited_at && <span className="italic">(edited)</span>}
          {m.pinned_at && <span className="text-burgundy">📌 pinned</span>}
        </div>
        {editingId === m.id ? (
          <div className="mt-1 flex gap-2">
            <Textarea value={editingBody} onChange={(e) => setEditingBody(e.target.value)} className="min-h-10" />
            <Button size="sm" onClick={saveEdit}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
          </div>
        ) : (
          <p className={`mt-0.5 text-sm whitespace-pre-wrap break-words ${m.deleted_at ? "italic text-foreground/40" : ""}`}>{m.body}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-1.5 items-center">
          {Object.entries(counts).map(([e, n]) => {
            const mine = rx.some((r) => r.user_id === userId && r.emoji === e);
            return (
              <button key={e} onClick={() => toggleReaction(m.id, e)} className={`text-[11px] px-1.5 py-0.5 rounded-full border ${mine ? "bg-foreground text-background border-foreground" : "border-border"}`}>
                {e} {n}
              </button>
            );
          })}
          <div className="opacity-0 group-hover:opacity-100 transition flex gap-1 ml-1">
            {EMOJI.map((e) => (
              <button key={e} onClick={() => toggleReaction(m.id, e)} className="text-xs hover:scale-125 transition">{e}</button>
            ))}
            <button onClick={() => setReplyTo(m)} className="text-[11px] text-foreground/60 hover:text-foreground ml-1">Reply</button>
            {(isMod || m.user_id === userId) && !m.deleted_at && (
              <>
                {m.user_id === userId && <button onClick={() => startEdit(m)} className="text-[11px] text-foreground/60 hover:text-foreground">Edit</button>}
                {isMod && <button onClick={() => pin(m)} className="text-[11px] text-foreground/60 hover:text-foreground">{m.pinned_at ? "Unpin" : "Pin"}</button>}
                <button onClick={() => softDelete(m)} className="text-[11px] text-foreground/60 hover:text-burgundy">Delete</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[70vh] rounded-3xl border border-border bg-background overflow-hidden">
      {pinned.length > 0 && (
        <div className="border-b border-border bg-muted/40 p-3 space-y-1 max-h-32 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-foreground/60">📌 Pinned</p>
          {pinned.map((m) => (
            <p key={m.id} className="text-xs text-foreground/80 truncate">
              <span className="font-medium">{m.profile?.display_name ?? "Reader"}:</span> {m.body}
            </p>
          ))}
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-center text-foreground/50 text-sm">
            <div><p className="font-serif text-xl text-foreground/70">No messages yet.</p><p>Start the conversation.</p></div>
          </div>
        )}
        {messages.map(renderMessage)}
      </div>
      {typers.length > 0 && (
        <div className="px-4 py-1 text-xs text-foreground/50 italic">someone is typing…</div>
      )}
      {replyTo && (
        <div className="px-3 py-1 bg-muted/40 text-xs flex justify-between items-center border-t border-border">
          <span>Replying to {replyTo.profile?.display_name ?? "Reader"}: {replyTo.body.slice(0, 60)}</span>
          <button onClick={() => setReplyTo(null)} className="text-foreground/60">×</button>
        </div>
      )}
      <form onSubmit={send} className="border-t border-border p-2 flex gap-2">
        <Textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); broadcastTyping(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(e as any); } }}
          placeholder="Message the room…"
          className="min-h-10 max-h-32 resize-none"
        />
        <Button type="submit" disabled={!body.trim()} className="self-end">Send</Button>
      </form>
    </div>
  );
}
