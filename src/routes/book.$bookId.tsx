import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGate } from "@/components/auth/AuthGate";
import { Footer } from "@/components/folio/Footer";
import { Button } from "@/components/ui/button";
import { ReviewSheet } from "@/components/folio/ReviewSheet";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

type Book = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  description: string | null;
  genres: string[] | null;
  page_count: number | null;
  published_year: number | null;
  ratings_average: number | null;
  ratings_count: number | null;
};

type Review = {
  id: string;
  stars: number | null;
  body: string | null;
  headline: string | null;
  created_at: string;
  user_id: string;
  profile?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
};

const STATUS_OPTIONS = [
  { value: "want", label: "Want to read" },
  { value: "reading", label: "Currently reading" },
  { value: "read", label: "Read" },
  { value: "dnf", label: "Did Not Finish" },
] as const;

async function fetchBook(id: string): Promise<Book | null> {
  const { data } = await supabase
    .from("books")
    .select("id, title, author, cover_url, description, genres, page_count, published_year, ratings_average, ratings_count")
    .eq("id", id)
    .maybeSingle();
  return (data as Book | null) ?? null;
}

export const Route = createFileRoute("/book/$bookId")({
  loader: async ({ params }) => {
    const book = await fetchBook(params.bookId);
    if (!book) throw notFound();
    return { book };
  },
  head: ({ loaderData }) => {
    const b = loaderData?.book;
    const title = b ? `${b.title}${b.author ? ` — ${b.author}` : ""} · Folio` : "Book · Folio";
    const desc = b?.description?.slice(0, 155) ?? "Discover this book on Folio — reviews, readers, lists, and reading rooms.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "book" },
        ...(b?.cover_url ? [{ property: "og:image", content: b.cover_url }] : []),
      ],
      links: b ? [{ rel: "canonical", href: `/book/${b.id}` }] : [],
      scripts: b
        ? [{
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Book",
              name: b.title,
              author: b.author ?? undefined,
              image: b.cover_url ?? undefined,
              datePublished: b.published_year ?? undefined,
              numberOfPages: b.page_count ?? undefined,
              aggregateRating: b.ratings_count
                ? { "@type": "AggregateRating", ratingValue: b.ratings_average, ratingCount: b.ratings_count }
                : undefined,
            }),
          }]
        : [],
    };
  },
  notFoundComponent: () => (
    <main className="min-h-screen bg-background">
      
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-4xl">We couldn't find that book</h1>
        <p className="mt-3 text-foreground/60">It may have been removed from the catalog. Try searching for something new.</p>
        <Link to="/discover" className="mt-6 inline-flex rounded-full bg-foreground text-background px-5 py-2 text-sm">Browse Discover</Link>
      </div>
    </main>
  ),
  errorComponent: ({ error }) => (
    <main className="min-h-screen bg-background grid place-items-center">
      <div className="max-w-md text-center px-6">
        <h1 className="font-serif text-3xl">Couldn't load this book</h1>
        <p className="mt-2 text-sm text-foreground/60">{error.message}</p>
      </div>
    </main>
  ),
  component: BookDetail,
});

