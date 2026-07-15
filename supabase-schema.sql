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
  transmission        TEXT, -- step20: free text, not enum-able — inventory of ALL transmissions offered for the generation, e.g. "2-speed Powerglide automatic, 3-speed manual, 4-speed manual"
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
  units_produced_estimated BOOLEAN NOT NULL DEFAULT FALSE, -- step19: roundness alone can't say exact vs. approximate — this must be stated explicitly, drives "~15 million" vs "15,000,000" on the public page
  hero_image          TEXT,
  gallery_images      TEXT[] DEFAULT '{}',
  wikipedia_url       TEXT,
  specs               JSONB DEFAULT '[]',
  market_data         JSONB,
  maintenance         TEXT,
  resources           JSONB DEFAULT '[]',
  radar_scores        JSONB, -- up to 7 keys (desirability/rarity/driving_thrill/investment_trajectory/usability/ease_of_restoration/cultural_impact), 1-10 each, higher always better (step17)
  analog_index        INTEGER CHECK (analog_index BETWEEN 1 AND 10),
  homologation_special BOOLEAN NOT NULL DEFAULT FALSE,
  poster_car          BOOLEAN NOT NULL DEFAULT FALSE,
  value_trajectory    value_trajectory_type,
  callout             TEXT, -- step18: renamed from firsts_and_lasts (pure rename, same meaning, broader scope)
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

