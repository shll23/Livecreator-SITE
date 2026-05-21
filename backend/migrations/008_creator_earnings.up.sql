-- ============================================================================
-- 008_creator_earnings.up.sql
--
-- Provisions-Tracking pro Nachricht für Tiered-System
--
-- Tier-Logik (basierend auf Lifetime-Coins):
--   0     - 10000   →  25.0%
--   10001 - 25000   →  27.5%
--   25001 - 50000   →  30.0%
--   50001 - 100000  →  32.5%
--   100001+         →  35.0%
-- ============================================================================

CREATE TABLE creator_earnings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id       UUID NOT NULL REFERENCES creators(user_id) ON DELETE CASCADE,
    message_id       UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    customer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coins_earned     INTEGER NOT NULL CHECK (coins_earned >= 0),
    tier_percent     NUMERIC(5,2) NOT NULL CHECK (tier_percent >= 0),
    commission_cents INTEGER NOT NULL CHECK (commission_cents >= 0),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (message_id)
);

CREATE INDEX idx_creator_earnings_creator_created ON creator_earnings(creator_id, created_at DESC);
CREATE INDEX idx_creator_earnings_customer ON creator_earnings(customer_id);
CREATE INDEX idx_creator_earnings_creator_customer ON creator_earnings(creator_id, customer_id);
