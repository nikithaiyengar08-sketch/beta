// Hooks that load real data from Lovable Cloud and adapt it to the shapes
// the existing UI components were using when they read from mock-data.ts.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Reader = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  archetype: string;
  followers: number;
};

export type CatalogBook = {
  id: string;
  title: string;
  author: string;
  cover: string; // direct image URL
  pages: number;
  genre: string;
  year: number;
  rating?: number;
};

const FALLBACK_AVATAR = (seed: string) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}`;

export function useReaders(opts: { excludeId?: string; limit?: number } = {}) {
  const { excludeId, limit = 50 } = opts;
  return useQuery({
    queryKey: ["readers", excludeId, limit],
    queryFn: async (): Promise<Reader[]> => {
      let q = supabase
        .from("profiles")
        .select(
          "id, display_name, username, bio, archetype, avatar_url, follower_count"
        )
        .order("follower_count", { ascending: false })
        .limit(limit);
      if (excludeId) q = q.neq("id", excludeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((p) => {
        const name =
          p.display_name ?? p.username ?? p.id.slice(0, 6);
        return {
          id: p.id,
          name,
          handle: p.username ? `@${p.username}` : `@${p.id.slice(0, 6)}`,
          avatar: p.avatar_url ?? FALLBACK_AVATAR(name),
          bio: p.bio ?? "",
          archetype: p.archetype ?? "Reader",
          followers: p.follower_count ?? 0,
        };
      });
    },
    staleTime: 60_000,
  });
}

export function useBooks(opts: { genre?: string; limit?: number } = {}) {
  const { genre, limit = 40 } = opts;
  return useQuery({
    queryKey: ["books", genre, limit],
    queryFn: async (): Promise<CatalogBook[]> => {
      let q = supabase
        .from("books")
        .select(
          "id, title, author, cover_url, page_count, genres, published_year, ratings_average"
        )
        .order("created_at", { ascending: false })
        .limit(limit);
      if (genre) q = q.contains("genres", [genre]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author ?? "Unknown",
        cover:
          b.cover_url ??
          `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(b.title)}`,
        pages: b.page_count ?? 0,
        genre: (b.genres && b.genres[0]) ?? "Fiction",
        year: b.published_year ?? new Date().getFullYear(),
        rating: b.ratings_average ? Number(b.ratings_average) : undefined,
      }));
    },
    staleTime: 60_000,
  });
}
