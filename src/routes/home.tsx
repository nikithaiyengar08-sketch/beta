import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect } from "react";
import { Footer } from "@/components/folio/Footer";
import { Shelf } from "@/components/folio/Shelf";
import { Quotes } from "@/components/folio/Quotes";
import { Lists } from "@/components/folio/Lists";
import { CurrentlyReading } from "@/components/folio/CurrentlyReading";
import { ReadingGoals } from "@/components/folio/ReadingGoals";
import { LockedPreview } from "@/components/folio/LockedPreview";
import { useAuth } from "@/lib/auth-context";
import { useGate } from "@/components/auth/AuthGate";
import { usePremium } from "@/lib/premium";
import { BookOpen, Users, Target, Sparkles, BarChart3, TrendingUp, Crown, ArrowRight, Heart, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  tab: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/home")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Your Folio" },
      { name: "description", content: "Your reading life in one place." },
    ],
  }),
  component: HomePage,
});

function RecentActivity({ userId }: { userId: string }) {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["home-activity", userId],
    queryFn: async () => {
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);
      const ids = (follows ?? []).map((r: any) => r.following_id);
      if (ids.length === 0) return [];
      const { data } = await (supabase as any)
        .from("feed_activity")
        .select("*")
        .in("actor_id", ids)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const VERBS: Record<string, string> = {
    started_reading: "started reading",
    finished_book: "finished",
    wrote_review: "reviewed",
    saved_quote: "saved a quote from",
    joined_room: "joined a reading room",
    followed_user: "followed",
  };

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
    </div>
  );

  if (!rows || rows.length === 0) return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center">
      <Users className="h-6 w-6 text-foreground/25 mx-auto mb-2" />
      <p className="text-sm text-foreground/55">No friend activity yet.</p>
      <Link to="/readers" className="mt-2 inline-block text-sm text-rose underline-offset-2 hover:underline">Find readers to follow →</Link>
    </div>
  );

  return (
    <ul className="space-y-2">
      {rows.map((r: any) => (
        <li key={r.id ?? Math.random()} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          {r.avatar_url ? (
            <img src={r.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-rose grid place-items-center text-cream text-xs shrink-0">
              {(r.display_name ?? r.username ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <p className="text-sm min-w-0 flex-1 truncate">
            <span className="font-medium">{r.display_name ?? r.username ?? "A reader"}</span>
            {" "}<span className="text-foreground/55">{VERBS[r.type ?? ""] ?? r.type}</span>
            {r.book_title && <span className="font-serif italic"> {r.book_title}</span>}
          </p>
          <span className="text-[11px] text-foreground/40 shrink-0">
            {r.created_at ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ActiveRooms({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["home-rooms", userId],
    queryFn: async () => {
      const { data: memberships } = await (supabase as any)
        .from("room_members").select("room_id").eq("user_id", userId);
      const ids = (memberships ?? []).map((m: any) => m.room_id);
      if (ids.length === 0) return [];
      const { data: rooms } = await (supabase as any)
        .from("rooms")
        .select("id, name, book:books(title, cover_url)")
        .in("id", ids)
        .neq("status", "finished")
        .order("created_at", { ascending: false })
        .limit(3);
      return rooms ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="h-20 rounded-xl bg-muted animate-pulse" />;
  if (!data || data.length === 0) return (
    <div className="rounded-2xl border border-dashed border-border p-5 text-center">
      <BookOpen className="h-5 w-5 text-foreground/25 mx-auto mb-2" />
      <p className="text-sm text-foreground/55">No active rooms.</p>
      <Link to="/rooms" className="mt-1 inline-block text-sm text-rose underline-offset-2 hover:underline">Join a reading room →</Link>
    </div>
  );

  return (
    <div className="space-y-2">
      {data.map((r: any) => (
        <Link key={r.id} to="/rooms/$roomId" params={{ roomId: r.id }}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-foreground/30 transition">
          {r.book?.cover_url ? (
            <img src={r.book.cover_url} alt="" className="h-10 w-7 object-cover rounded shadow shrink-0" />
          ) : (
            <div className="h-10 w-7 rounded bg-muted shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{r.name}</p>
            {r.book?.title && <p className="text-[11px] text-foreground/50 truncate">{r.book.title}</p>}
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
        </Link>
      ))}
      <Link to="/rooms" className="block text-center text-xs text-foreground/50 hover:text-foreground pt-1 transition">
        Browse all rooms →
      </Link>
    </div>
  );
}

function SuggestedReaders({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["home-suggested-readers", userId],
    queryFn: async () => {
      // Get who user already follows
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
      const followingIds = (follows ?? []).map((f: any) => f.following_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, archetype")
        .not("username", "is", null)
        .neq("id", userId)
        .limit(12);

      // Filter out already-following
      return (profiles ?? []).filter((p: any) => !followingIds.includes(p.id)).slice(0, 3);
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="h-20 rounded-xl bg-muted animate-pulse" />;
  if (!data || data.length === 0) return (
    <div className="rounded-2xl border border-dashed border-border p-5 text-center">
      <Users className="h-5 w-5 text-foreground/25 mx-auto mb-2" />
      <p className="text-sm text-foreground/55">You've followed everyone!</p>
      <Link to="/discover" className="mt-1 inline-block text-sm text-rose underline-offset-2 hover:underline">Discover more →</Link>
    </div>
  );

  return (
    <div className="space-y-2">
      {data.map((r: any) => (
        <Link key={r.id} to="/u/$username" params={{ username: r.username }}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-foreground/30 transition">
          {r.avatar_url ? (
            <img src={r.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose/30 to-lavender/30 grid place-items-center text-xs font-serif text-burgundy shrink-0">
              {(r.display_name ?? r.username ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{r.display_name ?? r.username}</p>
            {r.archetype && <p className="text-[11px] text-foreground/50 truncate italic">{r.archetype}</p>}
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
        </Link>
      ))}
      <Link to="/readers" className="block text-center text-xs text-foreground/50 hover:text-foreground pt-1 transition">
        Find more readers →
      </Link>
    </div>
  );
}

function RecommendedBooks({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["home-recs", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("books")
        .select("id, title, author, cover_url")
        .order("ratings_average", { ascending: false, nullsFirst: false })
        .limit(6);
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="flex gap-3">
      {[1,2,3,4].map(i => <div key={i} className="w-24 aspect-[2/3] rounded-lg bg-muted animate-pulse shrink-0" />)}
    </div>
  );
  if (!data || data.length === 0) return (
    <div className="rounded-2xl border border-dashed border-border p-5 text-center">
      <Sparkles className="h-5 w-5 text-foreground/25 mx-auto mb-2" />
      <p className="text-sm text-foreground/55">Add books to get recommendations.</p>
    </div>
  );

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
      {data.map((b: any) => (
        <Link key={b.id} to="/book/$bookId" params={{ bookId: b.id }}
          className="shrink-0 w-24 group">
          <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-sm">
            {b.cover_url ? (
              <img src={b.cover_url} alt={b.title} className="h-full w-full object-cover group-hover:scale-105 transition" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-[10px] text-foreground/40 p-2 text-center font-serif leading-tight">{b.title}</div>
            )}
          </div>
          <p className="mt-1.5 text-xs leading-tight line-clamp-2 font-serif">{b.title}</p>
          <p className="text-[10px] text-foreground/50 truncate">{b.author}</p>
        </Link>
      ))}
    </div>
  );
}

/* Premium previews */
function AnalyticsPreview({ isPremium }: { isPremium: boolean }) {
  return (
    <LockedPreview
      isPremium={isPremium}
      title="Reading analytics"
      blurb="Pages per week, genre evolution, mood arcs, and reread patterns — beautifully charted."
      compact
    >
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-gold" />
          <span className="text-xs uppercase tracking-widest text-foreground/50 font-medium">Analytics</span>
        </div>
        <div className="flex items-end gap-1 h-12">
          {[40,65,30,80,55,90,45,70,85,60].map((h, i) => (
            <div key={i} style={{ height: `${h}%` }} className="flex-1 rounded-sm bg-gold/40" />
          ))}
        </div>
        <p className="text-xs text-foreground/50 mt-2">Books read per month</p>
      </div>
    </LockedPreview>
  );
}

function InsightsPreview({ isPremium }: { isPremium: boolean }) {
  return (
    <LockedPreview
      isPremium={isPremium}
      title="Reading insights"
      blurb="Your average pace, longest reading streak, and what genres you've been gravitating to lately."
      compact
    >
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-forest" />
          <span className="text-xs uppercase tracking-widest text-foreground/50 font-medium">Insights</span>
        </div>
        {[
          { label: "Avg pace", val: "32 pages/day" },
          { label: "Current streak", val: "14 days 🔥" },
          { label: "Top genre this month", val: "Literary Fiction" },
        ].map(item => (
          <div key={item.label} className="flex justify-between text-xs">
            <span className="text-foreground/60">{item.label}</span>
            <span className="font-medium">{item.val}</span>
          </div>
        ))}
      </div>
    </LockedPreview>
  );
}

function ReaderDNAPreview({ isPremium }: { isPremium: boolean }) {
  return (
    <LockedPreview
      isPremium={isPremium}
      title="Your Reader DNA"
      blurb="A living portrait of your taste — genres, moods, pacing, and your reading archetype."
      compact
    >
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-rose" />
          <span className="text-xs uppercase tracking-widest text-foreground/50 font-medium">Reader DNA</span>
        </div>
        <div className="space-y-2">
          {[
            { genre: "Literary Fiction", pct: 68 },
            { genre: "Historical", pct: 52 },
            { genre: "Essays", pct: 38 },
          ].map(({ genre, pct }) => (
            <div key={genre} className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-rose/60" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[11px] text-foreground/60 w-28 truncate">{genre}</span>
            </div>
          ))}
        </div>
        <Link to="/insights" search={{ tab: "dna" }} className="mt-3 block text-[11px] text-rose hover:underline underline-offset-2">
          Unlock full Reader DNA →
        </Link>
      </div>
    </LockedPreview>
  );
}

function PremiumBanner() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-rose/10 via-lavender/8 to-gold/10 border border-rose/20 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Crown className="h-4 w-4 text-rose" />
        <span className="text-xs uppercase tracking-widest text-rose font-medium">Folio Premium</span>
      </div>
      <p className="font-serif text-lg leading-snug">Unlock your full reading life.</p>
      <p className="text-sm text-foreground/60 mt-1 leading-relaxed">Reader DNA, compatibility scores, advanced analytics, and weekly reader matches.</p>
      <Link to="/premium" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-rose hover:underline underline-offset-2">
        See what's included <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function SidebarSection({ icon, label, to, toLinkLabel, children }: {
  icon: React.ReactNode;
  label: string;
  to?: string;
  toLinkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm uppercase tracking-widest text-foreground/50 font-medium">{label}</h2>
        </div>
        {to && toLinkLabel && (
          <Link to={to} className="text-xs text-foreground/50 hover:text-foreground transition">{toLinkLabel}</Link>
        )}
      </div>
      {children}
    </section>
  );
}

function HomePage() {
  const { user, loading } = useAuth();
  const { openAuth } = useGate();
  const { isPremium } = usePremium();

  useEffect(() => {
    if (!loading && !user) openAuth();
  }, [loading, user, openAuth]);

  if (!user && !loading) {
    return (
      <main className="min-h-screen bg-background text-foreground antialiased">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h1 className="font-serif text-5xl">Your reading life starts here</h1>
          <p className="mt-3 text-foreground/60 text-lg">Sign in to see your library, goals, and community.</p>
          <button onClick={openAuth} className="mt-8 inline-flex rounded-full bg-foreground px-8 py-3 text-sm text-background font-medium">
            Sign in to Folio
          </button>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground antialiased">
      {/* Page header */}
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-2">
        <h1 className="font-serif text-3xl md:text-4xl">Good {getTimeOfDay()}</h1>
        <p className="text-foreground/55 text-sm mt-1">Here's your reading life today.</p>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8">

          {/* Main column */}
          <div className="space-y-10">

            {/* 1. Continue Reading */}
            <section>
              <CurrentlyReading />
            </section>

            {/* 2. Reading Goal */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-foreground/50" />
                <h2 className="text-sm uppercase tracking-widest text-foreground/50 font-medium">Reading Goal</h2>
              </div>
              {user && <ReadingGoals />}
            </section>

            {/* 3. Library shelf */}
            <section>
              <Shelf />
            </section>

            {/* 4. Reader DNA Preview — Premium, right in the main flow */}
            {user && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-foreground/50" />
                    <h2 className="text-sm uppercase tracking-widest text-foreground/50 font-medium">Reader DNA</h2>
                  </div>
                  {isPremium && (
                    <Link to="/insights" search={{ tab: "dna" }} className="text-xs text-foreground/50 hover:text-foreground transition">Full DNA →</Link>
                  )}
                </div>
                <ReaderDNAPreview isPremium={isPremium} />
              </section>
            )}

            {/* 5. Analytics Preview — Premium */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-foreground/50" />
                <h2 className="text-sm uppercase tracking-widest text-foreground/50 font-medium">Reading Analytics</h2>
              </div>
              <AnalyticsPreview isPremium={isPremium} />
            </section>

            {/* 6. Saved quotes */}
            <section>
              <Quotes />
            </section>

            {/* 7. Lists */}
            <section>
              <Lists />
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Friend activity */}
            {user && (
              <SidebarSection
                icon={<Users className="h-4 w-4 text-foreground/50" />}
                label="Friend activity"
                to="/feed"
                toLinkLabel="See all"
              >
                <RecentActivity userId={user.id} />
              </SidebarSection>
            )}

            {/* Active rooms */}
            {user && (
              <SidebarSection
                icon={<BookOpen className="h-4 w-4 text-foreground/50" />}
                label="Reading rooms"
                to="/rooms"
                toLinkLabel="All rooms"
              >
                <ActiveRooms userId={user.id} />
              </SidebarSection>
            )}

            {/* Suggested readers */}
            {user && (
              <SidebarSection
                icon={<Users className="h-4 w-4 text-foreground/50" />}
                label="Suggested readers"
                to="/readers"
                toLinkLabel="See all"
              >
                <SuggestedReaders userId={user.id} />
              </SidebarSection>
            )}

            {/* Reading Insights Preview — Premium */}
            {user && (
              <SidebarSection
                icon={<TrendingUp className="h-4 w-4 text-foreground/50" />}
                label="Reading Insights"
                to="/insights" search={{ tab: "analytics" }}
                toLinkLabel="Full analytics"
              >
                <InsightsPreview isPremium={isPremium} />
              </SidebarSection>
            )}

            {/* Recommended books */}
            {user && (
              <SidebarSection
                icon={<Sparkles className="h-4 w-4 text-foreground/50" />}
                label="Recommended"
                to="/insights" search={{ tab: "recommendations" }}
                toLinkLabel="More"
              >
                <RecommendedBooks userId={user.id} />
              </SidebarSection>
            )}

            {/* Premium banner — only if not premium */}
            {!isPremium && <PremiumBanner />}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
