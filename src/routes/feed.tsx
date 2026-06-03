import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGate } from "@/components/auth/AuthGate";
import { Footer } from "@/components/folio/Footer";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

type FeedRow = {
  id: string | null;
  type: string | null;
  created_at: string | null;
  actor_id: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  book_id: string | null;
  book_title: string | null;
  book_author: string | null;
  book_cover: string | null;
  room_id: string | null;
  target_user_id: string | null;
  meta: any;
};

const VERBS: Record<string, string> = {
  started_reading: "started reading",
  finished_book: "finished",
  wrote_review: "reviewed",
  saved_quote: "saved a quote from",
  joined_room: "joined a reading room",
  posted_highlight: "highlighted a passage in",
  followed_user: "followed",
};

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Activity · Folio" },
      { name: "description", content: "Reading updates from people you follow on Folio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const { user, loading } = useAuth();
  const { openAuth } = useGate();
  const [tab, setTab] = useState<"following" | "everyone">("everyone");
  const [rows, setRows] = useState<FeedRow[] | null>(null);

  useEffect(() => {
    if (!loading && !user) openAuth();
  }, [loading, user, openAuth]);

  useEffect(() => {
    (async () => {
      setRows(null);
      let q = (supabase as any).from("feed_activity").select("*").order("created_at", { ascending: false }).limit(60);
      if (tab === "following" && user) {
        const { data: f } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
        const ids = (f ?? []).map((r: any) => r.following_id);
        if (ids.length === 0) {
          setRows([]);
          return;
        }
        q = q.in("actor_id", ids);
      }
      const { data } = await q;
      setRows((data as FeedRow[]) ?? []);
    })();
  }, [tab, user?.id]);

  return (
    <main className="min-h-screen bg-background">
      
      <div className="mx-auto max-w-2xl px-5 sm:px-6 py-8 sm:py-12">
        <header className="mb-6">
          <h1 className="font-serif text-4xl">Activity</h1>
          <p className="mt-1 text-sm text-foreground/60">What readers are doing right now.</p>
        </header>
        <div className="flex gap-2 mb-6">
          {(["following", "everyone"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm px-4 py-2 rounded-full border transition min-h-11 ${tab === t ? "bg-foreground text-background border-foreground" : "border-border text-foreground/70 hover:border-foreground/40"}`}
              aria-pressed={tab === t}
            >
              {t === "following" ? "Following" : "Everyone"}
            </button>
          ))}
        </div>

        {rows === null ? (
          <ul className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="p-4 rounded-2xl border border-border bg-card animate-pulse h-20" />
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="font-serif text-2xl">{tab === "following" ? "Your feed is waiting for friends" : "No activity yet"}</p>
            <p className="mt-2 text-sm text-foreground/60 max-w-sm mx-auto">
              {tab === "following"
                ? "Follow a few readers and their updates will show up here — like a quiet, bookish corner of the internet."
                : "Be the first to start something. Add a book, write a review, or join a reading room."}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button asChild><Link to="/discover">Find readers</Link></Button>
              {tab === "following" && (
                <button onClick={() => setTab("everyone")} className="rounded-full border border-border px-5 py-2 text-sm">See everyone</button>
              )}
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map(r => (
              <li key={r.id ?? Math.random()} className="p-4 rounded-2xl border border-border bg-card flex gap-3">
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-rose grid place-items-center text-cream text-sm flex-shrink-0">
                    {(r.display_name ?? r.username ?? "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    {r.username ? (
                      <Link to="/u/$username" params={{ username: r.username }} className="font-medium hover:underline">
                        {r.display_name ?? r.username}
                      </Link>
                    ) : (
                      <span className="font-medium">{r.display_name ?? "A reader"}</span>
                    )}{" "}
                    <span className="text-foreground/60">{VERBS[r.type ?? ""] ?? r.type ?? "did something"}</span>{" "}
                    {r.book_id && r.book_title && (
                      <Link to="/book/$bookId" params={{ bookId: r.book_id }} className="font-serif italic hover:underline">{r.book_title}</Link>
                    )}
                  </p>
                  <p className="text-[11px] text-foreground/40 mt-0.5">
                    {r.created_at ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) : ""}
                    {r.book_author ? ` · ${r.book_author}` : ""}
                  </p>
                </div>
                {r.book_cover && r.book_id && (
                  <Link to="/book/$bookId" params={{ bookId: r.book_id }} className="flex-shrink-0">
                    <img src={r.book_cover} alt="" className="h-14 w-10 object-cover rounded shadow" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </main>
  );
}
