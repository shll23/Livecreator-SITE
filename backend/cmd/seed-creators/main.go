// ============================================================================
// Seed-Script: Legt die 6 echten Frauen als Creator in die DB an
//
// Verwendung (im Backend-Container):
//   docker compose exec backend /app/seed-creators
//
// Wird beim Backend-Build kompiliert. Idempotent (kann mehrfach laufen,
// duplicate-Einträge werden übersprungen).
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
}

var creators = []Creator{
	{
		Email:             "lara@verliebdich.test",
		Password:          "Lara2025!",
		Handle:            "lara",
		DisplayName:       "Lara",
		Bio:               "Bin eher zurückhaltend am Anfang. Wenn ich mich wohl fühle, taue ich auf. 24, Berlin.",
		AvatarURL:         "/profiles/frau-1-lara/02.jpg",
		MessagePriceCoins: 7,
	},
	{
		Email:             "valentina@verliebdich.test",
		Password:          "Valentina2025!",
		Handle:            "valentina",
		DisplayName:       "Valentina",
		Bio:               "Ich rede Klartext. Hab keine Lust auf Spielchen oder Standard-Sprüche. Wenn du echt bist, bin ich's auch. 25, München.",
		AvatarURL:         "/profiles/frau-2-valentina/01-haupt.jpg",
		MessagePriceCoins: 9,
	},
	{
		Email:             "mia@verliebdich.test",
		Password:          "Mia2025!",
		Handle:            "mia",
		DisplayName:       "Mia",
		Bio:               "Schreib mich einfach an :) 23, Hamburg.",
		AvatarURL:         "/profiles/frau-3-mia/01-haupt.jpg",
		MessagePriceCoins: 7,
	},
	{
		Email:             "sophia@verliebdich.test",
		Password:          "Sophia2025!",
		Handle:            "sophia",
		DisplayName:       "Sophia",
		Bio:               "Sport, Musik, Wein. Mehr brauch ich nicht. Suche jemanden zum Quatschen oder mehr — kommt drauf an. 26, Frankfurt.",
		AvatarURL:         "/profiles/frau-4-sophia/01-haupt.png",
		MessagePriceCoins: 8,
	},
	{
		Email:             "elena@verliebdich.test",
		Password:          "Elena2025!",
		Handle:            "elena",
		DisplayName:       "Elena",
		Bio:               "Ich bin 29 und weiß was ich will. Keine Lust auf Jungs, die noch nicht wissen wer sie sind. Düsseldorf.",
		AvatarURL:         "/profiles/frau-5-elena/01-haupt.jpg",
		MessagePriceCoins: 10,
	},
	{
		Email:             "sarah@verliebdich.test",
		Password:          "Sarah2025!",
		Handle:            "sarah",
		DisplayName:       "Sarah",
		Bio:               "Ich rede gern. Aber manchmal höre ich auch einfach nur zu. Spannend wird's für mich, wenn ein Gespräch nicht oberflächlich bleibt. 31, Köln.",
		AvatarURL:         "/profiles/frau-6-sarah/01-haupt.jpg",
		MessagePriceCoins: 10,
	},
}

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable nicht gesetzt")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("DB-Verbindung fehlgeschlagen: %v", err)
	}
	defer pool.Close()

	fmt.Println("")
	fmt.Println("============================================================")
	fmt.Println(" Seed: Echte Frauen als Creator anlegen")
	fmt.Println("============================================================")
	fmt.Println("")

	skipped := 0
	created := 0

	for _, c := range creators {
		// Idempotent: schon vorhanden?
		var existingID string
		err := pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, c.Email).Scan(&existingID)
		if err == nil {
			fmt.Printf("  ⏭  %-12s schon vorhanden (übersprungen)\n", c.DisplayName)
			skipped++
			continue
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			log.Fatalf("DB-Lookup-Fehler: %v", err)
		}

		// Password hashen
		hash, err := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("bcrypt-Fehler: %v", err)
		}

		// Transaktion: User + Creator-Profil zusammen
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
				message_price_coins, is_verified, is_listed
			)
			VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)
		`, userID, c.Handle, c.DisplayName, c.Bio, c.AvatarURL, c.MessagePriceCoins)
		if err != nil {
			tx.Rollback(ctx)
			log.Fatalf("Creator-Insert für %s fehlgeschlagen: %v", c.DisplayName, err)
		}

		if err := tx.Commit(ctx); err != nil {
			log.Fatalf("Commit fehlgeschlagen: %v", err)
		}

		fmt.Printf("  ✓  %-12s | %s | %d Coins/Nachricht\n", c.DisplayName, c.Email, c.MessagePriceCoins)
		created++
	}

	fmt.Println("")
	fmt.Println("============================================================")
	fmt.Printf(" Fertig: %d neu erstellt, %d übersprungen\n", created, skipped)
	fmt.Println("============================================================")

	if created > 0 {
		fmt.Println("")
		fmt.Println(" 🔑 LOGIN-DATEN (für Tests — niemals public teilen!):")
		fmt.Println("")
		for _, c := range creators {
			fmt.Printf("    %-12s  →  Email: %-30s  Passwort: %s\n", c.DisplayName, c.Email, c.Password)
		}
		fmt.Println("")
	}

	fmt.Println(" 🌐 Test:")
	fmt.Println("    curl http://localhost:8080/api/creators | jq")
	fmt.Println("")
}
