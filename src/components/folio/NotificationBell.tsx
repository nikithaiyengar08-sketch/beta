import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNowStrict } from "date-fns";

type Notif = {
  id: string;
  type: string;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  meta: any;
  read_at: string | null;
  created_at: string;
  actor?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
};

const TYPE_COPY: Record<string, string> = {
  follow: "started following you",
  like_review: "liked your review",
  like_quote: "liked your quote",
  like_activity: "liked your activity",
  comment_review: "commented on your review",
  comment_quote: "commented on your quote",
  comment_activity: "commented on your activity",
  comment_reply: "replied to your comment",
  mention: "mentioned you",
  room_invite: "invited you to a reading room",
  room_event: "scheduled a room event",
  room_message: "wrote in a reading room",
};

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const unread = items.filter(n => !n.read_at).length;

  const load = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("notifications")
      .select("id, type, actor_id, target_type, target_id, meta, read_at, created_at, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data ?? []) as Notif[]);
  };


  useEffect(() => {
    if (!user) { setItems([]); return; }
    load();
    const ch = supabase.channel(`notifs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await (supabase as any).from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id).is("read_at", null);
  };

  if (!user) return null;

  return (
    <Popover onOpenChange={(o) => { if (o) markAllRead(); }}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-muted transition"
        >
          <Bell className="h-4 w-4 text-foreground/70" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose text-[10px] grid place-items-center font-medium text-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="font-serif text-base">Notifications</p>
          {unread > 0 && <span className="text-[10px] text-foreground/60">{unread} new</span>}
        </div>
        <div className="max-h-96 overflow-auto divide-y divide-border">
          {items.length === 0 ? (
            <p className="p-6 text-center text-xs text-foreground/60">No notifications yet.</p>
          ) : items.map(n => {
            const who = n.actor?.display_name || n.actor?.username || "Someone";
            const handle = n.actor?.username;
            return (
              <div key={n.id} className={`px-4 py-3 ${!n.read_at ? "bg-muted/40" : ""}`}>
                <div className="flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-full bg-rose/30 grid place-items-center text-[11px] shrink-0 overflow-hidden">
                    {n.actor?.avatar_url
                      ? <img src={n.actor.avatar_url} alt="" className="h-full w-full object-cover" />
                      : who[0]?.toUpperCase() ?? "•"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">
                      {handle
                        ? <Link to="/u/$username" params={{ username: handle }} className="font-medium hover:underline">{who}</Link>
                        : <span className="font-medium">{who}</span>}
                      <span className="text-foreground/70"> {TYPE_COPY[n.type] ?? "interacted"}</span>
                    </p>
                    <p className="text-[10px] text-foreground/50 mt-0.5">
                      {formatDistanceToNowStrict(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
