// ============================================================================
// Seed-Creators v3 — Komplette Profile mit Galerie + profile_data
//
// Befüllt 6 echte Creator-Frauen mit:
//   - Basis-Daten (Email, Passwort, Handle, Display-Name)
//   - Geo-Daten (Alter, Stadt, Koordinaten)
//   - Avatar + Galerie (Array aller Bilder aus /public/profiles/frau-X-name/)
//   - profile_data JSONB mit allen Profil-Attributen
//
// Idempotent: UPDATE wenn existiert, sonst INSERT.
// ============================================================================

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// CreatorSeed repräsentiert eine Frau im Seed.
type CreatorSeed struct {
	Email             string
	Password          string
	Handle            string
	DisplayName       string
	Bio               string
	AvatarURL         string
	GalleryURLs       []string
	MessagePriceCoins int
	IsVerified        bool
	Age               int
	City              string
	Country           string
	Latitude          float64
	Longitude         float64
	ProfileData       map[string]any
}

func main() {
	ctx := context.Background()

	host := getenv("POSTGRES_HOST", "postgres")
	port := getenv("POSTGRES_PORT", "5432")
	user := getenv("POSTGRES_USER", "verliebdich")
	pass := getenv("POSTGRES_PASSWORD", "verliebdich")
	db := getenv("POSTGRES_DB", "verliebdich")

	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, port, db)

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("DB-Verbindung fehlgeschlagen: %v", err)
	}
	defer pool.Close()

	creators := buildSeedData()

	for _, c := range creators {
		if err := upsertCreator(ctx, pool, c); err != nil {
			log.Printf("✗ %s fehlgeschlagen: %v\n", c.DisplayName, err)
			continue
		}
	}

	log.Println("✓ Seed abgeschlossen.")
}

