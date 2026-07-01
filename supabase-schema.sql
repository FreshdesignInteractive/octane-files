 -- Octane Files — clean schema
-- Run in Supabase SQL editor (drops and recreates everything)

-- ─── Drop old table ───────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cars CASCADE;

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
CREATE POLICY "Public read"        ON profiles FOR SELECT USING (true);
CREATE POLICY "Owner update"       ON profiles FOR UPDATE USING (auth.uid() = id);

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

-- ─── Models (admin encyclopedia) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS models (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  generation      TEXT,
  year_start      INTEGER NOT NULL,
  year_end        INTEGER,
  class           TEXT NOT NULL CHECK (class IN ('Exotic','Grand Tourer','Icons','Luxury','Muscle','Off-Road','Sports')),
  country         TEXT NOT NULL,
  body_styles     TEXT[] DEFAULT '{}',
  drivetrain      TEXT,
  engine_layout   TEXT,
  units_produced  INTEGER,
  overview        TEXT,
  hero_image      TEXT,
  gallery_images  TEXT[] DEFAULT '{}',
  specs           JSONB DEFAULT '[]',
  market_data     JSONB,
  maintenance     TEXT,
  resources       JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS models_class_idx   ON models (class);
CREATE INDEX IF NOT EXISTS models_country_idx ON models (country);
CREATE INDEX IF NOT EXISTS models_make_idx    ON models (make);
CREATE INDEX IF NOT EXISTS models_search_idx  ON models
  USING GIN (to_tsvector('english',
    coalesce(make,'') || ' ' || coalesce(model,'') || ' ' || coalesce(generation,'')));

ALTER TABLE models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read"  ON models FOR SELECT USING (true);
CREATE POLICY "Admin insert" ON models FOR INSERT WITH CHECK (auth.jwt()->>'email' = 'raj.sidharthan@freshdesign.com');
CREATE POLICY "Admin update" ON models FOR UPDATE USING      (auth.jwt()->>'email' = 'raj.sidharthan@freshdesign.com');
CREATE POLICY "Admin delete" ON models FOR DELETE USING      (auth.jwt()->>'email' = 'raj.sidharthan@freshdesign.com');

-- ─── User Cars ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_cars (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model_id      UUID NOT NULL REFERENCES models(id) ON DELETE RESTRICT,
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
CREATE POLICY "Public read published"  ON user_cars FOR SELECT USING (is_published = true);
CREATE POLICY "Owner read own"         ON user_cars FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owner insert"           ON user_cars FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner update"           ON user_cars FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner delete"           ON user_cars FOR DELETE USING (auth.uid() = owner_id);

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
CREATE POLICY "Public read"     ON likes FOR SELECT USING (true);
CREATE POLICY "Auth insert"     ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete"    ON likes FOR DELETE USING (auth.uid() = user_id);

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
CREATE POLICY "Public read"    ON comments FOR SELECT USING (true);
CREATE POLICY "Auth insert"    ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Owner update"   ON comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Owner delete"   ON comments FOR DELETE USING (auth.uid() = author_id);
