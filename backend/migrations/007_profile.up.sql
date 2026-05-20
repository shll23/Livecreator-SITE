-- ============================================================================
-- Migration 007: Bilder-Galerie + flexible Profil-Daten
-- ============================================================================
-- gallery_urls:  Array von Bild-URLs (relativ, z.B. /profiles/frau-1-lara/02.jpg)
-- profile_data:  JSONB Feld für flexible Profil-Attribute
--                (Größe, Figur, Haarfarbe, Augenfarbe, Hobbies, was-ich-suche,
--                 was-mich-antörnt, etc.)
--
-- Vorteil JSONB: Jederzeit neue Felder hinzufügen ohne weitere Migration.
-- ============================================================================

-- Bilder-Galerie als Array von Strings
ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT '{}'::text[];

-- Flexible Profil-Daten als JSONB
ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS profile_data jsonb DEFAULT '{}'::jsonb;

-- GIN-Index für effizientes Suchen in JSONB (z.B. WHERE profile_data->>'figure' = 'sportlich')
CREATE INDEX IF NOT EXISTS idx_creators_profile_data
  ON creators USING GIN (profile_data);

-- Kommentare zur Dokumentation
COMMENT ON COLUMN creators.gallery_urls IS
  'Array von Bild-URLs für die Profil-Galerie. Erstes Element ist Hauptbild = avatar_url.';

COMMENT ON COLUMN creators.profile_data IS
  'Flexible Profil-Daten als JSONB. Erwartete Felder: height_cm, figure, hair_color, hair_length, eye_color, zodiac, smoker, marital_status, tattoos, piercings, looking_for[], turn_ons[], interests[], about_text';
