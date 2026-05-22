package http

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/livecreator/backend/internal/wallet"
)

const signupBonusCoins = 50

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *Server) createAndSendVerificationEmail(ctx context.Context, userID uuid.UUID, email string) {
	token, err := generateToken()
	if err != nil {
		log.Printf("[verify] Token-Gen-Fehler: %v", err)
		return
	}
	_, err = s.db.Exec(ctx, `
		INSERT INTO email_verification_tokens (token, user_id, expires_at)
		VALUES ($1, $2, now() + interval '24 hours')
	`, token, userID)
	if err != nil {
		log.Printf("[verify] Token-Insert-Fehler: %v", err)
		return
	}
	verifyURL := fmt.Sprintf("%s/api/auth/verify-email?token=%s", s.cfg.PublicBackendURL, token)
	htmlBody := fmt.Sprintf(`
		<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px">
			<h2 style="color:#e91e8c">Willkommen bei verliebdich.com!</h2>
			<p>Bitte bestätige deine E-Mail-Adresse, um <strong>50 Bonus-Coins</strong> zu erhalten.</p>
			<p style="text-align:center;margin:32px 0">
				<a href="%s" style="background:#e91e8c;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">E-Mail bestätigen</a>
			</p>
			<p style="color:#888;font-size:13px">Der Link ist 24 Stunden gültig. Falls du dich nicht registriert hast, ignoriere diese Mail.</p>
		</div>`, verifyURL)
	if err := s.mailer.Send(email, "Bestätige deine E-Mail – 50 Bonus-Coins warten!", htmlBody); err != nil {
		log.Printf("[verify] Mail-Versand-Fehler an %s: %v", email, err)
	}
}

func (s *Server) verifyEmail(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return errBadRequest(c, "missing_token")
	}
	ctx := c.UserContext()

	var userID uuid.UUID
	var expiresAt time.Time
	var usedAt *time.Time
	err := s.db.QueryRow(ctx, `
		SELECT user_id, expires_at, used_at FROM email_verification_tokens WHERE token = $1
	`, token).Scan(&userID, &expiresAt, &usedAt)
	if err != nil {
		return s.verifyRedirect(c, "invalid")
	}
	if usedAt != nil {
		return s.verifyRedirect(c, "already")
	}
	if time.Now().After(expiresAt) {
		return s.verifyRedirect(c, "expired")
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return errInternal(c, err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `UPDATE email_verification_tokens SET used_at = now() WHERE token = $1`, token); err != nil {
		return errInternal(c, err)
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET email_verified_at = now() WHERE id = $1 AND email_verified_at IS NULL`, userID); err != nil {
		return errInternal(c, err)
	}

	// Prüfen ob Bonus noch aussteht (Flag noch NICHT setzen!)
	var bonusPending bool
	err = tx.QueryRow(ctx, `
		SELECT NOT signup_bonus_granted FROM customers WHERE user_id = $1
	`, userID).Scan(&bonusPending)
	if err != nil {
		return errInternal(c, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return errInternal(c, err)
	}

	// Bonus buchen ZUERST, Flag erst nach Erfolg setzen → robust gegen Fehler/Retry
	if bonusPending {
		_, werr := s.wallet.RecordTransaction(ctx, "admin_adjustment", "signup_bonus:"+userID.String(),
			[]wallet.Entry{
				{AccountKey: wallet.SystemWriteoff, AccountType: "system", AmountCoins: -int64(signupBonusCoins), Description: "Signup-Bonus Ausgabe"},
				{AccountKey: wallet.UserAccountKey(userID), AccountType: "user", AmountCoins: int64(signupBonusCoins), Description: "Willkommens-Bonus (Email bestaetigt)"},
			},
			map[string]interface{}{"reason": "email_verified_signup_bonus"},
		)
		if werr != nil {
			log.Printf("[verify] Bonus-Buchung-Fehler für %s: %v", userID, werr)
		} else {
			// Buchung ok → jetzt erst Flag setzen
			if _, ferr := s.db.Exec(ctx, `UPDATE customers SET signup_bonus_granted = true WHERE user_id = $1`, userID); ferr != nil {
				log.Printf("[verify] Flag-Set-Fehler für %s: %v", userID, ferr)
			}
		}
	}

	return s.verifyRedirect(c, "success")
}

func (s *Server) verifyRedirect(c *fiber.Ctx, status string) error {
	return c.Redirect(fmt.Sprintf("%s/verify-result?status=%s", s.cfg.PublicFrontendURL, status), fiber.StatusFound)
}
