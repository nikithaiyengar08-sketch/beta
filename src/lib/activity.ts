import { supabase } from "@/integrations/supabase/client";

export type ActivityType =
  | "started_reading"
  | "finished_book"
  | "wrote_review"
  | "saved_quote"
  | "joined_room"
  | "posted_highlight"
  | "followed_user";

/**
 * Best-effort activity log. Swallows errors so failure never blocks the
 * primary user action. The `activity` table is created by the rooms /
 * activity migration — if it isn't applied yet, calls become no-ops.
 */
export async function logActivity(input: {
  type: ActivityType;
  book_id?: string | null;
  room_id?: string | null;
  target_user_id?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const actor_id = auth.user?.id;
    if (!actor_id) return;
    await (supabase as any).from("activity").insert({
      actor_id,
      type: input.type,
      book_id: input.book_id ?? null,
      room_id: input.room_id ?? null,
      target_user_id: input.target_user_id ?? null,
      meta: input.meta ?? null,
    });
  } catch {
    /* ignore */
  }
}