# Setup nach Download — Schritt für Schritt

Du hast gerade die ZIP runtergeladen. So machst du sie startklar:

## 1. ZIP entpacken & Ordner verschieben

```bash
# Im Finder: ZIP doppelklicken zum Entpacken
# Den entpackten Ordner "livecreator-mvp" verschieben nach:
# ~/Projects/livecreator-mvp/  (oder wo du willst, Hauptsache du findest ihn)
```

## 2. Terminal öffnen und in den Ordner gehen

```bash
cd ~/Projects/livecreator-mvp
```

## 3. Git initialisieren und mit GitHub verbinden

```bash
# Git im Ordner aktivieren
git init

# Alle Dateien zu Git hinzufügen
git add .

# Ersten Commit machen (= Speicherpunkt)
git commit -m "Initial commit: Session 1 - Auth + DB Schema"

# Hauptbranch umbenennen (moderner Standard)
git branch -M main

# Mit deinem GitHub-Repo verbinden
# WICHTIG: Ersetze [USERNAME] und [REPO-NAME] mit deinen echten Werten!
git remote add origin https://github.com/[USERNAME]/[REPO-NAME].git

# Hochladen!
git push -u origin main
```

Beim ersten `git push` fragt GitHub nach Login. Modern: GitHub will einen "Personal Access Token", kein Passwort mehr.
→ Anleitung: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

Oder einfacher: GitHub Desktop App installieren, dort einloggen, das Repo "klonen" → Setup automatisch.

## 4. Lokal starten (zum Testen)

Voraussetzung: **Docker Desktop** für Mac installiert (https://www.docker.com/products/docker-desktop/)

```bash
# Env-Datei kopieren
cp .env.example .env

# Alles hochfahren (dauert beim ersten Mal 5-10 Min — Container werden gebaut)
docker compose up -d

# Im Browser öffnen:
# - Backend Health-Check:  http://localhost:8080/health
# - Creator-Frontend:       http://localhost:3001
# - Kunden-Frontend:        http://localhost:3000
```

## 5. Erstes Mal testen

1. http://localhost:3001/register — als Creator registrieren
2. http://localhost:3000/register — als Kunde registrieren
3. http://localhost:3000/explore — sollte den eben erstellten Creator zeigen
4. Login bei beiden funktioniert

## 6. Stoppen

```bash
docker compose down
```

## Wenn was nicht klappt

- **Port-Konflikt:** Ist Postgres oder Redis schon auf deinem Mac am Laufen? Stoppen oder Ports in docker-compose.yml ändern.
- **Docker startet nicht:** Docker Desktop App offen? RAM zugewiesen (min. 4 GB)?
- **Compile-Fehler im Backend:** `docker compose logs backend` anschauen
- **Frontend lädt nicht:** `docker compose logs frontend-creator` und `frontend-customer` anschauen

Wenn du irgendwo hängst: Screenshot vom Fehler + Beschreibung was du gemacht hast → schick mir, ich helfe.