-- Step 13/14: replaces generations.rivals_alternatives/related_cars (both
-- left in place, unread, as legacy TEXT) as the authoring path for linked-or-
-- text car references. Each row is either a link to a real generation or a
-- plain-text label — never both, never neither.
DO $$ BEGIN
  CREATE TYPE car_relation_type AS ENUM ('related', 'rival');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS car_relations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id        UUID NOT NULL,
  relation_type        car_relation_type NOT NULL,
  linked_generation_id UUID,
  label_text           TEXT,
  sort_order           INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT car_relations_generation_id_fkey
    FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE,
  CONSTRAINT car_relations_linked_generation_id_fkey
    FOREIGN KEY (linked_generation_id) REFERENCES generations(id) ON DELETE CASCADE,
  CONSTRAINT car_relations_link_xor_text CHECK (
    (linked_generation_id IS NOT NULL AND label_text IS NULL) OR
    (linked_generation_id IS NULL AND label_text IS NOT NULL)
  ),
  CONSTRAINT car_relations_no_self_link CHECK (
    linked_generation_id IS NULL OR linked_generation_id != generation_id
  ),
  UNIQUE (generation_id, relation_type, linked_generation_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS car_relations_label_uniq
  ON car_relations (generation_id, relation_type, label_text)
  WHERE linked_generation_id IS NULL;

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

-- Step 16: atomic bulk-import functions for the admin CSV importer — see
-- imports/step16_bulk_import_functions.sql for the full commented version
-- (COALESCE(incoming, existing) empty-vs-absent handling, pre-flight
-- generation_id existence check). SECURITY INVOKER (default): RLS still
-- applies as the calling admin, no internal is_admin() check needed.
CREATE OR REPLACE FUNCTION bulk_update_generation_enrichment(rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_missing UUID[];
  v_updated INT;
BEGIN
  SELECT array_agg(e.generation_id) INTO v_missing
  FROM jsonb_to_recordset(rows) AS e(generation_id UUID)
  WHERE NOT EXISTS (SELECT 1 FROM generations g WHERE g.id = e.generation_id);

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'bulk_update_generation_enrichment: % generation_id(s) not found: %.', array_length(v_missing, 1), v_missing;
  END IF;

  UPDATE generations g SET
    nickname = COALESCE(e.nickname, g.nickname),
    desirability_tier = COALESCE(e.desirability_tier::desirability_tier_type, g.desirability_tier),
    overview = COALESCE(e.overview, g.overview),
    why_collectible = COALESCE(e.why_collectible, g.why_collectible),
    engine_signature = COALESCE(e.engine_signature, g.engine_signature),
    transmission = COALESCE(e.transmission, g.transmission),
    variants_to_know = COALESCE(e.variants_to_know, g.variants_to_know),
    known_issues = COALESCE(e.known_issues, g.known_issues),
    claim_to_fame = COALESCE(e.claim_to_fame, g.claim_to_fame),
    buyers_flag = COALESCE(e.buyers_flag, g.buyers_flag),
    designer = COALESCE(e.designer, g.designer),
    class = COALESCE(e.class::car_class, g.class),
    is_icon = COALESCE(e.is_icon, g.is_icon),
    body_styles = COALESCE(e.body_styles::body_style_type[], g.body_styles),
    drivetrain = COALESCE(e.drivetrain::drivetrain_type[], g.drivetrain),
    engine_layout = COALESCE(e.engine_layout::engine_layout_type, g.engine_layout),
    units_produced = COALESCE(e.units_produced, g.units_produced),
    units_produced_estimated = COALESCE(e.units_produced_estimated, g.units_produced_estimated),
    wikipedia_url = COALESCE(e.wikipedia_url, g.wikipedia_url),
    callout = COALESCE(e.callout, g.callout),
    driving_character = COALESCE(e.driving_character, g.driving_character),
    design_notes = COALESCE(e.design_notes, g.design_notes),
    cultural_notes = COALESCE(e.cultural_notes, g.cultural_notes),
    motorsport_pedigree = COALESCE(e.motorsport_pedigree, g.motorsport_pedigree),
    maintenance = COALESCE(e.maintenance, g.maintenance),
    value_trajectory = COALESCE(e.value_trajectory::value_trajectory_type, g.value_trajectory),
    analog_index = COALESCE(e.analog_index, g.analog_index),
    homologation_special = COALESCE(e.homologation_special, g.homologation_special),
    poster_car = COALESCE(e.poster_car, g.poster_car),
    radar_scores = COALESCE(g.radar_scores, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'desirability', e.radar_desirability, 'rarity', e.radar_rarity,
      'driving_thrill', e.radar_driving_thrill, 'investment_trajectory', e.radar_investment_trajectory,
      'usability', e.radar_usability, 'ease_of_restoration', e.radar_ease_of_restoration,
      'cultural_impact', e.radar_cultural_impact
    )),
    market_data = COALESCE(g.market_data, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object('notes', e.market_notes)), -- step21
    updated_at = NOW()
  FROM jsonb_to_recordset(rows) AS e(
    generation_id UUID, nickname TEXT, desirability_tier TEXT, overview TEXT, why_collectible TEXT,
    engine_signature TEXT, transmission TEXT, variants_to_know TEXT, known_issues TEXT, claim_to_fame TEXT,
    buyers_flag TEXT, designer TEXT, class TEXT, is_icon BOOLEAN, body_styles TEXT[],
    drivetrain TEXT[], engine_layout TEXT, units_produced INTEGER, units_produced_estimated BOOLEAN,
    wikipedia_url TEXT, callout TEXT, driving_character TEXT, design_notes TEXT, cultural_notes TEXT,
    motorsport_pedigree TEXT, maintenance TEXT, value_trajectory TEXT, analog_index INTEGER,
    homologation_special BOOLEAN, poster_car BOOLEAN, market_notes TEXT,
    radar_desirability INTEGER, radar_rarity INTEGER, radar_driving_thrill INTEGER,
    radar_investment_trajectory INTEGER, radar_usability INTEGER, radar_ease_of_restoration INTEGER,
    radar_cultural_impact INTEGER
  )
  WHERE g.id = e.generation_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_update_generation_enrichment(JSONB) TO authenticated;

-- step21: rows: [{ generation_id, relation_type: 'rival'|'related', label_text }].
-- Plain-text car_relations inserts only (linked_generation_id always
-- null) — upgrading a text entry to a real linked car stays a picker-only
-- action in the edit form. Idempotent: car_relations_label_uniq (a
-- partial unique index on (generation_id, relation_type, label_text)
-- WHERE linked_generation_id IS NULL) makes a duplicate label_text a
-- silent no-op via ON CONFLICT ... DO NOTHING, not an error or a second row.
CREATE OR REPLACE FUNCTION bulk_add_car_relations(rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_missing UUID[];
  v_inserted INT;
BEGIN
  SELECT array_agg(DISTINCT e.generation_id) INTO v_missing
  FROM jsonb_to_recordset(rows) AS e(generation_id UUID)
  WHERE NOT EXISTS (SELECT 1 FROM generations g WHERE g.id = e.generation_id);

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'bulk_add_car_relations: % generation_id(s) not found: %.', array_length(v_missing, 1), v_missing;
  END IF;

  INSERT INTO car_relations (generation_id, relation_type, label_text, sort_order)
  SELECT
    e.generation_id,
    e.relation_type::car_relation_type,
    trim(e.label_text),
    COALESCE((
      SELECT MAX(cr.sort_order) FROM car_relations cr
      WHERE cr.generation_id = e.generation_id AND cr.relation_type = e.relation_type::car_relation_type
    ), -1) + row_number() OVER (PARTITION BY e.generation_id, e.relation_type ORDER BY e.label_text)
  FROM jsonb_to_recordset(rows) AS e(generation_id UUID, relation_type TEXT, label_text TEXT)
  WHERE trim(e.label_text) != ''
  ON CONFLICT (generation_id, relation_type, label_text) WHERE linked_generation_id IS NULL DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_add_car_relations(JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION bulk_upsert_trims(rows JSONB)
RETURNS TABLE(generation_id UUID, name TEXT, action TEXT)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  v_missing UUID[];
BEGIN
  SELECT array_agg(DISTINCT e.generation_id) INTO v_missing
  FROM jsonb_to_recordset(rows) AS e(generation_id UUID)
  WHERE NOT EXISTS (SELECT 1 FROM generations g WHERE g.id = e.generation_id);

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'bulk_upsert_trims: % generation_id(s) not found: %.', array_length(v_missing, 1), v_missing;
  END IF;

  RETURN QUERY
  INSERT INTO trims (generation_id, name, years, description, production_notes)
  SELECT e.generation_id, e.name, e.years, e.description, e.production_notes
  FROM jsonb_to_recordset(rows) AS e(generation_id UUID, name TEXT, years TEXT, description TEXT, production_notes TEXT)
  ON CONFLICT (generation_id, name) DO UPDATE SET
    years = COALESCE(NULLIF(EXCLUDED.years, ''), trims.years),
    description = COALESCE(NULLIF(EXCLUDED.description, ''), trims.description),
    production_notes = COALESCE(NULLIF(EXCLUDED.production_notes, ''), trims.production_notes)
  RETURNING trims.generation_id, trims.name, 'upserted';
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_upsert_trims(JSONB) TO authenticated;

-- RLS: public read, is_admin()-gated write on all five tables
ALTER TABLE makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trims ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON makes FOR SELECT USING (true);
CREATE POLICY "Public read" ON models FOR SELECT USING (true);
CREATE POLICY "Public read" ON generations FOR SELECT USING (true);
CREATE POLICY "Public read" ON trims FOR SELECT USING (true);
CREATE POLICY "Public read" ON car_relations FOR SELECT USING (true);

CREATE POLICY "Admin write" ON makes FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write" ON models FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write" ON generations FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write" ON trims FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write" ON car_relations FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Admin writes (the admin form) go through the signed-in admin's own
-- session, not a service-role bypass — this grant plus the RLS policy above
-- is what actually enforces it, in addition to the app-level checkIsAdmin().
GRANT SELECT ON makes, models, generations, trims, car_relations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON makes, models, generations, trims, car_relations TO authenticated;

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
