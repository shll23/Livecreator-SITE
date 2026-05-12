-- ============================================================================
-- Migration 001: Identity Layer
-- Users (gemeinsame Auth), Creators-Profile, Customers-Profile, Sessions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS citext;

-- Eine User-Tabelle für beide Rollen.
-- Rolle bestimmt welches Profil-Pendant existiert.
CREATE TYPE user_role AS ENUM ('creator', 'customer', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');

CREATE TABLE users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        CITEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,           -- argon2id
    role         user_role NOT NULL,
    status       user_status NOT NULL DEFAULT 'active',
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role) WHERE status = 'active';

-- ============================================================================
-- Creator-Profil
-- ============================================================================
CREATE TABLE creators (
    user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    handle       VARCHAR(32) UNIQUE NOT NULL,    -- @handle für URL
    display_name VARCHAR(80) NOT NULL,
    bio          TEXT,
    avatar_url   TEXT,
    cover_url    TEXT,
    -- Pricing (in Coins)
    message_price_coins INTEGER NOT NULL DEFAULT 5 CHECK (message_price_coins >= 0),
    -- Earnings-Konfiguration
    revenue_share_bps INTEGER NOT NULL DEFAULT 8000 CHECK (revenue_share_bps BETWEEN 0 AND 10000), -- 8000 = 80%
    -- Status
    is_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    is_listed    BOOLEAN NOT NULL DEFAULT TRUE,   -- in Explore sichtbar
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_creators_handle ON creators(handle);
CREATE INDEX idx_creators_listed ON creators(is_listed) WHERE is_listed = TRUE;

-- ============================================================================
-- Customer-Profil
-- ============================================================================
CREATE TABLE customers (
    user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(80),
    avatar_url   TEXT,
    -- Demografisch (später für Recommender)
    country_code CHAR(2),
    locale       VARCHAR(10) DEFAULT 'de-DE',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Refresh-Token-Sessions (für Logout, Revoke, Multi-Device)
-- Access-Tokens sind stateless (JWT), Refresh-Tokens sind in DB.
-- ============================================================================
CREATE TABLE sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,        -- SHA-256 des Refresh-Tokens
    user_agent   TEXT,
    ip_address   INET,
    expires_at   TIMESTAMPTZ NOT NULL,
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_active ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;

-- ============================================================================
-- Updated_at Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated     BEFORE UPDATE ON users     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_creators_updated  BEFORE UPDATE ON creators  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
