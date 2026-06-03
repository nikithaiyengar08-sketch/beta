import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/folio/Footer";
import { LockedPreview } from "@/components/folio/LockedPreview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useGate } from "@/components/auth/AuthGate";
import { usePremium } from "@/lib/premium";
import { dnaForSeed, similarReaders } from "@/lib/dna";
import { useFollows } from "@/lib/engagement";
import { useReaders } from "@/lib/use-real-data";
import { useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Users, UserPlus, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/readers")({
  head: () => ({
    meta: [
      { title: "Readers like you · Folio" },
      { name: "description", content: "Find readers whose taste lines up with yours. Follow them. Steal from their shelves." },
      { property: "og:title", content: "Readers like you · Folio" },
    ],
  }),
  component: ReadersPage,
});

function ReadersPage() {
  const { user } = useAuth();
  const { openAuth } = useGate();
  const { isPremium } = usePremium();
  const { data: readers = [], isLoading } = useReaders({ excludeId: user?.id });
  const mine = useMemo(() => dnaForSeed(user?.id || "guest"), [user?.id]);
  const ranked = useMemo(
    () => similarReaders(mine, readers, (r) => r.id),
    [mine, readers],
  );
  const follows = useFollows(user?.id || "guest");

  // Also load real profiles from Supabase for richer social data
  const { data: realProfiles } = useQuery({
    queryKey: ["readers-real", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, archetype")
        .not("username", "is", null)
        .neq("id", user?.id ?? "")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const top = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-5xl px-5 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <span className="chip">Community</span>
          <h1 className="font-serif text-4xl sm:text-5xl mt-4">Readers like you.</h1>
          <p className="mt-3 text-foreground/70 max-w-2xl">
            People whose shelves rhyme with yours. Ranked by Reader DNA — genres, moods, and pace — not by follower counts.
          </p>
          {!user && (
            <button
              onClick={openAuth}
              className="mt-5 inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-full bg-foreground text-background hover:bg-forest-deep transition"
            >
              <UserPlus className="h-3.5 w-3.5" /> Sign in to find your matches
            </button>
          )}
        </div>

        {/* Real Supabase profiles — show first if available */}
        {realProfiles && realProfiles.length > 0 && (
          <div className="mb-14">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-2xl">Readers on Folio</h2>
              <Link to="/discover" search={{} as any} className="text-sm text-foreground/55 hover:text-foreground flex items-center gap-1 transition">
                Discover more <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {realProfiles.map((r: any) => (
                <RealReaderCard key={r.id} reader={r} currentUserId={user?.id} onAuth={openAuth} />
              ))}
            </div>
          </div>
        )}

        {/* DNA-ranked readers */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}
          </div>
        ) : readers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Users className="h-8 w-8 text-foreground/25 mx-auto mb-3" />
            <p className="font-serif text-xl">Be one of the first readers.</p>
            <p className="mt-2 text-sm text-foreground/60">
              Folio is just getting started. Add books, write reviews, and watch your matches appear.
            </p>
            <Button asChild className="mt-5"><Link to="/discover">Explore books</Link></Button>
          </div>
        ) : (
          <>
            {top.length > 0 && (
              <div className="mb-10">
                <h2 className="font-serif text-2xl mb-5">Your top matches</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {top.map(({ reader, score, sharedGenres, dna }) => (
                    <DNAReaderCard
                      key={reader.id}
                      reader={reader}
                      score={score}
                      sharedGenres={sharedGenres}
                      dna={dna}
                      follows={follows}
                    />
                  ))}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div>
                <h2 className="font-serif text-2xl mb-4">Suggested follows</h2>
                <LockedPreview
                  isPremium={isPremium}
                  title="Unlock the full taste graph"
                  blurb="See everyone Folio thinks you'd click with, plus a weekly digest of new strong matches. Premium readers get compatibility scores for everyone they follow."
                >
                  <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
                    {rest.map(({ reader, score, sharedGenres }) => (
                      <div key={reader.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition">
                        <img src={reader.avatar} alt={reader.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{reader.name}
                            <span className="text-foreground/50 font-normal"> · {reader.handle}</span>
                          </p>
                          <p className="text-[11px] text-foreground/60 truncate">{sharedGenres.slice(0, 3).join(" · ") || "Adjacent taste"}</p>
                        </div>
                        <span className="text-xs text-rose font-medium shrink-0">{score}%</span>
                        <Button
                          size="sm"
                          variant={follows.isFollowing(reader.id) ? "outline" : "default"}
                          onClick={() => follows.toggle(reader.id)}
                          className="shrink-0"
                        >
                          {follows.isFollowing(reader.id) ? "Following" : "Follow"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </LockedPreview>
              </div>
            )}
          </>
        )}
      </section>
      <Footer />
    </main>
  );
}

function RealReaderCard({ reader, currentUserId, onAuth }: { reader: any; currentUserId?: string; onAuth: () => void }) {
  const isOwn = currentUserId === reader.id;
  const { data: isFollowing, refetch } = useQuery({
    queryKey: ["following", currentUserId, reader.id],
    queryFn: async () => {
      if (!currentUserId || isOwn) return false;
      const { data } = await supabase.from("follows")
        .select("id").eq("follower_id", currentUserId).eq("following_id", reader.id).maybeSingle();
      return !!data;
    },
    enabled: !!currentUserId && !isOwn,
  });

  const toggleFollow = async () => {
    if (!currentUserId) { onAuth(); return; }
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", reader.id);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: reader.id });
      toast.success(`Following ${reader.display_name ?? reader.username}`);
    }
    refetch();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 transition">
      <div className="flex items-center gap-3 mb-3">
        {reader.avatar_url ? (
          <img src={reader.avatar_url} alt={reader.display_name} className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-rose/30 to-lavender/30 grid place-items-center text-base font-serif text-burgundy">
            {(reader.display_name ?? reader.username ?? "?")[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link to="/u/$username" params={{ username: reader.username }}
            className="text-sm font-medium hover:text-burgundy transition truncate block">
            {reader.display_name ?? reader.username}
          </Link>
          <p className="text-[11px] text-foreground/50 truncate">@{reader.username}</p>
        </div>
      </div>
      {reader.archetype && (
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="h-3 w-3 text-rose/60" />
          <span className="text-[11px] text-foreground/60 italic">{reader.archetype}</span>
        </div>
      )}
      {reader.bio && <p className="text-xs text-foreground/65 line-clamp-2 leading-relaxed mb-3">{reader.bio}</p>}
      <div className="flex gap-2">
        {!isOwn && (
          <Button
            size="sm"
            variant={isFollowing ? "outline" : "default"}
            onClick={toggleFollow}
            className="flex-1"
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
        )}
        <Link
          to="/u/$username"
          params={{ username: reader.username }}
          className="flex-1 text-center text-xs px-3 py-2 rounded-full border border-border hover:border-foreground/40 transition inline-flex items-center justify-center gap-1"
        >
          View profile <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function DNAReaderCard({ reader, score, sharedGenres, dna, follows }: any) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 transition">
      <div className="flex items-center gap-3 mb-3">
        <img src={reader.avatar} alt={reader.name} className="h-12 w-12 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{reader.name}</p>
          <p className="text-[11px] text-foreground/60 truncate">{reader.handle}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-rose/15 text-rose font-medium shrink-0">{score}%</span>
      </div>
      {reader.bio && <p className="text-sm text-foreground/70 line-clamp-2 mb-3">{reader.bio}</p>}
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-widest text-foreground/50 mb-1">Shared taste</p>
        <p className="text-xs text-foreground/70">{sharedGenres.slice(0, 3).join(" · ") || "Adjacent taste"}</p>
        <p className="mt-1 text-[11px] text-foreground/55">{dna.archetype.emoji} {dna.archetype.name}</p>
      </div>
      <div className="flex gap-2">
        <Button
          variant={follows.isFollowing(reader.id) ? "outline" : "default"}
          size="sm"
          onClick={() => {
            follows.toggle(reader.id);
            toast.success(follows.isFollowing(reader.id) ? "Unfollowed" : `Following ${reader.name}`);
          }}
          className="flex-1"
        >
          {follows.isFollowing(reader.id) ? "Following" : "Follow"}
        </Button>
        <Link
          to="/insights" search={{ tab: "compatibility" }}
          className="rounded-full border border-border px-4 py-2 text-xs min-h-9 inline-flex items-center hover:border-foreground/40 transition"
        >
          Compare
        </Link>
      </div>
    </article>
  );
}
