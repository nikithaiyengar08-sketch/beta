import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Footer } from "@/components/folio/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGate } from "@/components/auth/AuthGate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { RoomChat } from "@/components/folio/RoomChat";
import { RoomHighlights } from "@/components/folio/RoomHighlights";
import { RoomEvents } from "@/components/folio/RoomEvents";
import { RoomMembers } from "@/components/folio/RoomMembers";
import { RoomLeaderboard } from "@/components/folio/RoomLeaderboard";
import { RoomChallenges } from "@/components/folio/RoomChallenges";

export const Route = createFileRoute("/rooms/$roomId")({
  head: ({ params }) => ({
    meta: [
      { title: "Reading room — Folio" },
      { name: "description", content: `Join a reading room on Folio and read this book with a small community.` },
      { property: "og:title", content: "Reading room — Folio" },
    ],
  }),
  component: RoomDetail,
});

type Room = { id: string; name: string; invite_code: string | null; status: string | null; pace_pages_per_week: number | null; created_by: string; is_public: boolean | null; genre: string | null; description: string | null; book: { id: string; title: string; author: string | null; cover_url: string | null; page_count: number | null } | null };
type Me = { id: string; current_page: number | null; role: "owner" | "moderator" | "member" } | null;

function RoomDetail() {
  const { roomId } = Route.useParams();
  const { user, loading } = useAuth();
  const { openAuth } = useGate();
  const [room, setRoom] = useState<Room | null>(null);
  const [me, setMe] = useState<Me>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [myPage, setMyPage] = useState("");

  const navigate = useNavigate();

  const loadRoom = async () => {
    const { data } = await (supabase as any)
      .from("rooms")
      .select("id, name, invite_code, status, pace_pages_per_week, created_by, is_public, genre, description, book:books(id, title, author, cover_url, page_count)")
      .eq("id", roomId).maybeSingle();
    setRoom(data as Room | null);
  };
  const loadMe = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("room_members").select("id, current_page, role").eq("room_id", roomId).eq("user_id", user.id).maybeSingle();
    setMe(data as Me);
  };
  const loadCount = async () => {
    const { count } = await (supabase as any).from("room_members").select("*", { count: "exact", head: true }).eq("room_id", roomId);
    setMemberCount(count ?? 0);
  };

  useEffect(() => {
    void loadRoom();
    void loadCount();
    if (user) void loadMe();
  }, [roomId, user?.id]);
  useEffect(() => {
    const ch = supabase.channel(`room-meta-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, () => { loadMe(); loadCount(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, loadRoom)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId, user?.id]);

  if (!room) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="text-foreground/60">{loading ? "Loading room…" : "Room not found"}</p>
          <Link to="/rooms" className="mt-4 inline-block text-sm underline">← All rooms</Link>
        </div>
      </main>
    );
  }


  const isMember = !!me;
  const isMod = me?.role === "owner" || me?.role === "moderator";
  const isOwner = me?.role === "owner";

  const join = async () => {
    if (!user) return openAuth();
    const { error } = await (supabase as any).from("room_members").insert({ room_id: roomId, user_id: user.id });
    if (error && !String(error.message).includes("duplicate")) return toast.error(error.message);
    toast.success("Joined");
  };
  const leave = async () => {
    if (!me) return;
    if (!window.confirm("Leave this room?")) return;
    await (supabase as any).from("room_members").delete().eq("id", me.id);
    navigate({ to: "/rooms" });
  };

  const updateMyPage = async () => {
    if (!me) return;
    const n = parseInt(myPage, 10);
    if (Number.isNaN(n) || n < 0) return toast.error("Enter a page number");
    const { error } = await (supabase as any).from("room_members").update({ current_page: n }).eq("id", me.id);
    if (error) return toast.error(error.message);
    setMyPage("");
    toast.success("Updated");
  };
  const copyInvite = () => {
    if (!room.invite_code) return;
    navigator.clipboard.writeText(room.invite_code);
    toast.success("Invite code copied");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8 lg:py-10 grid lg:grid-cols-[300px,1fr] gap-6 lg:gap-10 animate-fade-in-soft">
        <aside className="space-y-5 lg:sticky lg:top-24 self-start">
          <Link to="/rooms" className="inline-flex items-center gap-1 text-xs text-foreground/60 hover:text-foreground">← All rooms</Link>

          <div className="card-surface p-5 text-center bg-gradient-warm">
            {room.book?.cover_url
              ? <img src={room.book.cover_url} alt="" className="w-36 mx-auto rounded shadow-book animate-tilt-in" />
              : <div className="w-36 h-52 mx-auto bg-muted rounded" />}
            <h1 className="font-serif text-2xl leading-tight mt-4">{room.name}</h1>
            <p className="text-xs text-foreground/65 mt-1">{room.book?.title}{room.book?.author && ` · ${room.book.author}`}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[10px] uppercase tracking-widest">
              {room.genre && <span className="px-2 py-0.5 rounded-full bg-card border border-border">{room.genre}</span>}
              <span className={`px-2 py-0.5 rounded-full ${room.is_public ? "bg-forest/15 text-forest-deep" : "bg-card border border-border"}`}>
                {room.is_public ? "public" : "private"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-card border border-border">
                {memberCount} member{memberCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {room.description && (
            <div className="card-surface p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55 mb-1.5">About this room</p>
              <p className="text-sm text-foreground/80 leading-relaxed italic">&ldquo;{room.description}&rdquo;</p>
            </div>
          )}

          <div className="card-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55 mb-2">Room rules</p>
            <ul className="text-xs text-foreground/75 space-y-1.5 leading-relaxed">
              <li>· No spoilers past page <strong className="text-foreground">{me?.current_page ?? room.pace_pages_per_week ?? "current"}</strong></li>
              <li>· Be generous — every reader moves at their pace</li>
              <li>· Quotes &amp; highlights welcome anytime</li>
            </ul>
          </div>

          {room.invite_code && (
            <button
              onClick={copyInvite}
              className="block w-full rounded-full border border-border px-3 py-2 hover:border-foreground/40 transition text-xs"
            >
              Invite code: <code className="font-mono text-foreground">{room.invite_code}</code>
            </button>
          )}
          {room.pace_pages_per_week && (
            <p className="text-[11px] text-center text-foreground/55">Pace: {room.pace_pages_per_week} pages/week</p>
          )}

          {isMember ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder={`On page ${me?.current_page ?? 0}`}
                  value={myPage}
                  onChange={(e) => setMyPage(e.target.value)}
                  className="text-sm"
                />
                <Button onClick={updateMyPage} size="sm">
                  Update
                </Button>
              </div>
              <button onClick={leave} className="text-[11px] text-foreground/55 hover:text-burgundy w-full text-center transition">
                Leave room
              </button>
            </div>
          ) : (
            <Button onClick={join} className="w-full">
              Join this room
            </Button>
          )}
        </aside>

        <section>
          {!user ? (
            <div className="card-surface p-10 text-center bg-gradient-warm">
              <p className="font-serif text-2xl">Sign in to enter the room.</p>
              <p className="mt-2 text-sm text-foreground/65">Chat, highlights, leaderboards and events are for members.</p>
              <Button onClick={openAuth} className="mt-5">Sign in</Button>
            </div>
          ) : (
            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="bg-transparent p-0 h-auto gap-1 flex-wrap justify-start border-b border-border/60 w-full rounded-none">
                {[
                  { v: "chat", l: "Chat" },
                  { v: "highlights", l: "Highlights" },
                  { v: "events", l: "Events" },
                  { v: "members", l: "Members" },
                  { v: "leaderboard", l: "Top" },
                  { v: "challenges", l: "Challenges" },
                ].map(t => (
                  <TabsTrigger
                    key={t.v}
                    value={t.v}
                    className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-soft border border-transparent data-[state=inactive]:hover:border-border px-4 py-1.5 text-xs font-medium transition-colors"
                  >
                    {t.l}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="chat" className="mt-5">
                {isMember ? <RoomChat roomId={roomId} userId={user.id} isMod={isMod} /> : <JoinPrompt onJoin={join} />}
              </TabsContent>
              <TabsContent value="highlights" className="mt-5">
                {isMember ? <RoomHighlights roomId={roomId} userId={user.id} bookId={room.book?.id ?? null} /> : <JoinPrompt onJoin={join} />}
              </TabsContent>
              <TabsContent value="events" className="mt-5">
                <RoomEvents roomId={roomId} userId={user.id} isMember={isMember} />
              </TabsContent>
              <TabsContent value="members" className="mt-5">
                <RoomMembers roomId={roomId} userId={user.id} isMod={isMod} isOwner={isOwner} />
              </TabsContent>
              <TabsContent value="leaderboard" className="mt-5">
                <RoomLeaderboard roomId={roomId} />
              </TabsContent>
              <TabsContent value="challenges" className="mt-5">
                <RoomChallenges roomId={roomId} userId={user.id} isMod={isMod} />
              </TabsContent>
            </Tabs>
          )}
        </section>

      </div>
      <Footer />
    </main>
  );
}

function JoinPrompt({ onJoin }: { onJoin: () => void }) {
  return (
    <div className="card-surface p-10 text-center bg-gradient-warm animate-fade-in">
      <p className="font-serif text-xl">Join to take part in the conversation.</p>
      <p className="mt-1.5 text-sm text-foreground/65">Members can chat, share highlights, RSVP to events, and track each other's progress.</p>
      <Button onClick={onJoin} className="mt-5">Join room</Button>
    </div>
  );
}