// ============================================================================
// Daten für alle 6 Frauen
// ============================================================================
func buildSeedData() []CreatorSeed {
	return []CreatorSeed{
		// ---- LARA — Berlin, 24, schüchterner Typ ----
		{
			Email:             "lara@verliebdich.test",
			Password:          "Lara2025!",
			Handle:            "lara",
			DisplayName:       "Lara",
			Bio:               "Bin eher zurückhaltend am Anfang. Wenn ich mich wohl fühle, taue ich auf.",
			AvatarURL:         "/profiles/frau-1-lara/02.jpg",
			GalleryURLs:       []string{"/profiles/frau-1-lara/02.jpg", "/profiles/frau-1-lara/01-haupt.jpg", "/profiles/frau-1-lara/03.jpg", "/profiles/frau-1-lara/04.jpg", "/profiles/frau-1-lara/05.jpg", "/profiles/frau-1-lara/06.jpg"},
			MessagePriceCoins: 7,
			IsVerified:        true,
			Age:               24,
			City:              "Berlin",
			Country:           "DE",
			Latitude:          52.520008,
			Longitude:         13.404954,
			ProfileData: map[string]any{
				"height_cm":      168,
				"figure":         "schlank",
				"hair_color":     "braun",
				"hair_length":    "lang",
				"eye_color":      "braun",
				"zodiac":         "Stier",
				"smoker":         "nein",
				"marital_status": "Single",
				"tattoos":        "keine",
				"piercings":      "einige",
				"looking_for":    []string{"Nur Chat", "Flirt", "Dates", "Freundschaft Plus"},
				"turn_ons":       []string{"Romantik", "Spontaneität", "Lange Nächte"},
				"interests":      []string{"Musik", "Reisen", "Filme", "Wellness"},
				"about_text":     "Schreib mich an, dann sehen wir wohin es uns trägt 🌸",
			},
		},

		// ---- VALENTINA — München, 25, selbstbewusste Italienerin ----
		{
			Email:             "valentina@verliebdich.test",
			Password:          "Valentina2025!",
			Handle:            "valentina",
			DisplayName:       "Valentina",
			Bio:               "Ich rede Klartext. Hab keine Lust auf Spielchen oder Standard-Sprüche. Wenn du echt bist, bin ich's auch.",
			AvatarURL:         "/profiles/frau-2-valentina/01-haupt.jpg",
			GalleryURLs:       []string{"/profiles/frau-2-valentina/01-haupt.jpg", "/profiles/frau-2-valentina/02.jpg", "/profiles/frau-2-valentina/03.jpg", "/profiles/frau-2-valentina/04.jpg"},
			MessagePriceCoins: 9,
			IsVerified:        true,
			Age:               25,
			City:              "München",
			Country:           "DE",
			Latitude:          48.137154,
			Longitude:         11.576124,
			ProfileData: map[string]any{
				"height_cm":      172,
				"figure":         "sportlich",
				"hair_color":     "schwarz",
				"hair_length":    "lang",
				"eye_color":      "braun",
				"zodiac":         "Skorpion",
				"smoker":         "gelegentlich",
				"marital_status": "Single",
				"tattoos":        "einige",
				"piercings":      "einige",
				"looking_for":    []string{"Flirt", "Dates", "Freundschaft Plus", "Sex-Chat"},
				"turn_ons":       []string{"Spontaneität", "Dominanz", "Erotische Gespräche", "Dessous"},
				"interests":      []string{"Sport", "Mode", "Nightlife", "Tanzen", "Reisen"},
				"about_text":     "Wenn du mich beeindrucken willst — sei ehrlich, sei direkt 🔥",
			},
		},

		// ---- MIA — Hamburg, 23, jung & schüchtern ----
		{
			Email:             "mia@verliebdich.test",
			Password:          "Mia2025!",
			Handle:            "mia",
			DisplayName:       "Mia",
			Bio:               "Schreib mich einfach an :)",
			AvatarURL:         "/profiles/frau-3-mia/01-haupt.jpg",
			GalleryURLs:       []string{"/profiles/frau-3-mia/01-haupt.jpg", "/profiles/frau-3-mia/02.jpg", "/profiles/frau-3-mia/03.jpg"},
			MessagePriceCoins: 7,
			IsVerified:        true,
			Age:               23,
			City:              "Hamburg",
			Country:           "DE",
			Latitude:          53.551086,
			Longitude:         9.993682,
			ProfileData: map[string]any{
				"height_cm":      165,
				"figure":         "schlank",
				"hair_color":     "blond",
				"hair_length":    "lang",
				"eye_color":      "grün",
				"zodiac":         "Krebs",
				"smoker":         "nein",
				"marital_status": "Single",
				"tattoos":        "keine",
				"piercings":      "keine",
				"looking_for":    []string{"Nur Chat", "Flirt", "Dates", "Bilder-Tausch"},
				"turn_ons":       []string{"Romantik", "Hingabe", "Rollenspiele"},
				"interests":      []string{"Musik", "Lesen", "Tiere", "Yoga"},
				"about_text":     "Bin noch neu hier, lerne dich gerne kennen 💕",
			},
		},

		// ---- SOPHIA — Frankfurt, 26, Fitness-Mädel ----
		{
			Email:             "sophia@verliebdich.test",
			Password:          "Sophia2025!",
			Handle:            "sophia",
			DisplayName:       "Sophia",
			Bio:               "Sport, Musik, Wein. Mehr brauch ich nicht. Suche jemanden zum Quatschen oder mehr — kommt drauf an.",
			AvatarURL:         "/profiles/frau-4-sophia/01-haupt.png",
			GalleryURLs:       []string{"/profiles/frau-4-sophia/01-haupt.png", "/profiles/frau-4-sophia/02.png", "/profiles/frau-4-sophia/03.jpg"},
			MessagePriceCoins: 8,
			IsVerified:        true,
			Age:               26,
			City:              "Frankfurt",
			Country:           "DE",
			Latitude:          50.110924,
			Longitude:         8.682127,
			ProfileData: map[string]any{
				"height_cm":      170,
				"figure":         "sportlich",
				"hair_color":     "blond",
				"hair_length":    "lang",
				"eye_color":      "blau",
				"zodiac":         "Löwe",
				"smoker":         "nein",
				"marital_status": "Single",
				"tattoos":        "keine",
				"piercings":      "einige",
				"looking_for":    []string{"Dates", "Freundschaft Plus", "One-Night-Stand", "Sex-Chat"},
				"turn_ons":       []string{"Outdoor-Abenteuer", "Spontaneität", "Lange Nächte", "Dessous"},
				"interests":      []string{"Sport", "Wellness", "Reisen", "Musik", "Mode"},
				"about_text":     "Energie, Bewegung, Lachen. Wer mithalten kann — willkommen 💪",
			},
		},

		// ---- ELENA — Düsseldorf, 29, selbstbewusste Frau ----
		{
			Email:             "elena@verliebdich.test",
			Password:          "Elena2025!",
			Handle:            "elena",
			DisplayName:       "Elena",
			Bio:               "Ich bin 29 und weiß was ich will. Keine Lust auf Jungs, die noch nicht wissen wer sie sind.",
			AvatarURL:         "/profiles/frau-5-elena/01-haupt.jpg",
			GalleryURLs:       []string{"/profiles/frau-5-elena/01-haupt.jpg", "/profiles/frau-5-elena/02.jpg", "/profiles/frau-5-elena/03.jpg"},
			MessagePriceCoins: 10,
			IsVerified:        true,
			Age:               29,
			City:              "Düsseldorf",
			Country:           "DE",
			Latitude:          51.227741,
			Longitude:         6.773456,
			ProfileData: map[string]any{
				"height_cm":      175,
				"figure":         "kurvig",
				"hair_color":     "schwarz",
				"hair_length":    "mittel",
				"eye_color":      "braun",
				"zodiac":         "Jungfrau",
				"smoker":         "nein",
				"marital_status": "es ist kompliziert",
				"tattoos":        "einige",
				"piercings":      "einige",
				"looking_for":    []string{"Flirt", "Freundschaft Plus", "Seitensprung", "Sex-Chat", "Bilder-Tausch"},
				"turn_ons":       []string{"Dominanz", "Erotische Gespräche", "Dessous", "Rollenspiele"},
				"interests":      []string{"Mode", "Wellness", "Nightlife", "Musik", "Reisen"},
				"about_text":     "Reife trifft Leidenschaft. Du weißt was du tust? Beweise es mir 😏",
			},
		},

		// ---- SARAH — Köln, 31, tiefgründig ----
		{
			Email:             "sarah@verliebdich.test",
			Password:          "Sarah2025!",
			Handle:            "sarah",
			DisplayName:       "Sarah",
			Bio:               "Ich rede gern. Aber manchmal höre ich auch einfach nur zu. Spannend wird's für mich, wenn ein Gespräch nicht oberflächlich bleibt.",
			AvatarURL:         "/profiles/frau-6-sarah/01-haupt.jpg",
			GalleryURLs:       []string{"/profiles/frau-6-sarah/01-haupt.jpg", "/profiles/frau-6-sarah/02.jpg", "/profiles/frau-6-sarah/03.jpg"},
			MessagePriceCoins: 10,
			IsVerified:        true,
			Age:               31,
			City:              "Köln",
			Country:           "DE",
			Latitude:          50.937531,
			Longitude:         6.960279,
			ProfileData: map[string]any{
				"height_cm":      169,
				"figure":         "schlank",
				"hair_color":     "braun",
				"hair_length":    "mittel",
				"eye_color":      "haselnuss",
				"zodiac":         "Waage",
				"smoker":         "nein",
				"marital_status": "geschieden",
				"tattoos":        "keine",
				"piercings":      "keine",
				"looking_for":    []string{"Nur Chat", "Flirt", "Freundschaft Plus", "Ernsthafte Beziehung"},
				"turn_ons":       []string{"Romantik", "Erotische Gespräche", "Hingabe", "Lange Nächte"},
				"interests":      []string{"Lesen", "Kunst", "Reisen", "Kochen", "Wellness"},
				"about_text":     "Worte sind mein Lieblings-Vorspiel. Wer mich erreichen will, schreibt mit Tiefe 📖",
			},
		},
	}
}

