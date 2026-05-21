-- ============================================================================
-- 012_push_subscriptions.up.sql
--
-- Web-Push-Subscriptions fuer alle User (Customer, Creator, Admin).
-- Ein User kann mehrere Subscriptions haben (verschiedene Geraete).
-- ============================================================================

CREATE TABLE push_subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    endpoint        TEXT NOT NULL,
    p256dh_key      TEXT NOT NULL,
    auth_key        TEXT NOT NULL,

    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_user ON push_subscriptions (user_id);
CREATE INDEX idx_push_last_used ON push_subscriptions (last_used_at DESC);
