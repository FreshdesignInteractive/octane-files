-- Octane Files — current schema (reference / from-scratch recreate)
-- Reflects the live schema as of the makes/models/generations migration
-- (Steps 1–11): normalized car taxonomy, is_admin()-based admin identity,
-- enum-backed controlled vocabularies, and enrichment fields. Run in the
-- Supabase SQL editor to recreate from scratch — not a literal record of
-- the incremental migration steps that got here (those live in imports/
-- as step1..step11 SQL files, gitignored, not part of this reference).

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Mirrors auth.users; auto-created on signup via trigger below
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  location      TEXT,
  website       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read"  ON profiles FOR SELECT USING (true);
CREATE POLICY "Owner update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'preferred_username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Admin identity ───────────────────────────────────────────────────────────
-- Single source of truth for "who is an admin" — not a hardcoded email
-- anywhere in policies or app code. Seeded as data (looked up from
-- auth.users by email), never a literal in policy logic. App code calls
-- is_admin() via supabase.rpc('is_admin') (lib/is-admin.ts) rather than
-- duplicating this check.
CREATE TABLE IF NOT EXISTS admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON admins TO service_role;
-- No other grants, no policies — admin rows are seeded directly via SQL,
-- never through the app or the REST API.

CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid());
$$;

-- ─── Controlled vocabularies ──────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE car_class AS ENUM ('exotic','grand_tourer','luxury','muscle','off_road','sports','vintage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE drivetrain_type AS ENUM ('RWD','FWD','AWD','4WD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE body_style_type AS ENUM
    ('Sedan','Coupe','Convertible','Wagon','Hatchback','Liftback','Roadster','Spider','Targa','Pickup','SUV','Coupe Utility','Fastback');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE engine_layout_type AS ENUM ('Front-engine','Front-mid-engine','Mid-engine','Rear-engine');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE desirability_tier_type AS ENUM ('Blue-chip','High','Solid','Entry');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE value_trajectory_type AS ENUM ('appreciating','stable','cooling');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Makes / Models / Generations / Trims ────────────────────────────────────
-- The normalized car taxonomy. Public URLs are generations.slug (flat
-- /cars/[slug], preserved from the pre-normalization schema for SEO/inbound
-- links) — never a nested /make/model/generation route.
CREATE TABLE IF NOT EXISTS makes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT UNIQUE NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  country    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS models (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id    UUID NOT NULL REFERENCES makes(id) ON DELETE RESTRICT,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (make_id, name)
);

CREATE TABLE IF NOT EXISTS generations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id            UUID NOT NULL REFERENCES models(id) ON DELETE RESTRICT,
  code                TEXT NOT NULL,
  production_years    TEXT,
  year_start          INTEGER NOT NULL,
  year_end            INTEGER,
  class               car_class NOT NULL,
  is_icon             BOOLEAN NOT NULL DEFAULT FALSE,
  -- Free text by design, not enums: engine_layout and desirability_tier ARE
  -- enums (below); these two carry nuance an enum can't and aren't filtered on.
  desirability_tier         desirability_tier_type,
  desirability_tier_legacy  TEXT, -- pre-enum compound strings not yet remapped to a headline tier; read-only reference, never form-editable
  nickname            TEXT,
  overview            TEXT,
  why_collectible     TEXT,
  engine_signature    TEXT,
  variants_to_know    TEXT,
  known_issues        TEXT,
  claim_to_fame       TEXT,
  buyers_flag         TEXT,
  rivals_alternatives TEXT,
  designer            TEXT,
  body_styles         body_style_type[] DEFAULT '{}',
  drivetrain          drivetrain_type[] DEFAULT '{}',
  engine_layout       engine_layout_type,
  units_produced      INTEGER,
  hero_image          TEXT,
  gallery_images      TEXT[] DEFAULT '{}',
  wikipedia_url       TEXT,
  specs               JSONB DEFAULT '[]',
  market_data         JSONB,
  maintenance         TEXT,
  resources           JSONB DEFAULT '[]',
  radar_scores        JSONB, -- up to 7 keys (desirability/rarity/driving_thrill/investment_trajectory/usability/restoration_difficulty/cultural_impact), 1-10 each
  analog_index        INTEGER CHECK (analog_index BETWEEN 1 AND 10),
  homologation_special BOOLEAN NOT NULL DEFAULT FALSE,
  poster_car          BOOLEAN NOT NULL DEFAULT FALSE,
  value_trajectory    value_trajectory_type,
  firsts_and_lasts    TEXT,
  driving_character   TEXT,
  design_notes        TEXT,
  cultural_notes      TEXT,
  related_cars        TEXT,
  motorsport_pedigree TEXT,
  slug                TEXT UNIQUE NOT NULL,
  search_vector       TSVECTOR,
  archived_at         TIMESTAMPTZ, -- soft-delete: archived cars are hidden from public queries, never hard-deleted except a rare confirmed-duplicate cleanup
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (model_id, code)
);

