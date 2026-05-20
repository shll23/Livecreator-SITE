// ============================================================================
// Seed-Script v2: Legt die 6 echten Frauen mit Geo-Daten als Creator an
//
// Verwendung (im Backend-Container):
//   docker compose exec backend /app/seed-creators
//
// Wird beim Backend-Build kompiliert. Idempotent: existierende Frauen werden
// auf neue Werte (age, city, lat, lng) aktualisiert.
// ============================================================================

package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Creator struct {
	Email             string
	Password          string
	Handle            string
	DisplayName       string
	Bio               string
	AvatarURL         string
	MessagePriceCoins int
	Age               int
	City              string
	Country           string
	Latitude          float64
	Longitude         float64
}

// Koordinaten der Städte (ca. Stadtmitte)
var creators = []Creator{
	{
		Email:             "lara@verliebdich.test",
		Password:          "Lara2025!",
		Handle:            "lara",
		DisplayName:       "Lara",
		Bio:               "Bin eher zurückhaltend am Anfang. Wenn ich mich wohl fühle, taue ich auf.",
		AvatarURL:         "/profiles/frau-1-lara/02.jpg",
		MessagePriceCoins: 7,
		Age:               24,
		City:              "Berlin",
		Country:           "DE",
		Latitude:          52.520008,
		Longitude:         13.404954,
	},
	{
		Email:             "valentina@verliebdich.test",
		Password:          "Valentina2025!",
		Handle:            "valentina",
		DisplayName:       "Valentina",
		Bio:               "Ich rede Klartext. Hab keine Lust auf Spielchen oder Standard-Sprüche. Wenn du echt bist, bin ich's auch.",
		AvatarURL:         "/profiles/frau-2-valentina/01-haupt.jpg",
		MessagePriceCoins: 9,
		Age:               25,
		City:              "München",
		Country:           "DE",
		Latitude:          48.137154,
		Longitude:         11.576124,
	},
	{
		Email:             "mia@verliebdich.test",
		Password:          "Mia2025!",
		Handle:            "mia",
		DisplayName:       "Mia",
		Bio:               "Schreib mich einfach an :)",
		AvatarURL:         "/profiles/frau-3-mia/01-haupt.jpg",
		MessagePriceCoins: 7,
		Age:               23,
		City:              "Hamburg",
		Country:           "DE",
		Latitude:          53.551086,
		Longitude:         9.993682,
	},
	{
		Email:             "sophia@verliebdich.test",
		Password:          "Sophia2025!",
		Handle:            "sophia",
		DisplayName:       "Sophia",
		Bio:               "Sport, Musik, Wein. Mehr brauch ich nicht. Suche jemanden zum Quatschen oder mehr — kommt drauf an.",
		AvatarURL:         "/profiles/frau-4-sophia/01-haupt.png",
		MessagePriceCoins: 8,
		Age:               26,
		City:              "Frankfurt",
		Country:           "DE",
		Latitude:          50.110924,
		Longitude:         8.682127,
	},
	{
		Email:             "elena@verliebdich.test",
		Password:          "Elena2025!",
		Handle:            "elena",
		DisplayName:       "Elena",
		Bio:               "Ich bin 29 und weiß was ich will. Keine Lust auf Jungs, die noch nicht wissen wer sie sind.",
		AvatarURL:         "/profiles/frau-5-elena/01-haupt.jpg",
		MessagePriceCoins: 10,
		Age:               29,
		City:              "Düsseldorf",
		Country:           "DE",
		Latitude:          51.227741,
		Longitude:         6.773456,
	},
	{
		Email:             "sarah@verliebdich.test",
		Password:          "Sarah2025!",
		Handle:            "sarah",
		DisplayName:       "Sarah",
		Bio:               "Ich rede gern. Aber manchmal höre ich auch einfach nur zu. Spannend wird's für mich, wenn ein Gespräch nicht oberflächlich bleibt.",
		AvatarURL:         "/profiles/frau-6-sarah/01-haupt.jpg",
		MessagePriceCoins: 10,
		Age:               31,
		City:              "Köln",
		Country:           "DE",
		Latitude:          50.937531,
		Longitude:         6.960279,
	},
}

