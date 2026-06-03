// Local-first engagement state (likes, saves, follows, comments, RSVPs, poll votes).
// All keyed by current user id so multiple accounts on one device don't bleed state.
// Swap each helper to a `supabase.from(...)` call when the relevant tables exist;
// the public hook API does not change.
import { useEffect, useState, useCallback } from "react";

type Bucket = "review_like" | "review_save" | "follow" | "comment" | "poll" | "rsvp" | "checkpoint";

function key(uid: string, bucket: Bucket) {
  return `folio:eng:${uid || "guest"}:${bucket}`;
}

function read<T>(uid: string, bucket: Bucket, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key(uid, bucket));
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(uid: string, bucket: Bucket, val: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key(uid, bucket), JSON.stringify(val)); } catch {}
  window.dispatchEvent(new CustomEvent("folio:eng", { detail: { bucket } }));
}

function useBucket<T>(uid: string, bucket: Bucket, fallback: T): [T, (v: T) => void] {
  const [state, setState] = useState<T>(fallback);
  useEffect(() => {
    setState(read<T>(uid, bucket, fallback));
    const on = (e: Event) => {
      if ((e as CustomEvent).detail?.bucket === bucket) setState(read<T>(uid, bucket, fallback));
    };
    window.addEventListener("folio:eng", on);
    return () => window.removeEventListener("folio:eng", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, bucket]);
  const set = useCallback((v: T) => { write(uid, bucket, v); setState(v); }, [uid, bucket]);
  return [state, set];
}

// ---------- Likes on reviews ----------
export function useReviewLikes(uid: string) {
  const [set, setSet] = useBucket<string[]>(uid, "review_like", []);
  return {
    isLiked: (id: string) => set.includes(id),
    toggle: (id: string) => setSet(set.includes(id) ? set.filter(x => x !== id) : [...set, id]),
    count: (id: string, base = 0) => base + (set.includes(id) ? 1 : 0),
  };
}

// ---------- Saved reviews ----------
export function useSavedReviews(uid: string) {
  const [set, setSet] = useBucket<string[]>(uid, "review_save", []);
  return {
    isSaved: (id: string) => set.includes(id),
    toggle: (id: string) => setSet(set.includes(id) ? set.filter(x => x !== id) : [...set, id]),
    all: set,
  };
}

// ---------- Follows ----------
export function useFollows(uid: string) {
  const [set, setSet] = useBucket<string[]>(uid, "follow", []);
  return {
    isFollowing: (id: string) => set.includes(id),
    toggle: (id: string) => setSet(set.includes(id) ? set.filter(x => x !== id) : [...set, id]),
    all: set,
  };
}

// ---------- Comments ----------
export type LocalComment = { id: string; targetId: string; author: string; text: string; ts: number };
export function useComments(uid: string, targetId: string) {
  const [all, setAll] = useBucket<LocalComment[]>(uid, "comment", []);
  const items = all.filter(c => c.targetId === targetId).sort((a, b) => a.ts - b.ts);
  return {
    items,
    add: (author: string, text: string) =>
      setAll([...all, { id: Math.random().toString(36).slice(2), targetId, author, text, ts: Date.now() }]),
    remove: (id: string) => setAll(all.filter(c => c.id !== id)),
  };
}

// ---------- Poll votes ----------
export function usePollVotes(uid: string) {
  const [map, setMap] = useBucket<Record<string, string>>(uid, "poll", {});
  return {
    voteFor: (pollId: string) => map[pollId],
    vote: (pollId: string, optionId: string) => setMap({ ...map, [pollId]: optionId }),
  };
}

// ---------- Event RSVPs ----------
export function useRsvps(uid: string) {
  const [set, setSet] = useBucket<string[]>(uid, "rsvp", []);
  return {
    isGoing: (id: string) => set.includes(id),
    toggle: (id: string) => setSet(set.includes(id) ? set.filter(x => x !== id) : [...set, id]),
  };
}

// ---------- Chapter checkpoints ----------
export type CheckpointDone = { roomId: string; chapter: number; ts: number };
export function useCheckpoints(uid: string, roomId: string) {
  const [all, setAll] = useBucket<CheckpointDone[]>(uid, "checkpoint", []);
  const mine = all.filter(c => c.roomId === roomId).map(c => c.chapter);
  return {
    isDone: (chapter: number) => mine.includes(chapter),
    toggle: (chapter: number) =>
      mine.includes(chapter)
        ? setAll(all.filter(c => !(c.roomId === roomId && c.chapter === chapter)))
        : setAll([...all, { roomId, chapter, ts: Date.now() }]),
    progress: (total: number) => (total ? Math.round((mine.length / total) * 100) : 0),
  };
}
