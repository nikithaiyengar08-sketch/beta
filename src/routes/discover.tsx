import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Footer } from "@/components/folio/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGate } from "@/components/auth/AuthGate";
import { ensureBook, type OLBook } from "@/lib/openlibrary";
import { LockedPreview } from "@/components/folio/LockedPreview";
import { usePremium } from "@/lib/premium";
import { toast } from "sonner";
import { TrendingUp, Users, MessageSquare, ListChecks, Sparkles, BookOpen, ArrowRight, Star } from "lucide-react";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Folio" },
      { name: "description", content: "Find books, readers, rooms, and lists." },
      { property: "og:title", content: "Discover — Folio" },
    ],
  }),
  component: DiscoverPage,
});

const FIELDS = "key,title,author_name,cover_i,first_publish_year,ratings_average,isbn";
const GENRES = ["Fiction","Literary Fiction","Non-fiction","Mystery","Thriller","Romance","Science Fiction","Fantasy","Biography","History","Self-help","Poetry","Horror","Classics","Young Adult"];

type Card = { ol_id: string; title: string; author: string; cover_url: string | null; isbn: string | null; published_year: number | null; readers?: number };

async function olFetch(url: string, retried = false): Promise<any> {
  const res = await fetch(url);
  if (res.status === 429 && !retried) {
    await new Promise(r => setTimeout(r, 1200));
    return olFetch(url, true);
  }
  return res.json();
}

