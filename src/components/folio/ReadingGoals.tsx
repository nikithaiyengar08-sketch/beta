import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { LockedPreview } from "./LockedPreview";
import { usePremium } from "@/lib/premium";

/**
 * Reading goals + streaks card. Uses localStorage for the per-user goal target
 * and queries Supabase for finished books this year. No new tables required.
 */
export function ReadingGoals() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [target, setTarget] = useState<number>(() => {
    if (typeof window === "undefined") return 24;
    return Number(localStorage.getItem("folio_goal_books") ?? 24);
  });
  const [finishedThisYear, setFinishedThisYear] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [editing, setEditing] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const start = new Date(year, 0, 1).toISOString();
      const { count } = await supabase
        .from("user_books")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "read")
        .gte("updated_at", start);
      setFinishedThisYear(count ?? 0);

      // Streak: distinct days with activity in last 60 days
      const since = new Date(Date.now() - 60 * 86400000).toISOString();
      const { data } = await (supabase as any)
        .from("activity")
        .select("created_at")
        .eq("actor_id", user.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      const days = new Set<string>((data ?? []).map((r: any) => new Date(r.created_at).toDateString()));
      let streak = 0;
      const cur = new Date();
      while (days.has(cur.toDateString())) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      }
      setStreakDays(streak);
    })();
  }, [user?.id, year]);

  const pct = Math.min(100, Math.round((finishedThisYear / Math.max(1, target)) * 100));
  const milestones = [5, 12, 24, 50, 100].filter(m => finishedThisYear >= m);

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="font-serif text-2xl">Track your year</p>
        <p className="text-sm text-foreground/60 mt-1">Sign in to set goals, build streaks, and celebrate milestones.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-baseline justify-between">
          <p className="font-serif text-2xl">{year} Reading Goal</p>
          {editing ? (
            <input
              type="number"
              min={1}
              max={365}
              value={target}
              onChange={e => {
                const v = Math.max(1, Math.min(365, Number(e.target.value) || 1));
                setTarget(v);
                localStorage.setItem("folio_goal_books", String(v));
              }}
              onBlur={() => setEditing(false)}
              className="w-20 text-right text-sm bg-transparent border border-border rounded-md px-2 py-1"
              autoFocus
            />
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs text-foreground/60 hover:text-foreground underline">
              edit
            </button>
          )}
        </div>
        <p className="text-sm text-foreground/60 mt-1">
          <span className="text-foreground font-medium">{finishedThisYear}</span> of {target} books finished
        </p>
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-rose to-gold transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="font-serif text-3xl">{streakDays}</p>
            <p className="text-[11px] uppercase tracking-wider text-foreground/50 mt-0.5">Day streak</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="font-serif text-3xl">{milestones.length}</p>
            <p className="text-[11px] uppercase tracking-wider text-foreground/50 mt-0.5">Milestones</p>
          </div>
        </div>
        {milestones.length > 0 && (
          <p className="mt-3 text-xs text-foreground/60">
            🏆 Unlocked: {milestones.map(m => `${m} books`).join(" · ")}
          </p>
        )}
      </div>

      <LockedPreview
        isPremium={isPremium}
        title="See your Reader DNA"
        blurb="Your moods, genres, eras and pace — captured in a portrait that evolves with every book."
      >
        <div className="p-4">
          <p className="font-serif text-lg">Your Reader DNA</p>
          <p className="text-sm text-foreground/60 mt-1">Literary · Slow-burn · Translated · 20th century</p>
        </div>
      </LockedPreview>

      <div className="text-center">
        <Link to="/premium" className="text-xs text-foreground/60 hover:text-foreground underline">
          Compare Free vs Premium →
        </Link>
      </div>
    </div>
  );
}
