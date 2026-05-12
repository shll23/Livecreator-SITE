-- ============================================================================
-- Migration 004: System-Ledger-Accounts
-- Initialisiert die System-Konten die wir für Coin-Käufe + Plattform-Revenue
-- brauchen. Idempotent (ON CONFLICT DO NOTHING).
-- ============================================================================

INSERT INTO ledger_accounts (account_key, account_type) VALUES
    ('system:incoming', 'system'),  -- Gegenseite für Coin-Käufe (negative Balance)
    ('system:revenue',  'system'),  -- Plattform-Anteil aus Chat etc.
    ('system:writeoff', 'system')   -- Refunds, Chargebacks
ON CONFLICT (account_key) DO NOTHING;