func main() {
	host := os.Getenv("POSTGRES_HOST")
	port := os.Getenv("POSTGRES_PORT")
	user := os.Getenv("POSTGRES_USER")
	password := os.Getenv("POSTGRES_PASSWORD")
	dbname := os.Getenv("POSTGRES_DB")

	if host == "" || user == "" || password == "" || dbname == "" {
		log.Fatal("POSTGRES_HOST / POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB müssen gesetzt sein")
	}
	if port == "" {
		port = "5432"
	}

	dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		user, password, host, port, dbname)

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("DB-Verbindung fehlgeschlagen: %v", err)
	}
	defer pool.Close()

	fmt.Println("")
	fmt.Println("============================================================")
	fmt.Println(" Seed v2: Frauen als Creator mit Geo-Daten anlegen/updaten")
	fmt.Println("============================================================")
	fmt.Println("")

	updated := 0
	created := 0

	for _, c := range creators {
		// Prüfen ob User schon existiert
		var existingUserID string
		err := pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, c.Email).Scan(&existingUserID)

		if err == nil {
			// User existiert -> Creator-Profil aktualisieren
			_, err = pool.Exec(ctx, `
				UPDATE creators
				SET bio = $1,
				    avatar_url = $2,
				    message_price_coins = $3,
				    age = $4,
				    city = $5,
				    country = $6,
				    latitude = $7,
				    longitude = $8
				WHERE user_id = $9
			`, c.Bio, c.AvatarURL, c.MessagePriceCoins,
				c.Age, c.City, c.Country, c.Latitude, c.Longitude,
				existingUserID)
			if err != nil {
				log.Fatalf("Update %s fehlgeschlagen: %v", c.DisplayName, err)
			}
			fmt.Printf("  ↻  %-12s aktualisiert | %s, %d | %s\n", c.DisplayName, c.City, c.Age, c.Email)
			updated++
			continue
		}

		if !errors.Is(err, pgx.ErrNoRows) {
			log.Fatalf("DB-Lookup-Fehler: %v", err)
		}

		// Neu anlegen
		hash, err := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("bcrypt-Fehler: %v", err)
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			log.Fatalf("Transaktion-Start fehlgeschlagen: %v", err)
		}

		var userID string
		err = tx.QueryRow(ctx, `
			INSERT INTO users (email, password_hash, role, email_verified_at)
			VALUES ($1, $2, 'creator', NOW())
			RETURNING id
		`, c.Email, string(hash)).Scan(&userID)
		if err != nil {
			tx.Rollback(ctx)
			log.Fatalf("User-Insert für %s fehlgeschlagen: %v", c.DisplayName, err)
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO creators (
				user_id, handle, display_name, bio, avatar_url,
				message_price_coins, is_verified, is_listed,
				age, city, country, latitude, longitude
			)
			VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7, $8, $9, $10, $11)
		`, userID, c.Handle, c.DisplayName, c.Bio, c.AvatarURL, c.MessagePriceCoins,
			c.Age, c.City, c.Country, c.Latitude, c.Longitude)
		if err != nil {
			tx.Rollback(ctx)
			log.Fatalf("Creator-Insert für %s fehlgeschlagen: %v", c.DisplayName, err)
		}

		if err := tx.Commit(ctx); err != nil {
			log.Fatalf("Commit fehlgeschlagen: %v", err)
		}

		fmt.Printf("  ✓  %-12s neu | %s, %d | %s\n", c.DisplayName, c.City, c.Age, c.Email)
		created++
	}

	fmt.Println("")
	fmt.Println("============================================================")
	fmt.Printf(" Fertig: %d neu, %d aktualisiert\n", created, updated)
	fmt.Println("============================================================")
	fmt.Println("")
	fmt.Println(" 🌐 Test:")
	fmt.Println("    curl http://localhost:8080/api/creators")
	fmt.Println("    curl 'http://localhost:8080/api/creators?city=Berlin'")
	fmt.Println("    curl 'http://localhost:8080/api/creators?min_age=25&max_age=30'")
	fmt.Println("    curl 'http://localhost:8080/api/creators?near_lat=52.52&near_lng=13.40&radius_km=200'")
	fmt.Println("")
}
