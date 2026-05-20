-- ============================================================================
-- Migration 005: Geo & Profile-Felder für Creators
-- 
-- Fügt strukturierte Felder für Filter & Umkreis-Suche hinzu:
--   - age, city, country: für UI-Filter
--   - latitude, longitude: für Haversine-Distanz-Berechnung
--
-- Nutzt earthdistance + cube Extensions (Postgres-Standard).
-- ============================================================================

-- Extensions für Geo-Distanz (Standard-Postgres, keine Drittsoftware)
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Neue Spalten auf creators-Tabelle
ALTER TABLE creators
    ADD COLUMN IF NOT EXISTS age          smallint  CHECK (age >= 18 AND age <= 99),
    ADD COLUMN IF NOT EXISTS city         varchar(100),
    ADD COLUMN IF NOT EXISTS country      char(2)   DEFAULT 'DE',
    ADD COLUMN IF NOT EXISTS latitude     numeric(9,6),
    ADD COLUMN IF NOT EXISTS longitude    numeric(9,6);

-- Index für Stadt-Suche (häufigster Filter)
CREATE INDEX IF NOT EXISTS idx_creators_city
    ON creators (city)
    WHERE is_listed = true;

-- Index für Alter-Range
CREATE INDEX IF NOT EXISTS idx_creators_age
    ON creators (age)
    WHERE is_listed = true;

-- GIST-Index für schnelle Umkreis-Suche
-- earth_distance erwartet ll_to_earth(lat, lng) als Datentyp
CREATE INDEX IF NOT EXISTS idx_creators_geo
    ON creators USING gist (ll_to_earth(latitude, longitude))
    WHERE is_listed = true AND latitude IS NOT NULL;
