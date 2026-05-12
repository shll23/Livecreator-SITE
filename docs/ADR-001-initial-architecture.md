# ADR-001: Initiale Architekturentscheidungen

**Datum:** Session 1
**Status:** akzeptiert

## Kontext

Wir bauen eine Adult-Creator-Plattform mit Pay-per-Message Chat und Coin-Wallet.
Phase 1: Auth + Profile + öffentliches Creator-Listing.
Spätere Phasen: Echtzeit-Chat, Coin-Käufe, Media+PPV.

## Entscheidungen

### 1. Sprache & Framework
- **Backend:** Go + Fiber v2 — kompiliert zu kleinem statischen Binary, gute Performance, einfaches Deployment.
- **Frontend:** Next.js 14 (App Router) — SSR + Client-Components mischbar, gute DX.
- **Zwei separate Frontends statt eines mit Rollen** — bessere UX, klarere Trennung, jeweils SEO-optimierbar.

### 2. Datenbank
- **PostgreSQL 16** — bewährt, transaktional, JSON-Support, gute Tooling. Kein vorzeitiges ScyllaDB.
- **Redis** für Pub/Sub (kommt in Session 2 für WebSocket-Fanout).
- **Migrations:** Eigener simpler SQL-Runner statt Library — volle Transparenz, kein Magic.

### 3. Auth
- **Argon2id** für Passwort-Hashing (OWASP 2024 Empfehlung). Keine bcrypt — zu schwach für moderne GPUs.
- **JWT (HS256) für Access-Tokens** — kurzlebig (15 min), stateless, schnell verifizierbar.
- **Refresh-Tokens in DB** mit SHA256-Hash gespeichert, rotiert bei jedem Refresh — ermöglicht Logout, Multi-Device-Tracking, Compromise-Detection.
- **Token in localStorage** vorerst — für Production später HTTP-only-Cookies erwägen (XSS-Schutz).

### 4. Coin-System (Schema bereits vorbereitet)
- **Doppelte Buchführung im Ledger** — jede Transaktion ist 2+ Einträge die zu Null summieren. Macht Inkonsistenzen unmöglich.
- **Cached Balance** auf `ledger_accounts.balance_coins` — Source of Truth bleibt aber `SUM(amount)` aus `ledger_entries`.
- **Account-Keys als Strings:** `user:{uuid}`, `creator:{uuid}`, `system:revenue` — flexibel, kein vorzeitiges Schema-Design.
- **PSP-agnostisch:** `coin_purchases.provider` als String, kein Enum — dadurch beliebige Adapter ohne Migration.

### 5. PSP-Strategie
- Adult Content schließt Stripe für Coin-Käufe **aus** (Account-Bann-Risiko, Stripe ToS).
- Architektur baut **Provider-Interface** — Mock-Adapter für Dev, später CCBill/Segpay/Epoch als echte Adapter.
- PSP-Entscheidung wird **nicht jetzt** getroffen, sondern wenn echtes Volumen winkt. Bis dahin Mock.

### 6. Media (Schema vorbereitet, Logik kommt später)
- `media_assets` mit Status-Maschine (`uploading → processing → ready`).
- `is_ppv` + `ppv_price_coins` direkt am Asset — separater Unlock-Track in `media_unlocks`.
- Storage-Backend abstrahiert: `storage_key` ist S3/R2-Key, ohne URL hardcoded.

### 7. Was wir BEWUSST nicht jetzt machen
- ❌ Real-time Chat (WebSocket) — Session 2
- ❌ Coin-Käufe — Session 3
- ❌ Media-Upload — Session 4
- ❌ Email-Verifikation — kommt mit Production-Deploy
- ❌ 2FA, Passkeys — kommt nach MVP
- ❌ Rate-Limiting — kommt vor Public Beta
- ❌ Multi-Region — definitiv erst bei Skalierungs-Bedarf
- ❌ Microservices-Split — Monolith reicht bis 100k MAU

## Konsequenzen

**Positiv:**
- Schemas sind so designed, dass spätere Features nur additive Änderungen brauchen
- Doppelte Buchführung ab Tag 1 → kein nachträgliches Refactoring
- PSP-Wechsel ist Adapter-Wechsel, kein Umbau
- Beide Frontends teilen sich keinen Code → keine Coupling-Schmerzen, aber Code-Duplikation (akzeptabel)

**Negativ / zu beobachten:**
- Code-Duplikation zwischen den Frontends (api.ts, globals.css) — bei mehr gemeinsamem Code später als shared package extrahieren
- Eigener Migration-Runner ohne `down`-Migrations — bewusste Vereinfachung; in Prod sind Down-Migrations sowieso heikel

## Follow-Ups
- [ ] Email-Verifikations-Flow in Session 5
- [ ] CSRF-Tokens für Cookie-basierte Auth
- [ ] Geo-Blocking-Layer in Edge (Session "Production Hardening")
