-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT, username TEXT UNIQUE, bio TEXT, archetype TEXT,
  avatar_url TEXT, cover_image_url TEXT, onboarding_done BOOLEAN DEFAULT false,
  follower_count INT NOT NULL DEFAULT 0, following_count INT NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false, website TEXT, location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE INDEX profiles_username_lower_idx ON public.profiles (lower(username));

DO $$ BEGIN CREATE TYPE public.subscription_tier AS ENUM ('free','premium'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.profiles ADD COLUMN subscription_tier public.subscription_tier NOT NULL DEFAULT 'free';
CREATE OR REPLACE FUNCTION public.has_premium(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND subscription_tier = 'premium');
$f$;
GRANT EXECUTE ON FUNCTION public.has_premium(uuid) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- BOOKS
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ol_id TEXT UNIQUE, google_books_id TEXT, title TEXT NOT NULL, author TEXT,
  cover_url TEXT, isbn TEXT, description TEXT, page_count INT, genres TEXT[],
  published_year INT, ratings_average NUMERIC, ratings_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.books TO authenticated;
GRANT SELECT ON public.books TO anon;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Books viewable by all" ON public.books FOR SELECT USING (true);
CREATE POLICY "Auth insert books" ON public.books FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.user_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('reading','read','want','dnf','favorites')),
  rating INT DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  progress_page INT DEFAULT 0, started_at DATE, finished_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_books TO authenticated;
GRANT SELECT ON public.user_books TO anon;
GRANT ALL ON public.user_books TO service_role;
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_books readable" ON public.user_books FOR SELECT USING (true);
CREATE POLICY "Users insert own ub" ON public.user_books FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ub" ON public.user_books FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own ub" ON public.user_books FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_user_books_user_status ON public.user_books(user_id, status);

CREATE OR REPLACE FUNCTION public.handle_user_book_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'reading' AND OLD.status IS DISTINCT FROM 'reading' AND NEW.started_at IS NULL THEN NEW.started_at := CURRENT_DATE; END IF;
  IF NEW.status = 'read' AND OLD.status IS DISTINCT FROM 'read' AND NEW.finished_at IS NULL THEN NEW.finished_at := CURRENT_DATE; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_user_book_status_change BEFORE UPDATE ON public.user_books FOR EACH ROW EXECUTE FUNCTION public.handle_user_book_status();

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  stars INT CHECK (stars BETWEEN 1 AND 5),
  headline TEXT, body TEXT, mood_tags TEXT[], favorite_quote TEXT,
  visibility TEXT CHECK (visibility IN ('public','friends','private')) DEFAULT 'public',
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public or own" ON public.reviews FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);
CREATE POLICY "Users insert own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  text TEXT NOT NULL, author TEXT, book_title TEXT,
  save_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.quotes TO authenticated;
GRANT SELECT ON public.quotes TO anon;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quotes viewable" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "Auth insert quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update save_count" ON public.quotes FOR UPDATE TO authenticated USING (true);

CREATE TABLE public.saved_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quote_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_quotes TO authenticated;
GRANT ALL ON public.saved_quotes TO service_role;
ALTER TABLE public.saved_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users sq select" ON public.saved_quotes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users sq insert" ON public.saved_quotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users sq delete" ON public.saved_quotes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.reading_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT,
  is_public BOOLEAN DEFAULT true, cover_book_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_lists TO authenticated;
GRANT SELECT ON public.reading_lists TO anon;
GRANT ALL ON public.reading_lists TO service_role;
ALTER TABLE public.reading_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public lists or own" ON public.reading_lists FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users insert own list" ON public.reading_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own list" ON public.reading_lists FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own list" ON public.reading_lists FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.list_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.reading_lists(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(), sort_order INT,
  UNIQUE(list_id, book_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.list_books TO authenticated;
GRANT SELECT ON public.list_books TO anon;
GRANT ALL ON public.list_books TO service_role;
ALTER TABLE public.list_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "list_books viewable" ON public.list_books FOR SELECT USING (true);
CREATE POLICY "Owners insert lb" ON public.list_books FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.reading_lists rl WHERE rl.id = list_id AND rl.user_id = auth.uid()));
CREATE POLICY "Owners update lb" ON public.list_books FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.reading_lists rl WHERE rl.id = list_id AND rl.user_id = auth.uid()));
CREATE POLICY "Owners delete lb" ON public.list_books FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.reading_lists rl WHERE rl.id = list_id AND rl.user_id = auth.uid()));