CREATE TABLE IF NOT EXISTS trims (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id    UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  years            TEXT,
  description      TEXT,
  production_notes TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (generation_id, name)
);

CREATE INDEX IF NOT EXISTS generations_class_idx ON generations (class);
CREATE INDEX IF NOT EXISTS generations_year_start_idx ON generations (year_start);
CREATE INDEX IF NOT EXISTS generations_model_idx ON generations (model_id);
CREATE INDEX IF NOT EXISTS models_make_idx ON models (make_id);
CREATE INDEX IF NOT EXISTS makes_country_idx ON makes (country);
CREATE INDEX IF NOT EXISTS generations_body_styles_gin_idx ON generations USING GIN (body_styles);
CREATE INDEX IF NOT EXISTS generations_drivetrain_gin_idx ON generations USING GIN (drivetrain);
CREATE INDEX IF NOT EXISTS generations_search_vector_idx ON generations USING GIN (search_vector);

-- Search — make/model/code folded in, kept fresh on rename
CREATE OR REPLACE FUNCTION generations_search_vector_update() RETURNS trigger AS $$
DECLARE
  v_make TEXT;
  v_model TEXT;
BEGIN
  SELECT mk.name, md.name INTO v_make, v_model
  FROM models md JOIN makes mk ON mk.id = md.make_id
  WHERE md.id = NEW.model_id;

  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(v_make, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(v_model, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.code, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.nickname, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.overview, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.why_collectible, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generations_search_vector_trigger ON generations;
CREATE TRIGGER generations_search_vector_trigger
  BEFORE INSERT OR UPDATE ON generations
  FOR EACH ROW EXECUTE FUNCTION generations_search_vector_update();

CREATE OR REPLACE FUNCTION reindex_generations_on_model_rename() RETURNS trigger AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE generations SET updated_at = NOW() WHERE model_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS models_name_change_reindex ON models;
CREATE TRIGGER models_name_change_reindex
  AFTER UPDATE ON models
  FOR EACH ROW EXECUTE FUNCTION reindex_generations_on_model_rename();

CREATE OR REPLACE FUNCTION reindex_generations_on_make_rename() RETURNS trigger AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE generations g SET updated_at = NOW()
    FROM models m WHERE m.id = g.model_id AND m.make_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS makes_name_change_reindex ON makes;
CREATE TRIGGER makes_name_change_reindex
  AFTER UPDATE ON makes
  FOR EACH ROW EXECUTE FUNCTION reindex_generations_on_make_rename();

-- search_generations() — relevance-ranked search + filters + pagination in
-- one call, used by lib/supabase.ts's getModels() instead of a PostgREST
-- embed query (which can't do rank-ordering or reliably order on a
-- 2-level-nested embedded column).
CREATE OR REPLACE FUNCTION search_generations(
  search_query   TEXT DEFAULT NULL,
  filter_class   TEXT DEFAULT NULL,
  filter_country TEXT DEFAULT NULL,
  filter_make    TEXT DEFAULT NULL,
  result_limit   INT DEFAULT 24,
  result_offset  INT DEFAULT 0
)
RETURNS TABLE (
  id UUID, slug TEXT, code TEXT, year_start INT, year_end INT, class TEXT,
  hero_image TEXT, units_produced INT, make_name TEXT, model_name TEXT,
  country TEXT, total_count BIGINT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    g.id, g.slug, g.code, g.year_start, g.year_end, g.class::TEXT, g.hero_image, g.units_produced,
    mk.name, md.name, mk.country,
    count(*) OVER() AS total_count
  FROM generations g
  JOIN models md ON md.id = g.model_id
  JOIN makes mk ON mk.id = md.make_id
  WHERE g.archived_at IS NULL
    AND (filter_class   IS NULL OR g.class::TEXT = filter_class)
    AND (filter_country IS NULL OR mk.country = filter_country)
    AND (filter_make    IS NULL OR mk.name = filter_make)
    AND (search_query    IS NULL OR search_query = '' OR g.search_vector @@ websearch_to_tsquery('english', search_query))
  ORDER BY
    CASE WHEN search_query IS NOT NULL AND search_query != ''
      THEN ts_rank(g.search_vector, websearch_to_tsquery('english', search_query))
    END DESC NULLS LAST,
    g.year_start ASC
  LIMIT result_limit OFFSET result_offset;
$$;

GRANT EXECUTE ON FUNCTION search_generations(TEXT, TEXT, TEXT, TEXT, INT, INT) TO anon, authenticated;

-- RLS: public read, is_admin()-gated write on all four tables
ALTER TABLE makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON makes FOR SELECT USING (true);
CREATE POLICY "Public read" ON models FOR SELECT USING (true);
CREATE POLICY "Public read" ON generations FOR SELECT USING (true);
CREATE POLICY "Public read" ON trims FOR SELECT USING (true);

CREATE POLICY "Admin write" ON makes FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write" ON models FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write" ON generations FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write" ON trims FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Admin writes (the admin form) go through the signed-in admin's own
-- session, not a service-role bypass — this grant plus the RLS policy above
-- is what actually enforces it, in addition to the app-level checkIsAdmin().
GRANT SELECT ON makes, models, generations, trims TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON makes, models, generations, trims TO authenticated;

-- ─── Storage: car photos ──────────────────────────────────────────────────────
-- Public bucket (true public URLs, no signed-URL complexity) — browse-and-
-- upload for hero_image/gallery_images from the admin form
-- (components/ImageUploadField.tsx), direct browser-to-Storage upload on
-- the same authenticated client, RLS-gated the same way as the tables above.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('car-images', 'car-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/avif'])
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Public read car-images" ON storage.objects FOR SELECT USING (bucket_id = 'car-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admin insert car-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'car-images' AND is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admin update car-images" ON storage.objects FOR UPDATE USING (bucket_id = 'car-images' AND is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admin delete car-images" ON storage.objects FOR DELETE USING (bucket_id = 'car-images' AND is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── User Cars ────────────────────────────────────────────────────────────────
-- model_id references generations(id) — repointed here from the original
-- flat models(id) when the taxonomy was normalized (existing rows were
-- remapped by slug at that time, not just the constraint swapped).
CREATE TABLE IF NOT EXISTS user_cars (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model_id      UUID NOT NULL REFERENCES generations(id) ON DELETE RESTRICT,
  year          INTEGER NOT NULL,
  trim_variant  TEXT,
  color         TEXT,
  hero_image    TEXT,
  gallery_images TEXT[] DEFAULT '{}',
  story         TEXT,
  modifications TEXT,
  mileage       INTEGER,
  owned_since   INTEGER,
  is_published  BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_cars_owner_idx ON user_cars (owner_id);
CREATE INDEX IF NOT EXISTS user_cars_model_idx ON user_cars (model_id);

ALTER TABLE user_cars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published" ON user_cars FOR SELECT USING (is_published = true);
CREATE POLICY "Owner read own"        ON user_cars FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owner insert"          ON user_cars FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner update"          ON user_cars FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner delete"          ON user_cars FOR DELETE USING (auth.uid() = owner_id);

-- ─── Likes ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_car_id UUID NOT NULL REFERENCES user_cars(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, user_car_id)
);

CREATE INDEX IF NOT EXISTS likes_car_idx ON likes (user_car_id);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read"  ON likes FOR SELECT USING (true);
CREATE POLICY "Auth insert"  ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete" ON likes FOR DELETE USING (auth.uid() = user_id);

-- ─── Comments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_car_id UUID NOT NULL REFERENCES user_cars(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comments_car_idx ON comments (user_car_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read"  ON comments FOR SELECT USING (true);
CREATE POLICY "Auth insert"  ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Owner update" ON comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Owner delete" ON comments FOR DELETE USING (auth.uid() = author_id);

-- ─── Saved Models ("My Garage") ────────────────────────────────────────────
-- Private by design: unlike every other user-content table above, there is no
-- "Public read" policy here at all — saves are never visible to anyone but
-- their owner, enforced by omission (default-deny), not a `false` condition.
-- model_id references generations(id) — same repoint as user_cars above.
CREATE TABLE IF NOT EXISTS saved_models (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model_id    UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, model_id)
);

CREATE INDEX IF NOT EXISTS saved_models_user_idx  ON saved_models (user_id);
CREATE INDEX IF NOT EXISTS saved_models_model_idx ON saved_models (model_id);

ALTER TABLE saved_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read own" ON saved_models FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner insert"   ON saved_models FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete"   ON saved_models FOR DELETE USING (auth.uid() = user_id);

-- Unlike every table above, this one needed explicit GRANTs — without them,
-- both `authenticated` and `service_role` got "permission denied for table"
-- before RLS was ever evaluated (a table-level grant, separate from RLS).
-- No `anon` grant: no signed-out code path ever queries this table
-- (least privilege — nothing that never asks shouldn't be able to ask).
GRANT SELECT, INSERT, DELETE ON saved_models TO authenticated;
GRANT SELECT ON saved_models TO service_role;

-- ─── models_legacy ────────────────────────────────────────────────────────────
-- The original flat schema, frozen as a backup when the taxonomy was
-- normalized (renamed from `models`, never dropped). Not part of the live
-- application schema and not recreated by this file — kept in the live
-- database purely as a historical/audit reference, admin-write-only,
-- read by nothing in the app.
