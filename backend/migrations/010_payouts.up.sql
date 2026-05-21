-- ============================================================================
-- 010_payouts.up.sql
--
-- Monatliche Auszahlungen an Creator.
-- Wird vom Admin am Monatsanfang erstellt (mit Rechnung-PDF).
-- ============================================================================

CREATE TABLE payouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID NOT NULL REFERENCES creators(user_id) ON DELETE CASCADE,

    -- Zeitraum (YYYY-MM Format, z.B. "2026-05")
    period_year     INTEGER NOT NULL,
    period_month    INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),

    -- Beträge
    coins_earned     BIGINT NOT NULL DEFAULT 0,
    messages_count   BIGINT NOT NULL DEFAULT 0,
    amount_cents     BIGINT NOT NULL DEFAULT 0,  -- Was die Frau bekommt
    tier_percent     NUMERIC(5,2),               -- Provisionssatz zum Abrechnungszeitpunkt

    -- Status
    status          TEXT NOT NULL DEFAULT 'paid'
                    CHECK (status IN ('pending', 'paid', 'cancelled')),

    -- Rechnung (Pfad relativ zu STORAGE_PATH)
    invoice_path    TEXT,
    invoice_uploaded_at TIMESTAMPTZ,

    -- Metadaten
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    notes           TEXT  -- Internal notes von Admin
);

-- Ein Payout pro Creator pro Monat
CREATE UNIQUE INDEX idx_payouts_unique_period
    ON payouts(creator_id, period_year, period_month);

CREATE INDEX idx_payouts_creator_period
    ON payouts(creator_id, period_year DESC, period_month DESC);