function mapDocs(docs: any[]): Card[] {
  return (docs ?? []).map(d => ({
    ol_id: (d.key ?? "").replace(/^\/works\//, ""),
    title: d.title,
    author: d.author_name?.[0] ?? d.authors?.[0]?.name ?? "Unknown",
    cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    isbn: d.isbn?.[0] ?? null,
    published_year: d.first_publish_year ?? null,
  })).filter(c => c.ol_id && c.title);
}

function DiscoverPage() {
  const { isPremium } = usePremium();

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero header — concise, strong */}
      <header className="mx-auto max-w-7xl px-6 pt-12 pb-8">
        <span className="chip">Discover</span>
        <h1 className="font-serif text-5xl md:text-6xl mt-4 leading-[1.05]">
          Find your next <em className="text-burgundy">obsession.</em>
        </h1>
        <p className="text-foreground/60 text-lg max-w-xl mt-3">
          Trending books, readers who share your taste, active reading rooms, and lists worth stealing.
        </p>
      </header>

      {/* Sticky anchor nav */}
      <div className="sticky top-[64px] z-30 bg-background/90 backdrop-blur-xl border-b border-border/60">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {[
              { href: "#trending", icon: <TrendingUp className="h-3.5 w-3.5" />, label: "Trending" },
              { href: "#recommended", icon: <Sparkles className="h-3.5 w-3.5" />, label: "For You" },
              { href: "#readers", icon: <Users className="h-3.5 w-3.5" />, label: "Readers" },
              { href: "#rooms", icon: <MessageSquare className="h-3.5 w-3.5" />, label: "Rooms" },
              { href: "#lists", icon: <ListChecks className="h-3.5 w-3.5" />, label: "Lists" },
              { href: "#browse", icon: <BookOpen className="h-3.5 w-3.5" />, label: "Browse" },
            ].map(t => (
              <a
                key={t.href}
                href={t.href}
                className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 border-transparent text-foreground/55 hover:text-foreground hover:border-foreground/30 transition-colors whitespace-nowrap"
              >
                {t.icon}
                {t.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 space-y-20">

        {/* 1. Trending — highest priority, widest appeal */}
        <section id="trending">
          <TrendingSection />
        </section>

        {/* 2. Recommended for you — premium hook early */}
        <section id="recommended">
          <RecommendedSection isPremium={isPremium} />
        </section>

        {/* 3. Readers like you — social */}
        <section id="readers">
          <ReadersSection isPremium={isPremium} />
        </section>

        {/* 4. Active Rooms */}
        <section id="rooms">
          <RoomsSection />
        </section>

        {/* 5. Popular Lists */}
        <section id="lists">
          <ListsSection />
        </section>

        {/* 6. Browse by genre — exploration */}
        <section id="browse">
          <BrowseSection />
        </section>

      </div>

      <Footer />
    </main>
  );
}

/* ─── SHARED HOOKS ─── */
function useAddToShelf() {
  const { user } = useAuth();
  const { openAuth } = useGate();
  return async (book: Card, status: "want" | "reading" | "read") => {
    if (!user) { openAuth(); return; }
    try {
      const ol: OLBook = { ol_id: book.ol_id, title: book.title, author: book.author, cover_url: book.cover_url, isbn: book.isbn, published_year: book.published_year };
      const bookId = await ensureBook(ol);
      const { error } = await supabase.from("user_books").upsert({ user_id: user.id, book_id: bookId, status }, { onConflict: "user_id,book_id" });
      if (error) throw error;
      toast.success(`Added to ${status === "want" ? "want to read" : status}`);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };
}

/* ─── SHARED UI ─── */
function BookCard({ b, rank }: { b: Card; rank?: number }) {
  const add = useAddToShelf();
  return (
    <div className="group flex-shrink-0 w-36 md:w-40">
      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted shadow-sm relative">
        {b.cover_url ? (
          <img src={b.cover_url} alt={b.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition duration-300" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-foreground/40 p-3 text-center font-serif">{b.title}</div>
        )}
        {rank && rank <= 3 && (
          <span className="absolute top-2 left-2 h-6 w-6 rounded-full bg-gold text-background text-[11px] font-bold grid place-items-center shadow">
            {rank}
          </span>
        )}
        {b.readers !== undefined && (
          <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-foreground/80 text-background backdrop-blur">
            {b.readers} readers
          </span>
        )}
      </div>
      <p className="mt-2 font-serif text-sm leading-tight line-clamp-2">{b.title}</p>
      <p className="text-[11px] text-foreground/55 line-clamp-1">{b.author}</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="mt-2 h-7 px-3 text-[11px] w-full">+ Add to shelf</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => add(b, "want")}>Want to read</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => add(b, "reading")}>Currently reading</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => add(b, "read")}>Already read</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function BookSkel({ n = 8 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-36 md:w-40">
          <Skeleton className="aspect-[2/3] rounded-xl" />
          <Skeleton className="h-3 mt-2 w-3/4" />
          <Skeleton className="h-2 mt-1 w-1/2" />
        </div>
      ))}
    </>
  );
}

function SectionHeader({ chip, title, linkTo, linkLabel, description }: { chip: string; title: string; linkTo?: string; linkLabel?: string; description?: string }) {
  return (
    <div className="mb-7">
      <div className="flex items-end justify-between">
        <div>
          <span className="chip">{chip}</span>
          <h2 className="font-serif text-3xl mt-2">{title}</h2>
        </div>
        {linkTo && linkLabel && (
          <Link to={linkTo} className="flex items-center gap-1.5 text-sm text-foreground/55 hover:text-foreground transition shrink-0">
            {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {description && <p className="mt-2 text-sm text-foreground/60 max-w-xl">{description}</p>}
    </div>
  );
}

/* ─── TRENDING ─── */
function TrendingSection() {
  const { data: trending, isLoading } = useQuery({
    queryKey: ["discover", "trending"],
    queryFn: async () => {
      const j = await olFetch("https://openlibrary.org/trending/weekly.json?limit=16");
      return mapDocs(j.works ?? []);
    },
    staleTime: 10 * 60 * 1000, retry: 1,
  });

  return (
    <div>
      <SectionHeader
        chip="Trending this week"
        title="What everyone's reading right now"
        description="The books the community is actively adding, reviewing, and discussing."
      />
      <div className="flex gap-4 overflow-x-auto scrollbar-none pb-4">
        {isLoading
          ? <BookSkel />
          : (trending ?? []).map((b, i) => <BookCard key={b.ol_id} b={b} rank={i + 1} />)
        }
      </div>
    </div>
  );
}

/* ─── RECOMMENDED (Premium) — moved up for visibility ─── */
function RecommendedSection({ isPremium }: { isPremium: boolean }) {
  const { data: books, isLoading } = useQuery({
    queryKey: ["discover", "recommended-preview"],
    queryFn: async () => {
      const { data } = await supabase.from("books").select("id, ol_id, title, author, cover_url, isbn, published_year")
        .order("ratings_average", { ascending: false, nullsFirst: false }).limit(8);
      return (data ?? []).map((b: any) => ({ ol_id: b.ol_id ?? b.id, title: b.title, author: b.author ?? "Unknown", cover_url: b.cover_url, isbn: b.isbn, published_year: b.published_year }));
    },
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div>
      <SectionHeader
        chip="Recommended for you"
        title="Picked from your reading DNA"
        linkTo="/recommendations"
        linkLabel="All recommendations"
        description="The more you read on Folio, the sharper these get."
      />
      <LockedPreview
        isPremium={isPremium}
        title="Unlock smart recommendations"
        blurb="Folio tunes recommendations by your Reader DNA — genre depth, mood patterns, and reading pace. Premium readers get a weekly fresh batch."
        compact
      >
        <div className="flex gap-4 overflow-x-auto scrollbar-none pb-4">
          {isLoading ? <BookSkel /> : (books ?? []).map(b => <BookCard key={b.ol_id} b={b} />)}
        </div>
      </LockedPreview>
    </div>
  );
}

/* ─── READERS LIKE YOU ─── */
function ReadersSection({ isPremium }: { isPremium: boolean }) {
  const { data: readers, isLoading } = useQuery({
    queryKey: ["discover", "readers-preview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, archetype")
        .not("username", "is", null)
        .limit(8);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div>
      <SectionHeader
        chip="Readers like you"
        title="People whose shelves rhyme with yours"
        linkTo="/readers"
        linkLabel="Find your matches"
        description="Folio matches you by genre overlap, mood, pace, and archetype — not just who has the most followers."
      />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : !readers || readers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Users className="h-8 w-8 text-foreground/25 mx-auto mb-3" />
          <p className="font-serif text-xl">No readers yet.</p>
          <p className="text-sm text-foreground/55 mt-1">Be among the first to join Folio.</p>
          <Button asChild className="mt-5"><Link to="/home">Go to my shelf</Link></Button>
        </div>
      ) : (
        <LockedPreview
          isPremium={isPremium}
          title="See your full reader matches"
          blurb="Your taste graph ranks every reader by genre overlap, mood, and pace. Upgrade for the full list and a weekly digest of new strong matches."
          compact
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {readers.slice(0, 4).map((r: any) => (
              <Link key={r.id} to="/u/$username" params={{ username: r.username }}
                className="group rounded-2xl border border-border bg-card p-4 hover:border-foreground/30 transition block">
                <div className="flex items-center gap-3">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt={r.display_name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose/30 to-lavender/30 grid place-items-center text-sm font-serif text-burgundy">
                      {(r.display_name ?? r.username ?? "?")[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate group-hover:text-burgundy transition">{r.display_name ?? r.username}</p>
                    <p className="text-[11px] text-foreground/50 truncate">@{r.username}</p>
                  </div>
                </div>
                {r.archetype && (
                  <p className="mt-2 text-[11px] text-foreground/60 truncate italic">{r.archetype}</p>
                )}
                {r.bio && (
                  <p className="mt-1.5 text-xs text-foreground/65 line-clamp-2 leading-relaxed">{r.bio}</p>
                )}
                <p className="mt-3 text-[11px] text-foreground/40 group-hover:text-foreground/60 transition">View profile →</p>
              </Link>
            ))}
          </div>
        </LockedPreview>
      )}
    </div>
  );
}

/* ─── ACTIVE ROOMS ─── */
function RoomsSection() {
  const { data: rooms, isLoading } = useQuery({
    queryKey: ["discover", "public-rooms"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("rooms")
        .select("id, name, genre, book:books(title, author, cover_url)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(9);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div>
      <SectionHeader
        chip="Active reading rooms"
        title="Small groups, mid-chapter"
        linkTo="/rooms"
        linkLabel="All rooms"
        description="Join a room reading a book you love — or start your own and invite friends."
      />

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : !rooms || rooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <MessageSquare className="h-8 w-8 text-foreground/25 mx-auto mb-3" />
          <p className="font-serif text-xl">No public rooms yet.</p>
          <p className="mt-2 text-sm text-foreground/55">Be the first to start one and invite your reading friends.</p>
          <Button asChild className="mt-5"><Link to="/rooms">Create a reading room</Link></Button>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((r: any) => (
              <Link key={r.id} to="/rooms/$roomId" params={{ roomId: r.id }}
                className="group rounded-2xl border border-border bg-card p-5 hover:border-foreground/30 transition flex gap-4">
                {r.book?.cover_url ? (
                  <img src={r.book.cover_url} alt="" className="h-20 w-14 object-cover rounded shadow shrink-0" />
                ) : (
                  <div className="h-20 w-14 bg-muted rounded shrink-0 grid place-items-center">
                    <BookOpen className="h-4 w-4 text-foreground/30" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base leading-tight truncate group-hover:text-burgundy transition">{r.name}</p>
                  {r.book?.title && <p className="text-xs text-foreground/55 mt-1 truncate">{r.book.title}</p>}
                  {r.book?.author && <p className="text-[11px] text-foreground/40 truncate">{r.book.author}</p>}
                  {r.genre && <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground/60">{r.genre}</span>}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Button asChild variant="outline">
              <Link to="/rooms">Browse all rooms + create your own →</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── POPULAR LISTS ─── */
function ListsSection() {
  const { data: lists, isLoading } = useQuery({
    queryKey: ["discover", "lists"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("lists")
        .select("id, name, description, profiles(username, display_name)")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div>
      <SectionHeader
        chip="Community lists"
        title="Curated by readers, for readers"
        description="Lists like 'Books that destroyed me' or 'Perfect for a rainy Sunday' — the ones worth stealing."
      />

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : !lists || lists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <ListChecks className="h-8 w-8 text-foreground/25 mx-auto mb-3" />
          <p className="font-serif text-xl">No public lists yet.</p>
          <p className="mt-2 text-sm text-foreground/55">Create a list on your profile and share it with the community.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {lists.map((l: any) => (
            <Link key={l.id} to="/list/$listId" params={{ listId: l.id }}
              className="group rounded-2xl border border-border bg-card p-5 hover:border-foreground/30 transition">
              <div className="flex items-start gap-3">
                <ListChecks className="h-4 w-4 text-foreground/30 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg truncate group-hover:text-burgundy transition">{l.name}</p>
                  {l.description && <p className="text-sm text-foreground/60 mt-1 line-clamp-2">{l.description}</p>}
                  <p className="text-[11px] text-foreground/40 mt-3">
                    by {l.profiles?.display_name || l.profiles?.username || "a reader"}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-foreground/30 group-hover:text-foreground/60 mt-0.5 shrink-0 transition" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── BROWSE BY GENRE ─── */
function BrowseSection() {
  const [genre, setGenre] = useState("Fiction");

  const subj = genre.toLowerCase().replace(/\s+/g, "+");
  const { data: genreBooks, isLoading } = useQuery({
    queryKey: ["discover", "genre", subj],
    queryFn: async () => {
      const j = await olFetch(`https://openlibrary.org/search.json?subject=${subj}&sort=rating&limit=24&fields=${FIELDS}`);
      return mapDocs(j.docs ?? []);
    },
    staleTime: 10 * 60 * 1000, retry: 1,
  });

  return (
    <div>
      <SectionHeader
        chip="Browse by genre"
        title="Pick a mood. We'll find the books."
      />
      <div className="flex flex-wrap gap-2 mb-7">
        {GENRES.map(g => (
          <button key={g} onClick={() => setGenre(g)}
            className={`text-xs px-4 py-2 rounded-full border transition ${genre === g ? "bg-foreground text-background border-foreground" : "border-border bg-background hover:border-foreground/40"}`}>
            {g}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
        {isLoading ? <BookSkel n={12} /> : (genreBooks ?? []).map(b => <BookCard key={b.ol_id} b={b} />)}
      </div>
    </div>
  );
}