// ============================================================================
// UPSERT
// ============================================================================
func upsertCreator(ctx context.Context, pool *pgxpool.Pool, c CreatorSeed) error {
	// 1) Vor-Check: Existiert der User? (Außerhalb jeder Transaktion damit ein
	//    "no rows" Fehler nicht den ganzen TX-Block ungültig macht)
	// users.email ist citext (case-insensitive), kein separates email_norm nötig.
	var userID string
	err := pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, c.Email).Scan(&userID)

	// pgx liefert pgx.ErrNoRows bei nicht-vorhandenem Datensatz
	userExists := err == nil
	if err != nil && err != pgx.ErrNoRows {
		return fmt.Errorf("check user: %w", err)
	}

	// 2) Helpers vorbereiten
	hash, err := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("bcrypt: %w", err)
	}

	profileJSON, err := json.Marshal(c.ProfileData)
	if err != nil {
		return fmt.Errorf("json marshal: %w", err)
	}

	// 3) Transaktion starten — jetzt wissen wir den Pfad
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("tx begin: %w", err)
	}
	defer tx.Rollback(ctx)

	if !userExists {
		// User neu anlegen
		err = tx.QueryRow(ctx, `
			INSERT INTO users (email, password_hash, role, status)
			VALUES ($1, $2, 'creator', 'active')
			RETURNING id
		`, c.Email, string(hash)).Scan(&userID)
		if err != nil {
			return fmt.Errorf("user insert: %w", err)
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO creators (
				user_id, handle, display_name, bio, avatar_url,
				message_price_coins, is_verified, is_listed,
				age, city, country, latitude, longitude,
				gallery_urls, profile_data
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10, $11, $12, $13, $14)
		`, userID, c.Handle, c.DisplayName, c.Bio, c.AvatarURL,
			c.MessagePriceCoins, c.IsVerified,
			c.Age, c.City, c.Country, c.Latitude, c.Longitude,
			c.GalleryURLs, profileJSON)
		if err != nil {
			return fmt.Errorf("creator insert: %w", err)
		}

		fmt.Printf("✓  %-10s neu          | %s, %d | %s\n", c.DisplayName, c.City, c.Age, c.Email)
	} else {
		// User existiert → updaten
		_, err = tx.Exec(ctx, `
			UPDATE users SET password_hash = $1, role = 'creator', status = 'active'
			WHERE id = $2
		`, string(hash), userID)
		if err != nil {
			return fmt.Errorf("user update: %w", err)
		}

		_, err = tx.Exec(ctx, `
			UPDATE creators SET
				handle = $2, display_name = $3, bio = $4, avatar_url = $5,
				message_price_coins = $6, is_verified = $7, is_listed = TRUE,
				age = $8, city = $9, country = $10, latitude = $11, longitude = $12,
				gallery_urls = $13, profile_data = $14
			WHERE user_id = $1
		`, userID, c.Handle, c.DisplayName, c.Bio, c.AvatarURL,
			c.MessagePriceCoins, c.IsVerified,
			c.Age, c.City, c.Country, c.Latitude, c.Longitude,
			c.GalleryURLs, profileJSON)
		if err != nil {
			return fmt.Errorf("creator update: %w", err)
		}

		fmt.Printf("↻  %-10s aktualisiert | %s, %d | %s\n", c.DisplayName, c.City, c.Age, c.Email)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("tx commit: %w", err)
	}
	return nil
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
