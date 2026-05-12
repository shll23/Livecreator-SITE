# Test-Anleitung

Nach `docker compose up -d` kannst du alles per curl testen.

## 1. Health-Check

```bash
curl http://localhost:8080/health
# {"status":"ok"}
```

## 2. Creator registrieren

```bash
curl -X POST http://localhost:8080/api/auth/register/creator \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "supersecret123",
    "handle": "alice",
    "display_name": "Alice"
  }'
# Antwort: { access_token, refresh_token, expires_in, role: "creator", user_id }
```

## 3. Customer registrieren

```bash
curl -X POST http://localhost:8080/api/auth/register/customer \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@example.com",
    "password": "supersecret123",
    "display_name": "Bob"
  }'
```

## 4. Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "supersecret123"
  }'
```

## 5. /me mit Access-Token

```bash
TOKEN="<access_token aus 2. oder 4.>"

curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## 6. Creators auflisten (öffentlich)

```bash
curl http://localhost:8080/api/creators
```

## 7. Refresh-Token nutzen

```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

## 8. Logout

```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

## Frontend testen

1. Öffne http://localhost:3001/register → Creator anlegen
2. Öffne http://localhost:3000/explore → Creator-Liste sollte den eben erstellten Creator zeigen
3. Klick auf "Registrieren" → Customer anlegen
4. Login mit beiden Konten in jeweiligem Frontend