CREATE TABLE public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.search_logs TO authenticated;
GRANT SELECT ON public.search_logs TO anon;
GRANT ALL ON public.search_logs TO service_role;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_logs viewable" ON public.search_logs FOR SELECT USING (true);
CREATE POLICY "Auth insert search_logs" ON public.search_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT ON public.follows TO anon;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows viewable" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users insert own follow" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users delete own follow" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);
CREATE INDEX idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX idx_follows_following_id ON public.follows(following_id);

CREATE TABLE public.saved_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES public.reading_lists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, list_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_lists TO authenticated;
GRANT ALL ON public.saved_lists TO service_role;
ALTER TABLE public.saved_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users sl select" ON public.saved_lists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users sl insert" ON public.saved_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users sl delete" ON public.saved_lists FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pace_pages_per_week INT,
  status TEXT CHECK (status IN ('active','finished','paused')) DEFAULT 'active',
  invite_code TEXT UNIQUE DEFAULT substring(gen_random_uuid()::text, 1, 8),
  description TEXT, is_public BOOLEAN NOT NULL DEFAULT true,
  genre TEXT, cover_image_url TEXT, topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT SELECT ON public.rooms TO anon;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE INDEX rooms_public_idx ON public.rooms(is_public, created_at DESC);
CREATE INDEX rooms_genre_idx ON public.rooms(genre) WHERE is_public;

