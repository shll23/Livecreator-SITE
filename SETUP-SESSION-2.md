# Session 2 Update — Coin-System + UI Redesign

## Was ist neu

**Backend (Coin-System):**
- Wallet-Service mit doppelter Buchführung
- Mock-Payment-Provider (für Entwicklung ohne echten PSP)
- 5 neue API-Endpoints: Balance, Pakete, Käufe starten, Käufe-History, Mock-Confirm
- Neue Migration für System-Ledger-Accounts

**Frontend (UI-Redesign Premium Pink):**
- Komplett neues Design — weiß mit pinken Akzenten, Premium-Feel
- Fraunces (Display) + Inter (Body) als Fonts
- Mesh-Gradient-Hintergründe, Glow-Effekte, animierte Cards
- Wallet-Seite mit Coin-Käufen
- Creator-Detail-Seite (/c/[handle])
- Header-Komponente mit Live-Coin-Balance

## Installation — 5 Schritte

### Schritt 1: Update-Pack entpacken

ZIP doppelklicken zum Entpacken. Du bekommst einen Ordner `update-pack/` mit derselben Struktur wie dein bestehendes Projekt.

### Schritt 2: In dein Projekt kopieren

**Im Terminal:**

```bash
cd ~/Desktop/Projects/livecreator-mvp
```

Dann mit Finder: Kopier den **Inhalt** des `update-pack/`-Ordners in dein `livecreator-mvp/`-Verzeichnis. Bestätige alle Überschreibungen mit "Ersetzen".

ODER per Terminal (falls ZIP-Inhalt unter `~/Downloads/update-pack/` liegt):

```bash
cp -R ~/Downloads/update-pack/. ~/Desktop/Projects/livecreator-mvp/
```

Der Punkt am Ende von `update-pack/.` ist wichtig — er kopiert auch versteckte Dateien.

### Schritt 3: Plattform stoppen + neu bauen

```bash
cd ~/Desktop/Projects/livecreator-mvp
docker compose down
docker compose up -d --build
```

⏱️ Dauer: 3-8 Minuten. Diesmal werden vor allem die Frontends neu gebaut (npm install + build).

Wenn am Ende `[+] Running 6/6` mit grünen Häkchen kommt → läuft.

### Schritt 4: Testen im Browser

**Du musst dich neu registrieren** weil das alte Volume noch da ist, aber wir können die System-Accounts erst nach Migration 004 nutzen. Am sichersten:

```bash
# Daten-Volumes löschen (frische DB)
docker compose down -v
docker compose up -d --build
```

**⚠️ Achtung:** `docker compose down -v` löscht **alle Daten** in DB + Redis. Deine bestehenden Test-Accounts sind weg. Das ist hier okay weil wir noch am Bauen sind.

Dann:

1. **Creator anlegen:** http://localhost:3001/register
   - Neues Design ansehen — Pink-Theme, Fraunces-Font
   
2. **Kunden anlegen:** http://localhost:3000/register
   
3. **Wallet öffnen:** http://localhost:3000/wallet
   - Du siehst 4 Coin-Pakete (Starter, Standard, Premium, VIP)
   - Klick auf "Jetzt kaufen" beim Standard-Paket
   - Es öffnet sich ein neuer Tab mit "✨ Zahlung erfolgreich"
   - Tab schließen, zurück zum Wallet
   - **Coin-Balance ist jetzt 500** ✅
   - Käufe-Tabelle zeigt den Kauf als "Erhalten"

4. **Explore + Detail:** http://localhost:3000/explore
   - Hero mit "Verbinde dich. Wie noch nie zuvor."
   - Klick auf den Creator → Detail-Page
   - "Chat starten"-Button (Chat selbst kommt nächste Session)

### Schritt 5: Auf GitHub pushen

```bash
cd ~/Desktop/Projects/livecreator-mvp
git add .
git commit -m "Session 2: Coin-System + Premium UI Redesign"
git push
```

## Was funktioniert ab jetzt

- ✅ Coin-Pakete anzeigen + kaufen (Mock-Flow)
- ✅ Ledger-Buchungen mit doppelter Buchführung
- ✅ Idempotenz (Doppel-Klick auf Kauf bucht nur einmal)
- ✅ Käufe-History
- ✅ Premium-UI auf beiden Frontends
- ✅ Live-Coin-Balance im Header
- ✅ Creator-Detail-Seiten mit Pricing-Info

## Was als nächstes kommt

**Session 3:** Echtzeit-Chat
- WebSocket-Setup
- Inbox auf beiden Seiten
- Pay-per-Message (Coin-Abbuchung)
- Read-Receipts, Typing-Indicator

**Session 4:** Icebreaker-System

**Session 5:** Media-Upload + PPV

## Troubleshooting

**Problem: docker compose schlägt fehl beim Build**

Logs anschauen:
```bash
docker compose logs backend
docker compose logs frontend-customer
docker compose logs frontend-creator
```

**Problem: Wallet-Seite zeigt Fehler**

Wahrscheinlich Migration 004 nicht ausgeführt. Lösung: Daten-Volume löschen und neu starten (Schritt 4 oben mit `down -v`).

**Problem: "Connection refused" im Browser**

Container brauchen 30-60 Sekunden zum vollen Hochfahren. Warten, Seite neu laden.

**Problem: Mock-Confirm öffnet sich nicht im neuen Tab**

Browser blockiert Pop-ups. Erlaubnis für localhost erteilen, oder den Link in der Konsole kopieren und manuell öffnen.