function BookDetail() {
  const { book } = Route.useLoaderData();
  const { user } = useAuth();
  const { openAuth } = useGate();
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [myUbId, setMyUbId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [readerCount, setReaderCount] = useState<number>(0);
  const [similar, setSimilar] = useState<Pick<Book, "id" | "title" | "author" | "cover_url">[]>([]);
  const [lists, setLists] = useState<{ id: string; title: string }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    (async () => {
      // My shelf row
      if (user) {
        const { data } = await supabase
          .from("user_books")
          .select("id,status")
          .eq("user_id", user.id)
          .eq("book_id", book.id)
          .maybeSingle();
        setMyUbId(data?.id ?? null);
        setMyStatus(data?.status ?? null);
      }
      // Reviews + actor profiles (no FK from reviews to profiles, fetch in two steps)
      const { data: rev } = await supabase
        .from("reviews")
        .select("id,stars,body,headline,created_at,user_id")
        .eq("book_id", book.id)
        .order("created_at", { ascending: false })
        .limit(12);
      const reviewRows = (rev as any[] | null) ?? [];
      const userIds = Array.from(new Set(reviewRows.map(r => r.user_id)));
      let profileMap: Record<string, any> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,username,display_name,avatar_url")
          .in("id", userIds);
        profileMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      }
      setReviews(reviewRows.map(r => ({ ...r, profile: profileMap[r.user_id] ?? null })));
      // Reader count
      const { count } = await supabase
        .from("user_books")
        .select("id", { count: "exact", head: true })
        .eq("book_id", book.id)
        .in("status", ["reading", "read"]);
      setReaderCount(count ?? 0);
      // Lists containing this book
      const { data: lb } = await supabase
        .from("list_books")
        .select("list:reading_lists(id,title,is_public)")
        .eq("book_id", book.id)
        .limit(8);
      setLists(((lb ?? []) as any).map((r: any) => r.list).filter((l: any) => l?.is_public));
      // Rooms discussing this book
      const { data: rms } = await supabase
        .from("rooms")
        .select("id,name")
        .eq("book_id", book.id)
        .limit(6);
      setRooms((rms as any) ?? []);
      // Similar books — same primary genre
      if (book.genres && book.genres.length) {
        const { data: sim } = await supabase
          .from("books")
          .select("id,title,author,cover_url")
          .contains("genres", [book.genres[0]])
          .neq("id", book.id)
          .order("ratings_count", { ascending: false, nullsFirst: false })
          .limit(8);
        setSimilar((sim as any) ?? []);
      }
    })();
  }, [book.id, user?.id]);

  const setShelfStatus = async (status: string) => {
    if (!user) return openAuth();
    if (myUbId) {
      const { error } = await supabase.from("user_books").update({ status }).eq("id", myUbId);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase
        .from("user_books")
        .insert({ user_id: user.id, book_id: book.id, status })
        .select("id")
        .single();
      if (error) return toast.error(error.message);
      setMyUbId(data.id);
    }
    setMyStatus(status);
    toast.success(`Saved to ${STATUS_OPTIONS.find(s => s.value === status)?.label}`);
    if (status === "reading") logActivity({ type: "started_reading", book_id: book.id });
    if (status === "read") logActivity({ type: "finished_book", book_id: book.id });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      
      <article className="mx-auto max-w-5xl px-5 sm:px-6 py-8 sm:py-12">
        <header className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-6 md:gap-10">
          <div className="mx-auto md:mx-0">
            {book.cover_url ? (
              <img src={book.cover_url} alt={`${book.title} cover`} className="w-44 md:w-48 aspect-[2/3] object-cover rounded-md shadow-xl" loading="eager" />
            ) : (
              <div className="w-44 md:w-48 aspect-[2/3] rounded-md bg-muted grid place-items-center text-foreground/30">No cover</div>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-foreground/50">
              {book.genres?.[0] ?? "Book"}{book.published_year ? ` · ${book.published_year}` : ""}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight mt-1">{book.title}</h1>
            {book.author && <p className="mt-2 text-foreground/70">by <span className="font-medium text-foreground">{book.author}</span></p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground/70">
              {book.ratings_average != null && (
                <span className="flex items-center gap-1"><span className="text-gold">★</span> {book.ratings_average.toFixed(1)} <span className="text-foreground/40">({(book.ratings_count ?? 0).toLocaleString()})</span></span>
              )}
              {book.page_count != null && <span>{book.page_count} pages</span>}
              <span>{readerCount.toLocaleString()} {readerCount === 1 ? "reader" : "readers"} on Folio</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {STATUS_OPTIONS.map(s => {
                const active = myStatus === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => setShelfStatus(s.value)}
                    className={`text-xs sm:text-sm px-4 py-2 rounded-full border transition min-h-11 ${active ? "bg-foreground text-background border-foreground" : "border-border text-foreground/70 hover:border-foreground/40"}`}
                    aria-pressed={active}
                  >
                    {s.label}
                  </button>
                );
              })}
              <Button onClick={() => (user ? setReviewOpen(true) : openAuth())} variant="outline" className="rounded-full min-h-11">Write review</Button>
            </div>

            {book.genres && book.genres.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {book.genres.slice(0, 8).map((g: string) => (
                  <span key={g} className="text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-foreground/70">{g}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        {book.description && (
          <section className="mt-10">
            <h2 className="font-serif text-2xl mb-3">About this book</h2>
            <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{book.description}</p>
          </section>
        )}

        <section className="mt-12">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-2xl">Reviews</h2>
            <button onClick={() => (user ? setReviewOpen(true) : openAuth())} className="text-sm text-foreground/70 hover:text-foreground">+ Write one</button>
          </div>
          {reviews.length === 0 ? (
            <EmptyCard
              title="No reviews yet"
              body="Be the first to write a thoughtful review. Your words help other readers decide."
              cta={user ? { label: "Write the first review", onClick: () => setReviewOpen(true) } : { label: "Sign in to review", onClick: openAuth }}
            />
          ) : (
            <ul className="space-y-4">
              {reviews.map(r => (
                <li key={r.id} className="p-5 rounded-2xl border border-border bg-card">
                  <div className="flex items-center gap-3">
                    {r.profile?.avatar_url ? (
                      <img src={r.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-rose grid place-items-center text-[11px] text-white">{(r.profile?.display_name ?? "?")[0]?.toUpperCase()}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      {r.profile?.username ? (
                        <Link to="/u/$username" params={{ username: r.profile.username }} className="text-sm font-medium hover:underline">
                          {r.profile?.display_name ?? r.profile.username}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium">{r.profile?.display_name ?? "Reader"}</span>
                      )}
                      <p className="text-[11px] text-foreground/50">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    {r.stars != null && <div className="text-gold text-sm">{"★".repeat(r.stars)}<span className="text-foreground/20">{"★".repeat(5 - r.stars)}</span></div>}
                  </div>
                  {r.headline && <p className="font-serif text-lg mt-3">{r.headline}</p>}
                  {r.body && <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{r.body}</p>}
                  <ReviewFooterActions reviewId={r.id} reviewerUsername={r.profile?.username ?? null} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid md:grid-cols-2 gap-10 mt-12">
          <section>
            <h2 className="font-serif text-2xl mb-3">Lists with this book</h2>
            {lists.length === 0 ? (
              <p className="text-sm text-foreground/50">Not yet on any public list. Add it to one of yours.</p>
            ) : (
              <ul className="space-y-2">
                {lists.map(l => (
                  <li key={l.id}>
                    <Link to="/list/$listId" params={{ listId: l.id }} className="block px-4 py-3 rounded-xl border border-border hover:border-foreground/40 transition">
                      <span className="font-serif text-base">{l.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="font-serif text-2xl mb-3">Reading Rooms</h2>
            {rooms.length === 0 ? (
              <p className="text-sm text-foreground/50">No rooms are reading this yet. <Link to="/rooms" className="underline">Start one</Link>.</p>
            ) : (
              <ul className="space-y-2">
                {rooms.map(r => (
                  <li key={r.id}>
                    <Link to="/rooms/$roomId" params={{ roomId: r.id }} className="block px-4 py-3 rounded-xl border border-border hover:border-foreground/40 transition">
                      <span className="font-serif text-base">{r.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {similar.length > 0 && (
          <section className="mt-12">
            <h2 className="font-serif text-2xl mb-4">Readers also enjoyed</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {similar.map(s => (
                <Link key={s.id} to="/book/$bookId" params={{ bookId: s.id }} className="group">
                  <div className="aspect-[2/3] rounded-md overflow-hidden bg-muted">
                    {s.cover_url ? <img src={s.cover_url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition" loading="lazy" /> : null}
                  </div>
                  <p className="mt-2 font-serif text-sm line-clamp-2 group-hover:underline">{s.title}</p>
                  <p className="text-[11px] text-foreground/50 line-clamp-1">{s.author}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
      <Footer />
      <ReviewSheet open={reviewOpen} onOpenChange={setReviewOpen} book={{ id: book.id, title: book.title, author: book.author, cover_url: book.cover_url }} />
    </main>
  );
}

function EmptyCard({ title, body, cta }: { title: string; body: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/40">
      <p className="font-serif text-xl">{title}</p>
      <p className="mt-2 text-sm text-foreground/60 max-w-md mx-auto">{body}</p>
      {cta && <button onClick={cta.onClick} className="mt-4 inline-flex rounded-full bg-foreground text-background px-5 py-2 text-sm min-h-11">{cta.label}</button>}
    </div>
  );
}

function ReviewFooterActions({ reviewId, reviewerUsername }: { reviewId: string; reviewerUsername: string | null }) {
  const { user } = useAuth();
  const { openAuth } = useGate();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ count: lc }, { count: cc }] = await Promise.all([
        (supabase as any).from("likes").select("id", { count: "exact", head: true }).eq("target_type", "review").eq("target_id", reviewId),
        (supabase as any).from("comments").select("id", { count: "exact", head: true }).eq("target_type", "review").eq("target_id", reviewId),
      ]);
      setLikeCount(lc ?? 0);
      setCommentCount(cc ?? 0);
      if (user) {
        const { data } = await (supabase as any).from("likes").select("id").eq("target_type", "review").eq("target_id", reviewId).eq("user_id", user.id).maybeSingle();
        setLiked(!!data);
      }
    })();
  }, [reviewId, user?.id]);

  const toggleLike = async () => {
    if (!user) return openAuth();
    if (liked) {
      await (supabase as any).from("likes").delete().eq("target_type", "review").eq("target_id", reviewId).eq("user_id", user.id);
      setLiked(false); setLikeCount(c => Math.max(0, c - 1));
    } else {
      await (supabase as any).from("likes").insert({ target_type: "review", target_id: reviewId, user_id: user.id });
      setLiked(true); setLikeCount(c => c + 1);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#review-${reviewId}`;
    try {
      if (navigator.share) await navigator.share({ url, title: "Review on Folio" });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* ignore */ }
  };

  return (
    <div className="mt-4 flex items-center gap-4 text-xs text-foreground/60">
      <button onClick={toggleLike} className={`hover:text-foreground transition ${liked ? "text-rose" : ""}`} aria-label="Like review">
        ♥ {likeCount}
      </button>
      <button className="hover:text-foreground" aria-label="Comments">💬 {commentCount}</button>
      <button onClick={() => { setSaved(s => !s); toast.success(saved ? "Removed" : "Saved"); }} className="hover:text-foreground">
        {saved ? "★ Saved" : "☆ Save"}
      </button>
      <button onClick={share} className="hover:text-foreground">Share</button>
      {reviewerUsername && (
        <Link to="/u/$username" params={{ username: reviewerUsername }} className="ml-auto text-foreground/60 hover:text-foreground">View reviewer →</Link>
      )}
    </div>
  );
}