CREATE TABLE public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_page INT DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','moderator','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_members TO authenticated;
GRANT ALL ON public.room_members TO service_role;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_room_member(_room_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_members WHERE room_id = _room_id AND user_id = _user_id);
$$;
REVOKE EXECUTE ON FUNCTION public.is_room_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_room_member(UUID, UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_room_mod(_room_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_members WHERE room_id = _room_id AND user_id = _user_id AND role IN ('owner','moderator'));
$$;
REVOKE EXECUTE ON FUNCTION public.is_room_mod(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_room_mod(UUID, UUID) TO anon, authenticated, service_role;

CREATE POLICY "Rooms member or public" ON public.rooms FOR SELECT USING (is_public = true OR public.is_room_member(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Auth create room" ON public.rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator update room" ON public.rooms FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creator delete room" ON public.rooms FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Members or public members visible" ON public.room_members FOR SELECT USING (public.is_room_member(room_id, auth.uid()) OR user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.is_public));
CREATE POLICY "Users join rooms" ON public.room_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Self or mod update membership" ON public.room_members FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_room_mod(room_id, auth.uid()));
CREATE POLICY "Self or mod remove" ON public.room_members FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_room_mod(room_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_room()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.room_members (room_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (room_id, user_id) DO UPDATE SET role = 'owner';
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_room() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_room_created AFTER INSERT ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.handle_new_room();

CREATE TABLE public.room_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number INT, text TEXT NOT NULL, reaction TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_highlights TO authenticated;
GRANT ALL ON public.room_highlights TO service_role;
ALTER TABLE public.room_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rh visible to members" ON public.room_highlights FOR SELECT USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "Members post rh" ON public.room_highlights FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_room_member(room_id, auth.uid()));
CREATE POLICY "Users delete own rh" ON public.room_highlights FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.room_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id UUID NOT NULL REFERENCES public.room_highlights(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(highlight_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.room_reactions TO authenticated;
GRANT ALL ON public.room_reactions TO service_role;
ALTER TABLE public.room_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr visible to members" ON public.room_reactions FOR SELECT USING (EXISTS (SELECT 1 FROM public.room_highlights rh WHERE rh.id = highlight_id AND public.is_room_member(rh.room_id, auth.uid())));
CREATE POLICY "Members react" ON public.room_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own rr" ON public.room_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  reply_to_id UUID REFERENCES public.room_messages(id) ON DELETE SET NULL,
  pinned_at TIMESTAMPTZ, pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX room_messages_room_idx ON public.room_messages(room_id, created_at DESC);
CREATE INDEX room_messages_thread_idx ON public.room_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX room_messages_pinned_idx ON public.room_messages(room_id, pinned_at DESC) WHERE pinned_at IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_messages TO authenticated;
GRANT ALL ON public.room_messages TO service_role;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rm visible to members" ON public.room_messages FOR SELECT USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "Members send rm" ON public.room_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_room_member(room_id, auth.uid()));
CREATE POLICY "Author or mod edits rm" ON public.room_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_room_mod(room_id, auth.uid()));
CREATE POLICY "Author or mod deletes rm" ON public.room_messages FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_room_mod(room_id, auth.uid()));

CREATE TABLE public.room_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.room_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (length(emoji) BETWEEN 1 AND 16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
CREATE INDEX rmr_msg_idx ON public.room_message_reactions(message_id);
GRANT SELECT, INSERT, DELETE ON public.room_message_reactions TO authenticated;
GRANT ALL ON public.room_message_reactions TO service_role;
ALTER TABLE public.room_message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rmr visible to members" ON public.room_message_reactions FOR SELECT USING (EXISTS (SELECT 1 FROM public.room_messages m WHERE m.id = message_id AND public.is_room_member(m.room_id, auth.uid())));
CREATE POLICY "Members react rm" ON public.room_message_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own rmr" ON public.room_message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.room_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('reading_session','live_discussion','reading_sprint','book_club','weekly_discussion')),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description TEXT, starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 60, location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX room_events_room_idx ON public.room_events(room_id, starts_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_events TO authenticated;
GRANT ALL ON public.room_events TO service_role;
ALTER TABLE public.room_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "re visible to members" ON public.room_events FOR SELECT USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "Members create re" ON public.room_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND public.is_room_member(room_id, auth.uid()));
CREATE POLICY "Creator or mod update re" ON public.room_events FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_room_mod(room_id, auth.uid()));
CREATE POLICY "Creator or mod delete re" ON public.room_events FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.is_room_mod(room_id, auth.uid()));

CREATE TABLE public.room_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.room_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going','maybe','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
CREATE INDEX rsvps_event_idx ON public.room_event_rsvps(event_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_event_rsvps TO authenticated;
GRANT ALL ON public.room_event_rsvps TO service_role;
ALTER TABLE public.room_event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rsvp visible" ON public.room_event_rsvps FOR SELECT USING (EXISTS (SELECT 1 FROM public.room_events e WHERE e.id = event_id AND public.is_room_member(e.room_id, auth.uid())));
CREATE POLICY "Members insert rsvp" ON public.room_event_rsvps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members update rsvp" ON public.room_event_rsvps FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members delete rsvp" ON public.room_event_rsvps FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.room_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('books_count','pages_count','genre_focus','custom')),
  target_value INT, target_genre TEXT,
  starts_on DATE NOT NULL DEFAULT CURRENT_DATE, ends_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX challenges_room_idx ON public.room_challenges(room_id, starts_on DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_challenges TO authenticated;
GRANT ALL ON public.room_challenges TO service_role;
ALTER TABLE public.room_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rc visible members" ON public.room_challenges FOR SELECT USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "Mods create rc" ON public.room_challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND public.is_room_mod(room_id, auth.uid()));
CREATE POLICY "Mods update rc" ON public.room_challenges FOR UPDATE TO authenticated USING (public.is_room_mod(room_id, auth.uid()));
CREATE POLICY "Mods delete rc" ON public.room_challenges FOR DELETE TO authenticated USING (public.is_room_mod(room_id, auth.uid()));

CREATE TABLE public.room_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.room_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress_value INT NOT NULL DEFAULT 0, completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_challenge_progress TO authenticated;
GRANT ALL ON public.room_challenge_progress TO service_role;
ALTER TABLE public.room_challenge_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rcp visible members" ON public.room_challenge_progress FOR SELECT USING (EXISTS (SELECT 1 FROM public.room_challenges c WHERE c.id = challenge_id AND public.is_room_member(c.room_id, auth.uid())));
CREATE POLICY "Users insert own rcp" ON public.room_challenge_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own rcp" ON public.room_challenge_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE VIEW public.room_leaderboard WITH (security_invoker = true) AS
SELECT rm.room_id, rm.user_id,
  COALESCE(p.display_name, p.username) AS display_name,
  p.username, p.avatar_url, rm.current_page, rm.role,
  (SELECT COUNT(*) FROM public.room_messages m WHERE m.room_id = rm.room_id AND m.user_id = rm.user_id AND m.deleted_at IS NULL) AS messages_count,
  (SELECT COUNT(*) FROM public.room_highlights h WHERE h.room_id = rm.room_id AND h.user_id = rm.user_id) AS highlights_count
FROM public.room_members rm
LEFT JOIN public.profiles p ON p.id = rm.user_id;
GRANT SELECT ON public.room_leaderboard TO authenticated, anon, service_role;

CREATE TABLE public.activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('started_reading','finished_book','wrote_review','saved_quote','joined_room','posted_highlight','followed_user')),
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity TO authenticated;
GRANT ALL ON public.activity TO service_role;
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity self or followed" ON public.activity FOR SELECT USING (actor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = actor_id));
CREATE POLICY "Users insert own activity" ON public.activity FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);

CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('review','quote','activity','comment')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
CREATE INDEX likes_target_idx ON public.likes (target_type, target_id);
CREATE INDEX likes_user_idx ON public.likes (user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT SELECT ON public.likes TO anon;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes insert self" ON public.likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "likes delete self" ON public.likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('review','quote','activity')),
  target_id UUID NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  mentions UUID[] NOT NULL DEFAULT '{}',
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_target_idx ON public.comments (target_type, target_id, created_at);
CREATE INDEX comments_user_idx ON public.comments (user_id, created_at DESC);
CREATE INDEX comments_parent_idx ON public.comments (parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments readable" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments insert self" ON public.comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments update self" ON public.comments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments delete self" ON public.comments FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('follow','like_review','like_quote','like_activity','comment_review','comment_quote','comment_activity','comment_reply','mention','room_invite','room_event','room_message','milestone','recommendation','compatibility_match','dna_insight')),
  target_type TEXT, target_id UUID,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  meta JSONB, read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id) WHERE read_at IS NULL;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif select self" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif update self" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif delete self" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_follow_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    INSERT INTO public.notifications (user_id, actor_id, type) VALUES (NEW.following_id, NEW.follower_id, 'follow');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.following_id;
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_follow_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_follow_change AFTER INSERT OR DELETE ON public.follows FOR EACH ROW EXECUTE FUNCTION public.handle_follow_change();

CREATE OR REPLACE FUNCTION public.handle_like_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; notif_type TEXT;
BEGIN
  IF NEW.target_type = 'review' THEN SELECT user_id INTO owner_id FROM public.reviews WHERE id = NEW.target_id; notif_type := 'like_review';
  ELSIF NEW.target_type = 'quote' THEN SELECT user_id INTO owner_id FROM public.quotes WHERE id = NEW.target_id; notif_type := 'like_quote';
  ELSIF NEW.target_type = 'activity' THEN SELECT actor_id INTO owner_id FROM public.activity WHERE id = NEW.target_id; notif_type := 'like_activity';
  END IF;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, target_type, target_id) VALUES (owner_id, NEW.user_id, notif_type, NEW.target_type, NEW.target_id);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_like_insert() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_like_insert AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION public.handle_like_insert();

CREATE OR REPLACE FUNCTION public.handle_comment_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; parent_user_id UUID; notif_type TEXT; mention_id UUID;
BEGIN
  IF NEW.target_type = 'review' THEN SELECT user_id INTO owner_id FROM public.reviews WHERE id = NEW.target_id; notif_type := 'comment_review';
  ELSIF NEW.target_type = 'quote' THEN SELECT user_id INTO owner_id FROM public.quotes WHERE id = NEW.target_id; notif_type := 'comment_quote';
  ELSIF NEW.target_type = 'activity' THEN SELECT actor_id INTO owner_id FROM public.activity WHERE id = NEW.target_id; notif_type := 'comment_activity';
  END IF;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, target_type, target_id, meta) VALUES (owner_id, NEW.user_id, notif_type, NEW.target_type, NEW.target_id, jsonb_build_object('comment_id', NEW.id));
  END IF;
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_user_id FROM public.comments WHERE id = NEW.parent_id;
    IF parent_user_id IS NOT NULL AND parent_user_id <> NEW.user_id AND parent_user_id IS DISTINCT FROM owner_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, target_type, target_id, meta) VALUES (parent_user_id, NEW.user_id, 'comment_reply', NEW.target_type, NEW.target_id, jsonb_build_object('comment_id', NEW.id, 'parent_id', NEW.parent_id));
    END IF;
  END IF;
  IF NEW.mentions IS NOT NULL THEN
    FOREACH mention_id IN ARRAY NEW.mentions LOOP
      IF mention_id <> NEW.user_id THEN
        INSERT INTO public.notifications (user_id, actor_id, type, target_type, target_id, meta) VALUES (mention_id, NEW.user_id, 'mention', NEW.target_type, NEW.target_id, jsonb_build_object('comment_id', NEW.id));
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_comment_insert() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_comment_insert AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_comment_insert();

CREATE VIEW public.feed_activity WITH (security_invoker = true) AS
SELECT a.*, p.username, p.display_name, p.avatar_url, b.title AS book_title, b.cover_url AS book_cover, b.author AS book_author
FROM public.activity a
LEFT JOIN public.profiles p ON p.id = a.actor_id
LEFT JOIN public.books b ON b.id = a.book_id;
GRANT SELECT ON public.feed_activity TO authenticated, anon;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_books; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.follows; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reading_lists; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.list_books; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_highlights; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_reactions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_message_reactions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_events; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_event_rsvps; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_challenges; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_challenge_progress; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.activity; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.likes; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.comments; EXCEPTION WHEN duplicate_object THEN NULL; END $$;