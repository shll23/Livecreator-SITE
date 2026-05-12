# LiveCreator MVP

Multi-Tenant Creator-Plattform mit Pay-per-Message Chat und Coin-System.

## Stack

- **Backend:** Go 1.22 (Fiber v3), PostgreSQL 16, Redis 7
- **Frontend Creator:** Next.js 14 (App Router) + Tailwind + shadcn/ui
- **Frontend Customer:** Next.js 14 (App Router) + Tailwind + shadcn/ui
- **Auth:** JWT (Access 15min + Refresh 30d), Argon2id Passwort-Hashing
- **Payment:** PSP-agnostisch via Interface (Mock-Adapter integriert)

## Lokales Setup

Voraussetzungen:
- Docker + Docker Compose
- Node.js 20+ (für Frontend-Dev ohne Docker)
- Go 1.22+ (für Backend-Dev ohne Docker)

```bash
# 1. Env-Datei kopieren
cp .env.example .env

# 2. Alles hochfahren
docker compose up -d

# 3. Migrationen werden automatisch beim ersten Start ausgeführt

# 4. Verfügbar unter:
# - Backend API:      http://localhost:8080
# - Creator-Frontend: http://localhost:3001
# - Kunden-Frontend:  http://localhost:3000
# - Postgres:         localhost:5432 (user: lc, pass: lc, db: lc)
# - Redis:            localhost:6379
```

## Erste Schritte nach dem Start

1. Öffne `http://localhost:3001/register` und registriere dich als Creator
2. Öffne `http://localhost:3000/register` und registriere dich als Kunde
3. Beide sollten sich einloggen können

## Was in dieser Iteration funktioniert

- ✅ Creator-Registrierung & Login
- ✅ Kunden-Registrierung & Login
- ✅ JWT-basierte Sessions
- ✅ Saubere DB-Struktur für alle späteren Features (Chat, Coins, Media, PPV)

## Was als nächstes kommt

- ⏳ Echtzeit-Chat (WebSocket) — nächste Session
- ⏳ Coin-System (Buy + Spend) — Session 3
- ⏳ Media-Upload mit PPV-Lock — Session 4
- ⏳ Admin-Panel — Session 5

## Projektstruktur

```
backend/                  # Go-Backend
  cmd/api/               # Main entry point
  internal/
    auth/                # JWT + Passwort-Hashing
    config/              # Env-Config
    db/                  # DB-Connection + Migration-Runner
    http/                # HTTP-Handler + Router
    models/              # Datenmodelle
    payment/             # PSP-Interface + Adapter
    wallet/              # Coin-Logik (Ledger)
  migrations/            # SQL-Migrationen

frontend-creator/         # Next.js für Creators
frontend-customer/        # Next.js für Kunden
docs/                     # ADRs, Spec-Dokumente
```
