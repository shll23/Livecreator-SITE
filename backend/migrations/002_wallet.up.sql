-- ============================================================================
-- Migration 002: Wallet + Ledger
-- Doppelte Buchführung für Coin-Bewegungen.
-- Jede Transaktion = 2 Einträge: ein DEBIT, ein CREDIT.
-- Sum aller Einträge muss IMMER 0 sein. So wird Inkonsistenz unmöglich.
-- ============================================================================

-- Account-Typen:
-- - user:{user_id}     → Coin-Balance eines Users (Customer hat Coins)
-- - creator:{user_id}  → Earnings eines Creators (in Coins, später ausgezahlt in EUR)
-- - system:revenue     → Plattform-Anteil (Differenz aus Spend - Creator-Share)
-- - system:incoming    → Eingehende Coin-Käufe (gegen reale Zahlung)
-- - system:writeoff    → Refunds, Chargebacks
CREATE TABLE ledger_accounts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_key  VARCHAR(80) UNIQUE NOT NULL,    -- z.B. "user:abc-123" oder "system:revenue"
    account_type VARCHAR(20) NOT NULL,           -- "user", "creator", "system"
    -- Cached balance — IMMER aus ledger_entries berechnet, nur Cache
    -- Source of truth ist die SUM(amount) aus ledger_entries
    balance_coins BIGINT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_accounts_type ON ledger_accounts(account_type);

-- ============================================================================
-- Ledger-Einträge (immutable, append-only!)
-- ============================================================================
CREATE TYPE ledger_tx_type AS ENUM (
    'coin_purchase',      -- Customer kauft Coins (system:incoming → user)
    'message_send',       -- Customer schickt PPM-Nachricht (user → creator + system:revenue)
    'media_unlock',       -- Customer schaltet PPV-Media frei
    'tip',                -- Customer tippt Creator
    'refund',             -- Refund einer Transaktion
    'chargeback',         -- Chargeback von PSP
    'creator_payout',     -- Creator-Auszahlung (creator → system:writeoff)
    'admin_adjustment'    -- Manuelle Korrektur durch Admin
);

CREATE TABLE ledger_entries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Transaktion gruppiert mehrere Einträge (debit + credit)
    transaction_id UUID NOT NULL,
    tx_type      ledger_tx_type NOT NULL,
    account_id   UUID NOT NULL REFERENCES ledger_accounts(id),
    -- Positiv = CREDIT (Geld rein), Negativ = DEBIT (Geld raus)
    amount_coins BIGINT NOT NULL CHECK (amount_coins != 0),
    -- Metadata für Auditing
    description  TEXT,
    metadata     JSONB NOT NULL DEFAULT '{}',
    -- Idempotenz-Key (wichtig für Webhooks)
    idempotency_key VARCHAR(120) UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_entries_tx ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_account ON ledger_entries(account_id, created_at DESC);
CREATE INDEX idx_ledger_entries_type ON ledger_entries(tx_type, created_at DESC);

-- ============================================================================
-- Coin-Pakete (für Käufe — diese kann der Admin später in DB anpassen)
-- ============================================================================
CREATE TABLE coin_packages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(80) NOT NULL,           -- z.B. "Starter", "Premium"
    coins        INTEGER NOT NULL CHECK (coins > 0),
    price_cents  INTEGER NOT NULL CHECK (price_cents > 0),  -- in Cent (EUR)
    currency     CHAR(3) NOT NULL DEFAULT 'EUR',
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coin_packages_active ON coin_packages(is_active, sort_order) WHERE is_active = TRUE;

-- ============================================================================
-- Coin-Käufe (Tracking, separat vom Ledger)
-- Ledger sagt nur "Coins eingegangen". Hier steht warum, welcher PSP, etc.
-- ============================================================================
CREATE TYPE purchase_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'chargeback');

CREATE TABLE coin_purchases (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id),
    package_id   UUID REFERENCES coin_packages(id),
    coins        INTEGER NOT NULL,
    price_cents  INTEGER NOT NULL,
    currency     CHAR(3) NOT NULL,
    -- PSP-Tracking
    provider     VARCHAR(40) NOT NULL,           -- "ccbill", "segpay", "mock"
    provider_tx_id VARCHAR(120),                 -- ID beim PSP
    status       purchase_status NOT NULL DEFAULT 'pending',
    -- Wenn completed → ledger_transaction_id verlinkt zur Buchung
    ledger_transaction_id UUID,
    -- Raw-Webhook-Payload für Debugging
    provider_metadata JSONB NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_coin_purchases_user ON coin_purchases(user_id, created_at DESC);
CREATE INDEX idx_coin_purchases_status ON coin_purchases(status, created_at DESC);
CREATE INDEX idx_coin_purchases_provider_tx ON coin_purchases(provider, provider_tx_id);

CREATE TRIGGER trg_ledger_accounts_updated BEFORE UPDATE ON ledger_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_coin_packages_updated   BEFORE UPDATE ON coin_packages   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_coin_purchases_updated  BEFORE UPDATE ON coin_purchases  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- Default Coin-Pakete einfügen
-- ============================================================================
INSERT INTO coin_packages (name, coins, price_cents, sort_order) VALUES
    ('Starter',  100,  999,  1),    -- 100 Coins für 9,99 €
    ('Standard', 500,  3999, 2),    -- 500 Coins für 39,99 € (~20% mehr)
    ('Premium',  1500, 9999, 3),    -- 1500 Coins für 99,99 € (~50% mehr)
    ('VIP',      5000, 24999, 4);   -- 5000 Coins für 249,99 € (~100% mehr)
