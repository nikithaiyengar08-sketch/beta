export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity: {
        Row: {
          actor_id: string
          book_id: string | null
          created_at: string
          id: string
          meta: Json | null
          room_id: string | null
          target_user_id: string | null
          type: string
        }
        Insert: {
          actor_id: string
          book_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          room_id?: string | null
          target_user_id?: string | null
          type: string
        }
        Update: {
          actor_id?: string
          book_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          room_id?: string | null
          target_user_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          genres: string[] | null
          google_books_id: string | null
          id: string
          isbn: string | null
          ol_id: string | null
          page_count: number | null
          published_year: number | null
          ratings_average: number | null
          ratings_count: number | null
          title: string
        }
        Insert: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          genres?: string[] | null
          google_books_id?: string | null
          id?: string
          isbn?: string | null
          ol_id?: string | null
          page_count?: number | null
          published_year?: number | null
          ratings_average?: number | null
          ratings_count?: number | null
          title: string
        }
        Update: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          genres?: string[] | null
          google_books_id?: string | null
          id?: string
          isbn?: string | null
          ol_id?: string | null
          page_count?: number | null
          published_year?: number | null
          ratings_average?: number | null
          ratings_count?: number | null
          title?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          edited_at: string | null
          id: string
          mentions: string[]
          parent_id: string | null
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          mentions?: string[]
          parent_id?: string | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          mentions?: string[]
          parent_id?: string | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      list_books: {
        Row: {
          added_at: string
          book_id: string
          id: string
          list_id: string
          sort_order: number | null
        }
        Insert: {
          added_at?: string
          book_id: string
          id?: string
          list_id: string
          sort_order?: number | null
        }
        Update: {
          added_at?: string
          book_id?: string
          id?: string
          list_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "list_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_books_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "reading_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          meta: Json | null
          read_at: string | null
          room_id: string | null
          target_id: string | null
          target_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          read_at?: string | null
          room_id?: string | null
          target_id?: string | null
          target_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          read_at?: string | null
          room_id?: string | null
          target_id?: string | null
          target_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          archetype: string | null
          avatar_url: string | null
          bio: string | null
          cover_image_url: string | null
          created_at: string
          display_name: string | null
          follower_count: number
          following_count: number
          id: string
          is_verified: boolean
          location: string | null
          onboarding_done: boolean | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          archetype?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number
          following_count?: number
          id: string
          is_verified?: boolean
          location?: string | null
          onboarding_done?: boolean | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          archetype?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number
          following_count?: number
          id?: string
          is_verified?: boolean
          location?: string | null
          onboarding_done?: boolean | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          author: string | null
          book_id: string | null
          book_title: string | null
          created_at: string
          id: string
          save_count: number | null
          text: string
          user_id: string | null
        }
        Insert: {
          author?: string | null
          book_id?: string | null
          book_title?: string | null
          created_at?: string
          id?: string
          save_count?: number | null
          text: string
          user_id?: string | null
        }
        Update: {
          author?: string | null
          book_id?: string | null
          book_title?: string | null
          created_at?: string
          id?: string
          save_count?: number | null
          text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_lists: {
        Row: {
          cover_book_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          cover_book_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          cover_book_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          book_id: string
          created_at: string
          favorite_quote: string | null
          headline: string | null
          id: string
          is_featured: boolean | null
          mood_tags: string[] | null
          stars: number | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          body?: string | null
          book_id: string
          created_at?: string
          favorite_quote?: string | null
          headline?: string | null
          id?: string
          is_featured?: boolean | null
          mood_tags?: string[] | null
          stars?: number | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          body?: string | null
          book_id?: string
          created_at?: string
          favorite_quote?: string | null
          headline?: string | null
          id?: string
          is_featured?: boolean | null
          mood_tags?: string[] | null
          stars?: number | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      room_challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          id: string
          progress_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          id?: string
          progress_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          id?: string
          progress_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "room_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      room_challenges: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          ends_on: string | null
          id: string
          kind: string
          room_id: string
          starts_on: string
          target_genre: string | null
          target_value: number | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          ends_on?: string | null
          id?: string
          kind: string
          room_id: string
          starts_on?: string
          target_genre?: string | null
          target_value?: number | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          ends_on?: string | null
          id?: string
          kind?: string
          room_id?: string
          starts_on?: string
          target_genre?: string | null
          target_value?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_challenges_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "room_events"
            referencedColumns: ["id"]
          },
        ]
      }
      room_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number | null
          id: string
          kind: string
          location: string | null
          room_id: string
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          kind: string
          location?: string | null
          room_id: string
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          kind?: string
          location?: string | null
          room_id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_highlights: {
        Row: {
          created_at: string
          id: string
          page_number: number | null
          reaction: string | null
          room_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_number?: number | null
          reaction?: string | null
          room_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_number?: number | null
          reaction?: string | null
          room_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_highlights_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_members: {
        Row: {
          current_page: number | null
          id: string
          joined_at: string
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          current_page?: number | null
          id?: string
          joined_at?: string
          role?: string
          room_id: string
          user_id: string
        }
        Update: {
          current_page?: number | null
          id?: string
          joined_at?: string
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "room_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      room_messages: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          edited_at: string | null
          id: string
          pinned_at: string | null
          pinned_by: string | null
          reply_to_id: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to_id?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to_id?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "room_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_reactions: {
        Row: {
          created_at: string
          emoji: string
          highlight_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          highlight_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          highlight_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_reactions_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "room_highlights"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          book_id: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          finished_at: string | null
          genre: string | null
          id: string
          invite_code: string | null
          is_public: boolean
          name: string
          pace_pages_per_week: number | null
          status: string | null
          topic: string | null
        }
        Insert: {
          book_id: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          finished_at?: string | null
          genre?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean
          name: string
          pace_pages_per_week?: number | null
          status?: string | null
          topic?: string | null
        }
        Update: {
          book_id?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          finished_at?: string | null
          genre?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean
          name?: string
          pace_pages_per_week?: number | null
          status?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_lists: {
        Row: {
          created_at: string
          id: string
          list_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_lists_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "reading_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_quotes: {
        Row: {
          created_at: string
          id: string
          quote_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quote_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quote_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_quotes_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      search_logs: {
        Row: {
          created_at: string
          id: string
          query: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
        }
        Relationships: []
      }
      user_books: {
        Row: {
          book_id: string
          created_at: string
          finished_at: string | null
          id: string
          progress_page: number | null
          rating: number | null
          started_at: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          progress_page?: number | null
          rating?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          progress_page?: number | null
          rating?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      feed_activity: {
        Row: {
          actor_id: string | null
          avatar_url: string | null
          book_author: string | null
          book_cover: string | null
          book_id: string | null
          book_title: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          meta: Json | null
          room_id: string | null
          target_user_id: string | null
          type: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_leaderboard: {
        Row: {
          avatar_url: string | null
          current_page: number | null
          display_name: string | null
          highlights_count: number | null
          messages_count: number | null
          role: string | null
          room_id: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_premium: { Args: { _user_id: string }; Returns: boolean }
      is_room_member: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_room_mod: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      subscription_tier: "free" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      subscription_tier: ["free", "premium"],
    },
  },
} as const
