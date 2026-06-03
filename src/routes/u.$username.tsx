import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Footer } from "@/components/folio/Footer";
import { FollowersSheet, FollowingSheet } from "@/components/folio/FollowSheet";
import { LockedPreview } from "@/components/folio/LockedPreview";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGate } from "@/components/auth/AuthGate";
import { usePremium } from "@/lib/premium";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchOpenLibrary, ensureBook, type OLBook } from "@/lib/openlibrary";
import { Sparkles, BookOpen, Quote as QuoteIcon, ListChecks, Users, Settings as SettingsIcon, Plus, Crown, BarChart3, Heart } from "lucide-react";

// Inline DNA icon since lucide doesn't export one
function DnaIcon({ className }: { className?: string }) {
  return <Sparkles className={className} />;
}
const Dna = DnaIcon;

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} on Folio` },
      { name: "description", content: `Reading life of @${params.username} on Folio — shelves, reviews, quotes, lists and Reader DNA.` },
      { property: "og:title", content: `@${params.username} on Folio` },
      { property: "og:type", content: "profile" },
    ],
  }),
  component: ProfilePage,
  notFoundComponent: () => (
    <main className="min-h-screen bg-background text-foreground">
      
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="font-serif text-5xl">Not found</h1>
        <p className="mt-2 text-sm text-foreground/60">No reader here yet.</p>
        <Link to="/discover" className="mt-6 inline-flex rounded-full bg-foreground px-5 py-2 text-sm text-background">Discover books</Link>
      </div>
    </main>
  ),
});

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  archetype: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
};

type UB = {
  id: string;
  status: string | null;
  rating: number | null;
  book: { id: string; title: string; author: string | null; cover_url: string | null } | null;
};

export const READING_STATUSES = [
  { value: "want", label: "Want to read" },
  { value: "reading", label: "Currently reading" },
  { value: "read", label: "Read" },
  { value: "dnf", label: "Did Not Finish" },
] as const;

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const { openAuth } = useGate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: async (): Promise<Profile | null> => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, archetype, avatar_url, cover_image_url")
        .eq("username", username)
        .maybeSingle();
      return data as Profile | null;
    },
  });

  if (!isLoading && !profile) throw notFound();

  return (
    <main className="min-h-screen bg-background text-foreground">
      
      {isLoading || !profile ? (
        <div className="mx-auto max-w-5xl px-6 py-12 space-y-6 animate-fade-in-soft">
          <Skeleton className="h-56 w-full rounded-3xl" />
          <div className="flex gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        </div>
      ) : (
        <ProfileBody profile={profile} isOwn={user?.id === profile.id} onAuth={openAuth} />
      )}
      <Footer />
    </main>
  );
}

// ── Add Books Sheet (owner only) ──────────────────────────────────────────────
function AddBooksDialog({ open, onOpenChange, onAdded }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: () => void;
}) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<OLBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { setResults(await searchOpenLibrary(q)); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const add = async (b: OLBook, status: "want" | "reading" | "read" | "dnf") => {
    if (!user) return;
    setAdding(b.ol_id + status);
    try {
      const book_id = await ensureBook(b);
      const today = new Date().toISOString().slice(0, 10);
      const patch: Record<string, string> = { user_id: user.id, book_id, status };
      if (status === "reading") patch.started_at = today;
      if (status === "read") { patch.started_at = today; patch.finished_at = today; }
      const { error } = await supabase.from("user_books").upsert(patch as never, { onConflict: "user_id,book_id", ignoreDuplicates: false });
      if (error) throw error;
      toast.success(`Added "${b.title}"`);
      onAdded();
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't add book");
    } finally { setAdding(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background">
        <DialogTitle className="font-serif text-2xl">Add a book to your shelf</DialogTitle>
        <Input
          autoFocus
          placeholder="Title, author, ISBN…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="text-base"
        />
        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {loading && <p className="text-xs text-foreground/50 text-center py-6">Searching…</p>}
          {!loading && q && results.length === 0 && (
            <p className="text-xs text-foreground/50 text-center py-6">No results</p>
          )}
          {results.map(b => (
            <div key={b.ol_id} className="flex gap-3 p-3 rounded-2xl border border-border hover:bg-muted/40 transition-colors">
              {b.cover_url
                ? <img src={b.cover_url} alt={b.title} className="h-20 w-14 object-cover rounded shadow" />
                : <div className="h-20 w-14 rounded bg-muted" />}
              <div className="flex-1 min-w-0">
                <p className="font-serif text-lg truncate">{b.title}</p>
                <p className="text-xs text-foreground/60 truncate">{b.author}{b.published_year ? ` · ${b.published_year}` : ""}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {READING_STATUSES.map(s => (
                    <button
                      key={s.value}
                      disabled={adding !== null}
                      onClick={() => add(b, s.value)}
                      className={`h-7 px-3 rounded-full text-xs border transition ${
                        s.value === "read"
                          ? "bg-foreground text-background border-foreground hover:bg-forest-deep disabled:opacity-50"
                          : "border-border hover:border-foreground/40 disabled:opacity-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Profile Body ──────────────────────────────────────────────────────────────
function ProfileBody({ profile, isOwn, onAuth }: { profile: Profile; isOwn: boolean; onAuth: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isPremium } = usePremium();

  const { data: books, refetch: refetchBooks } = useQuery({
    queryKey: ["profile-books", profile.id],
    queryFn: async (): Promise<UB[]> => {
      const { data } = await supabase
        .from("user_books")
        .select("id, status, rating, book:books(id, title, author, cover_url)")
        .eq("user_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(60);
      return (data ?? []) as UB[];
    },
  });

  const { data: quotes } = useQuery({
    queryKey: ["profile-quotes", profile.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("id, text, author, book_title, save_count")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(12);
      return data ?? [];
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["profile-reviews", profile.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, stars, headline, body, book:books(id, title, author, cover_url)")
        .eq("user_id", profile.id)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const { data: lists } = useQuery({
    queryKey: ["profile-lists", profile.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reading_lists")
        .select("id, name, description, cover_book_ids")
        .eq("user_id", profile.id)
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: joinedRooms } = useQuery({
    queryKey: ["profile-rooms", profile.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("room_members")
        .select("room_id, role, room:rooms(id, name, genre, is_public, book:books(title, cover_url))")
        .eq("user_id", profile.id)
        .limit(12);
      return (data ?? []) as Array<{ room_id: string; role: string; room: { id: string; name: string; genre: string | null; is_public: boolean | null; book: { title: string; cover_url: string | null } | null } | null }>;
    },
  });

  const { data: counts, refetch: refetchCounts } = useQuery({
    queryKey: ["profile-counts", profile.id],
    queryFn: async () => {
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
      ]);
      return { followers: followers ?? 0, following: following ?? 0 };
    },
  });

  const [following, setFollowing] = useState<boolean>(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [addBooksOpen, setAddBooksOpen] = useState(false);

  useEffect(() => {
    if (!user || isOwn) return;
    supabase.from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [user, profile.id, isOwn]);

  const toggleFollow = async () => {
    if (!user) return onAuth();
    if (following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id);
      setFollowing(false);
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
      if (error) return toast.error(error.message);
      setFollowing(true);
    }
    refetchCounts();
  };

  const reading = (books ?? []).filter(b => b.status === "reading");
  const read = (books ?? []).filter(b => b.status === "read");
  const want = (books ?? []).filter(b => b.status === "want");
  const dnf = (books ?? []).filter(b => b.status === "dnf");

  // Lightweight, deterministic achievements derived from real data.
  const achievements = [
    { id: "first-shelf", label: "First shelf", unlocked: (books ?? []).length > 0, hint: "Add a book to your shelf" },
    { id: "five-read", label: "5 books read", unlocked: read.length >= 5, hint: "Mark 5 books as Read" },
    { id: "first-review", label: "First review", unlocked: (reviews ?? []).length > 0, hint: "Write a review" },
    { id: "first-quote", label: "First quote", unlocked: (quotes ?? []).length > 0, hint: "Capture a line" },
    { id: "in-a-room", label: "Joined a room", unlocked: (joinedRooms ?? []).length > 0, hint: "Join a reading room" },
    { id: "ten-followers", label: "10 followers", unlocked: (counts?.followers ?? 0) >= 10, hint: "Share your profile" },
  ];

  return (
    <>
      {/* Cover + Avatar header */}
      <header className="relative animate-fade-in-soft">
        <div className="h-44 sm:h-60 w-full overflow-hidden bg-gradient-warm">
          {profile.cover_image_url ? (
            <img src={profile.cover_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-rose/30 via-gold/15 to-forest/25" />
          )}
        </div>
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="-mt-14 sm:-mt-16 flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-background bg-gradient-rose grid place-items-center text-4xl font-serif text-cream overflow-hidden shadow-elevated">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile.display_name?.[0] ?? profile.username?.[0] ?? "F").toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0 sm:pb-2">
              <h1 className="font-serif text-3xl sm:text-4xl tracking-tight">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-sm text-foreground/60">@{profile.username}</p>
              {profile.archetype && (
                <Link
                  to="/insights" search={{ tab: "dna" }}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-rose/15 text-burgundy border border-rose/30 hover:bg-rose/25 transition"
                >
                  <Sparkles className="h-3 w-3" /> {profile.archetype}
                </Link>
              )}
            </div>
            <div className="flex gap-2 sm:pb-2">
              {isOwn ? (
                <>
                  <Button onClick={() => setAddBooksOpen(true)} size="sm">
                    <Plus className="h-3.5 w-3.5" /> Add books
                  </Button>
                  <Link to="/settings" className="text-sm px-3 py-2 rounded-full border border-border hover:border-foreground/40 inline-flex items-center gap-1.5">
                    <SettingsIcon className="h-3.5 w-3.5" /> Edit
                  </Link>
                </>
              ) : (
                <Button onClick={toggleFollow} variant={following ? "outline" : "default"}>
                  {following ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </div>
          {profile.bio && <p className="mt-4 max-w-2xl text-foreground/80 leading-relaxed">{profile.bio}</p>}

          {/* Stats bar */}
          <div className="mt-5 flex gap-x-6 gap-y-2 text-sm text-foreground/70 flex-wrap">
            <Stat n={read.length} label="read" />
            <Stat n={reading.length} label="reading" />
            <Stat n={want.length} label="want" />
            {dnf.length > 0 && <Stat n={dnf.length} label="dnf" />}
            <button onClick={() => setFollowersOpen(true)} className="hover:text-foreground transition">
              <strong className="text-foreground">{counts?.followers ?? 0}</strong> <span className="text-foreground/60">followers</span>
            </button>
            <button onClick={() => setFollowingOpen(true)} className="hover:text-foreground transition">
              <strong className="text-foreground">{counts?.following ?? 0}</strong> <span className="text-foreground/60">following</span>
            </button>
          </div>

          {/* Owner: insights shortcuts */}
          {isOwn && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <InsightTile to="/insights" search={{ tab: "dna" }} icon={<Sparkles className="h-3.5 w-3.5 text-rose" />} label="Reader DNA" needsPremium={!isPremium} />
              <InsightTile to="/insights" search={{ tab: "compatibility" }} icon={<Heart className="h-3.5 w-3.5 text-forest" />} label="Compatibility" needsPremium={!isPremium} />
              <InsightTile to="/readers" icon={<Users className="h-3.5 w-3.5 text-lavender" />} label="Readers like you" />
              <InsightTile to="/insights" search={{ tab: "analytics" }} icon={<BarChart3 className="h-3.5 w-3.5 text-foreground/70" />} label="Analytics" needsPremium={!isPremium} />
            </div>
          )}
          {/* Premium previews — Reader DNA + Compatibility + Analytics — integrated in profile */}
          {isOwn && !isPremium && (
            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              <LockedPreview
                isPremium={false}
                title="Your Reader DNA"
                blurb="A continually-evolving portrait of your reading taste — moods, genres, eras, and pace."
                compact
              >
                <div className="p-3 rounded-xl bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <Dna className="h-4 w-4 text-rose" />
                    <span className="text-xs font-medium">Reader DNA</span>
                  </div>
                  {["Literary Fiction", "Historical", "Essays"].map((g, i) => (
                    <div key={g} className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-rose/50" style={{ width: `${70 - i * 15}%` }} />
                      </div>
                      <span className="text-[10px] text-foreground/60 w-20 truncate">{g}</span>
                    </div>
                  ))}
                </div>
              </LockedPreview>
              <LockedPreview
                isPremium={false}
                title="Compatibility Scores"
                blurb="See how your reading taste lines up with friends, partners, and people you follow."
                compact
              >
                <div className="p-3 rounded-xl bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose" />
                    <span className="text-xs font-medium">Compatibility</span>
                  </div>
                  {["Top match", "Close taste", "Similar shelf"].map((label, i) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-[10px] text-foreground/60">{label}</span>
                      <span className="text-xs font-medium text-rose">{95 - i * 12}%</span>
                    </div>
                  ))}
                </div>
              </LockedPreview>
              <LockedPreview
                isPremium={false}
                title="Reading Analytics"
                blurb="Pages per week, genre evolution, streak history, and mood patterns — all charted."
                compact
              >
                <div className="p-3 rounded-xl bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-gold" />
                    <span className="text-xs font-medium">Analytics</span>
                  </div>
                  <div className="flex items-end gap-0.5 h-10">
                    {[40,65,30,80,55,90,45,70].map((h, i) => (
                      <div key={i} style={{ height: `${h}%` }} className="flex-1 rounded-sm bg-gold/40" />
                    ))}
                  </div>
                  <p className="text-[10px] text-foreground/50">Books per month</p>
                </div>
              </LockedPreview>
            </div>
          )}
        </div>
      </header>

      {/* Tabbed sections */}
      <div className="mx-auto max-w-5xl px-5 sm:px-6 py-10">
        <Tabs defaultValue="shelf" className="w-full">
          <div className="sticky top-[64px] z-30 -mx-5 sm:-mx-6 px-5 sm:px-6 py-2 bg-background/85 backdrop-blur-xl border-b border-border/60">
            <TabsList className="bg-transparent p-0 h-auto gap-1 flex-wrap justify-start">
              <Tab value="shelf" icon={<BookOpen className="h-3.5 w-3.5" />} label={`Shelf · ${(books ?? []).length}`} />
              <Tab value="reviews" icon={<Sparkles className="h-3.5 w-3.5" />} label={`Reviews · ${(reviews ?? []).length}`} />
              <Tab value="quotes" icon={<QuoteIcon className="h-3.5 w-3.5" />} label={`Quotes · ${(quotes ?? []).length}`} />
              <Tab value="lists" icon={<ListChecks className="h-3.5 w-3.5" />} label={`Lists · ${(lists ?? []).length}`} />
              <Tab value="rooms" icon={<Users className="h-3.5 w-3.5" />} label={`Rooms · ${(joinedRooms ?? []).length}`} />
              {isOwn && <Tab value="achievements" icon={<Crown className="h-3.5 w-3.5" />} label="Achievements" />}
            </TabsList>
          </div>

          <TabsContent value="shelf" className="mt-8">
            {(books ?? []).length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-5 w-5 text-rose" />}
                title={isOwn ? "Your shelf is empty" : "Nothing on the shelf yet"}
                body={isOwn ? "Start by adding a book you're currently reading or one you loved." : "When this reader adds books, they'll appear here."}
                cta={isOwn ? { label: "+ Add your first book", onClick: () => setAddBooksOpen(true) } : undefined}
                secondary={isOwn ? { label: "Browse Discover", to: "/discover" } : undefined}
              />
            ) : (
              <>
                {reading.length > 0 && (
                  <ShelfRow title="Currently reading" items={reading} />
                )}
                {read.length > 0 && (
                  <ShelfRow title="Read" items={read} />
                )}
                {want.length > 0 && (
                  <ShelfRow title="Want to read" items={want} />
                )}
                {dnf.length > 0 && (
                  <ShelfRow title="Did not finish" items={dnf} />
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-8">
            {(reviews ?? []).length === 0 ? (
              <EmptyState
                icon={<Sparkles className="h-5 w-5 text-gold" />}
                title={isOwn ? "Write your first review" : "No reviews yet"}
                body={isOwn ? "Pick a book from your shelf and tell other readers what you really thought." : "When this reader posts a review, you'll see it here."}
                secondary={isOwn ? { label: "Go to my shelf", to: "/home", search: { tab: "library" } } : undefined}
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 stagger-children">
                {(reviews ?? []).map((r: any) => (
                  <article key={r.id} className="card-surface p-4 hover-lift">
                    <div className="flex gap-3">
                      {r.book?.cover_url && <img src={r.book.cover_url} className="w-14 h-20 object-cover rounded shadow" alt="" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground/60 truncate">{r.book?.title} — {r.book?.author}</p>
                        <p className="text-sm font-medium text-gold">{"★".repeat(r.stars ?? 0)}<span className="text-foreground/15">{"★".repeat(5 - (r.stars ?? 0))}</span></p>
                        {r.headline && <h3 className="font-serif text-lg mt-1 leading-tight">{r.headline}</h3>}
                        {r.body && <p className="text-sm text-foreground/80 mt-1 line-clamp-3 leading-relaxed">{r.body}</p>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quotes" className="mt-8">
            {(quotes ?? []).length === 0 ? (
              <EmptyState
                icon={<QuoteIcon className="h-5 w-5 text-lavender" />}
                title={isOwn ? "Save a line you love" : "No quotes yet"}
                body={isOwn ? "The Quote Wall is where readers collect the lines that stayed with them. Add one and share it with the world." : "When this reader saves a quote, it'll appear here."}
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 stagger-children">
                {(quotes ?? []).map((q: any) => (
                  <blockquote key={q.id} className="card-surface p-5 hover-lift">
                    <p className="font-serif text-lg leading-snug">&ldquo;{q.text}&rdquo;</p>
                    <footer className="mt-3 text-xs text-foreground/60">— {q.author ?? "Unknown"}{q.book_title && `, ${q.book_title}`}</footer>
                  </blockquote>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="lists" className="mt-8">
            {(lists ?? []).length === 0 ? (
              <EmptyState
                icon={<ListChecks className="h-5 w-5 text-forest" />}
                title={isOwn ? "Make your first list" : "No public lists yet"}
                body={isOwn ? "Lists like 'Books that ruined me' or 'Cozy reads for autumn' are how readers find each other." : "Public lists will show up here."}
                secondary={isOwn ? { label: "Browse community lists", to: "/home", search: { tab: "community" } } : undefined}
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 stagger-children">
                {(lists ?? []).map((l: any) => (
                  <Link key={l.id} to="/list/$listId" params={{ listId: l.id }} className="card-surface p-5 hover-lift block">
                    <h3 className="font-serif text-xl">{l.name}</h3>
                    {l.description && <p className="text-sm text-foreground/70 mt-1 line-clamp-2">{l.description}</p>}
                    <p className="mt-3 text-[11px] text-foreground/50 uppercase tracking-widest">Open list →</p>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rooms" className="mt-8">
            {(joinedRooms ?? []).length === 0 ? (
              <EmptyState
                icon={<Users className="h-5 w-5 text-rose" />}
                title={isOwn ? "You haven't joined a room yet" : "No rooms joined yet"}
                body={isOwn ? "Reading Rooms are small communities reading the same book at the same time. Find one that matches your taste." : "When this reader joins a room, it'll show up here."}
                secondary={isOwn ? { label: "Browse reading rooms →", to: "/rooms" } : undefined}
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 stagger-children">
                {(joinedRooms ?? []).map((m) => m.room && (
                  <Link
                    key={m.room_id}
                    to="/rooms/$roomId"
                    params={{ roomId: m.room_id }}
                    className="card-surface p-4 hover-lift flex gap-3"
                  >
                    {m.room.book?.cover_url
                      ? <img src={m.room.book.cover_url} className="w-12 h-16 object-cover rounded shadow" alt="" />
                      : <div className="w-12 h-16 rounded bg-muted" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-lg leading-tight truncate">{m.room.name}</p>
                      <p className="text-xs text-foreground/60 truncate">{m.room.book?.title ?? "—"}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-widest">
                        {m.room.genre && <span className="px-2 py-0.5 rounded-full bg-muted">{m.room.genre}</span>}
                        <span className={`px-2 py-0.5 rounded-full ${m.room.is_public ? "bg-forest/15 text-forest-deep" : "bg-muted"}`}>
                          {m.room.is_public ? "public" : "private"}
                        </span>
                        {m.role !== "member" && <span className="px-2 py-0.5 rounded-full bg-gold/20 text-burgundy">{m.role}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {isOwn && (
            <TabsContent value="achievements" className="mt-8">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
                {achievements.map(a => (
                  <div
                    key={a.id}
                    className={`card-surface p-4 flex items-center gap-3 transition ${a.unlocked ? "" : "opacity-55"}`}
                  >
                    <div className={`h-10 w-10 rounded-full grid place-items-center text-base ${a.unlocked ? "bg-gradient-warm text-burgundy" : "bg-muted text-foreground/40"}`}>
                      {a.unlocked ? "★" : "○"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.label}</p>
                      <p className="text-[11px] text-foreground/55">{a.unlocked ? "Unlocked" : a.hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <FollowersSheet open={followersOpen} onOpenChange={setFollowersOpen} profileId={profile.id} count={counts?.followers ?? 0} />
      <FollowingSheet open={followingOpen} onOpenChange={setFollowingOpen} profileId={profile.id} count={counts?.following ?? 0} />
      {isOwn && (
        <AddBooksDialog
          open={addBooksOpen}
          onOpenChange={setAddBooksOpen}
          onAdded={() => { refetchBooks(); queryClient.invalidateQueries({ queryKey: ["profile-counts", profile.id] }); }}
        />
      )}
    </>
  );
}

// ── Small bits ────────────────────────────────────────────────────────────────
function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span><strong className="text-foreground tabular-nums">{n}</strong> <span className="text-foreground/60">{label}</span></span>
  );
}

function InsightTile({ to, icon, label, needsPremium }: { to: any; icon: React.ReactNode; label: string; needsPremium?: boolean }) {
  return (
    <Link to={to} className="card-surface px-3 py-2.5 flex items-center gap-2 text-xs hover-lift">
      {icon}
      <span className="font-medium truncate">{label}</span>
      {needsPremium
        ? <Crown className="h-2.5 w-2.5 text-rose ml-auto shrink-0" />
        : <span className="ml-auto text-foreground/40">→</span>
      }
    </Link>
  );
}

function Tab({ value, icon, label }: { value: string; icon: React.ReactNode; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-soft border border-transparent data-[state=inactive]:hover:border-border px-3.5 py-1.5 text-xs font-medium gap-1.5 transition-colors"
    >
      {icon} {label}
    </TabsTrigger>
  );
}

function ShelfRow({ title, items }: { title: string; items: UB[] }) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-serif text-xl">{title}</h3>
        <span className="text-[11px] uppercase tracking-widest text-foreground/45">{items.length}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 stagger-children">
        {items.map(ub => (
          <Link
            key={ub.id}
            to={ub.book ? "/book/$bookId" : "/home"}
            params={ub.book ? { bookId: ub.book.id } : undefined as any}
            className="aspect-[2/3] rounded-md overflow-hidden bg-muted shadow-book hover-scale block"
          >
            {ub.book?.cover_url ? (
              <img src={ub.book.cover_url} alt={ub.book.title} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-full w-full grid place-items-center text-xs text-foreground/40 p-2 text-center font-serif">{ub.book?.title}</div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

function EmptyState({
  icon, title, body, cta, secondary,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: { label: string; onClick: () => void };
  secondary?: { label: string; to: any; search?: any };
}) {
  return (
    <div className="card-surface px-6 py-12 sm:py-16 text-center max-w-2xl mx-auto animate-fade-in">
      <div className="mx-auto h-12 w-12 rounded-full grid place-items-center bg-gradient-warm">
        {icon}
      </div>
      <h3 className="font-serif text-2xl mt-4">{title}</h3>
      <p className="mt-2 text-sm text-foreground/65 max-w-md mx-auto leading-relaxed">{body}</p>
      <div className="mt-5 flex gap-2 justify-center flex-wrap">
        {cta && (
          <Button onClick={cta.onClick} size="sm">{cta.label}</Button>
        )}
        {secondary && (
          <Link to={secondary.to} search={secondary.search} className="text-sm px-4 py-2 rounded-full border border-border hover:border-foreground/40 transition">
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}
