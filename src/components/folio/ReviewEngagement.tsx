import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useReviewLikes, useSavedReviews, useFollows, useComments } from "@/lib/engagement";
import { Button } from "@/components/ui/button";

type Props = {
  reviewId: string;
  reviewerId: string;
  reviewerName: string;
  baseLikes?: number;
  shareUrl?: string;
};

// Drop-in engagement strip for any review card. Likes / comments / save /
// share / follow are all local-first so it works without new tables, and
// each helper has the same shape as a future Supabase call.
export function ReviewEngagement({ reviewId, reviewerId, reviewerName, baseLikes = 0, shareUrl }: Props) {
  const { user, displayName } = useAuth();
  const uid = user?.id || "guest";
  const likes = useReviewLikes(uid);
  const saved = useSavedReviews(uid);
  const follows = useFollows(uid);
  const comments = useComments(uid, reviewId);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const share = async () => {
    const url = shareUrl || `${window.location.origin}${window.location.pathname}#review-${reviewId}`;
    try {
      if (navigator.share) await navigator.share({ url, title: `${reviewerName} on Folio` });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* dismissed */ }
  };

  const post = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    comments.add(displayName || "Reader", t);
    setText("");
  };

  const isMe = uid === reviewerId;
  const liked = likes.isLiked(reviewId);
  const sv = saved.isSaved(reviewId);
  const fl = follows.isFollowing(reviewerId);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => likes.toggle(reviewId)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 min-h-9 border ${liked ? "border-rose text-rose bg-rose/10" : "border-border text-foreground/70 hover:text-foreground"}`}
          aria-pressed={liked}
        >
          {liked ? "♥" : "♡"} {likes.count(reviewId, baseLikes)}
        </button>
        <button
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 min-h-9 border border-border text-foreground/70 hover:text-foreground"
        >
          💬 {comments.items.length}
        </button>
        <button
          onClick={() => { saved.toggle(reviewId); toast.success(sv ? "Removed from saved" : "Saved to your collection"); }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 min-h-9 border ${sv ? "border-gold text-gold bg-gold/10" : "border-border text-foreground/70 hover:text-foreground"}`}
        >
          {sv ? "★ Saved" : "☆ Save"}
        </button>
        <button
          onClick={share}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 min-h-9 border border-border text-foreground/70 hover:text-foreground"
        >
          ↗ Share
        </button>
        {!isMe && (
          <button
            onClick={() => { follows.toggle(reviewerId); toast.success(fl ? `Unfollowed ${reviewerName}` : `Following ${reviewerName}`); }}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 min-h-9 ${fl ? "border border-border text-foreground/70" : "bg-foreground text-background"}`}
          >
            {fl ? "Following" : "+ Follow"}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-xl border border-border bg-card/50 p-3">
          {comments.items.length === 0 ? (
            <p className="text-xs text-foreground/60">Be the first to reply.</p>
          ) : (
            <ul className="space-y-2.5">
              {comments.items.map(c => (
                <li key={c.id} className="text-sm">
                  <span className="font-serif">{c.author}</span>
                  <span className="text-foreground/80"> · {c.text}</span>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={post} className="mt-3 flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Add a thought…"
              className="flex-1 rounded-full bg-background border border-border px-4 py-2 text-sm"
              maxLength={500}
            />
            <Button type="submit" size="sm">Post</Button>
          </form>
        </div>
      )}
    </div>
  );
}
