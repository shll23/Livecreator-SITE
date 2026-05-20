-- ============================================================================
-- Migration 006: Coin-Pakete auf neue Preisstruktur updaten
-- ============================================================================
-- Aktuelle Pakete:  100/9.99 · 500/39.99 · 1500/99.99 · 5000/249.99
-- Neue Pakete:      100/9.99 · 250/24.99 · 500/49.99 · 1000/89.99
--
-- Strategie: Wir UPDATEn die existierenden Datensätze nach sort_order
-- (UUIDs bleiben gleich, damit eventuelle Foreign-Key Refs intakt sind)
-- ============================================================================

-- Paket 1 (Starter): Bleibt 100/9.99
UPDATE coin_packages
SET name = 'Starter', coins = 100, price_cents = 999, currency = 'EUR', is_active = TRUE
WHERE sort_order = 1;

-- Paket 2 (Standard): 500/39.99 → 250/24.99
UPDATE coin_packages
SET name = 'Standard', coins = 250, price_cents = 2499, currency = 'EUR', is_active = TRUE
WHERE sort_order = 2;

-- Paket 3 (Premium): 1500/99.99 → 500/49.99
UPDATE coin_packages
SET name = 'Premium', coins = 500, price_cents = 4999, currency = 'EUR', is_active = TRUE
WHERE sort_order = 3;

-- Paket 4 (VIP): 5000/249.99 → 1000/89.99
UPDATE coin_packages
SET name = 'VIP', coins = 1000, price_cents = 8999, currency = 'EUR', is_active = TRUE
WHERE sort_order = 4;
