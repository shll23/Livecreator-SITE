package http

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/livecreator/backend/internal/earnings"
	"github.com/livecreator/backend/internal/models"
)

// ============================================================================
// CREATOR API ENDPOINTS
//
// Alle Endpoints prüfen dass der aktuelle User die Creator-Rolle hat.
// Werden im Router unter /api/creator/* gemountet.
// ============================================================================

// GET /api/creator/stats — Verdienst-Übersicht für Dashboard
func (s *Server) creatorStats(c *fiber.Ctx) error {
	uid := currentUserID(c)
	role, _ := c.Locals("role").(models.UserRole)

	if role != models.RoleCreator {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_a_creator"})
	}

	svc := earnings.NewService(s.db)
	stats, err := svc.GetStats(c.UserContext(), uid)
	if err != nil {
		return errInternal(c, err)
	}

	return c.JSON(stats)
}

// GET /api/creator/customers/:customer_id — Info über einen Kunden aus Creator-Sicht
// Zeigt: wieviel Coins hat dieser Kunde bei MIR ausgegeben, seit wann, etc.
func (s *Server) creatorCustomerInfo(c *fiber.Ctx) error {
	uid := currentUserID(c)
	role, _ := c.Locals("role").(models.UserRole)
	ctx := c.UserContext()

	if role != models.RoleCreator {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_a_creator"})
	}

	customerID, err := uuid.Parse(c.Params("customer_id"))
	if err != nil {
		return errBadRequest(c, "invalid_customer_id")
	}

	// Customer-Stammdaten
	var (
		displayName string
		avatarURL   *string
		joinedAt    interface{}
	)
	err = s.db.QueryRow(ctx, `
		SELECT cu.display_name, cu.avatar_url, u.created_at
		FROM customers cu
		JOIN users u ON u.id = cu.user_id
		WHERE cu.user_id = $1
	`, customerID).Scan(&displayName, &avatarURL, &joinedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "customer_not_found"})
		}
		return errInternal(c, err)
	}

	// Statistiken: dieser Kunde bei diesem Creator
	var (
		lifetimeCoins   int64
		messageCount    int64
		firstMessageAt  interface{}
		lastMessageAt   interface{}
	)
	err = s.db.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(coins_earned), 0)::BIGINT,
			COUNT(*)::BIGINT,
			MIN(created_at),
			MAX(created_at)
		FROM creator_earnings
		WHERE creator_id = $1 AND customer_id = $2
	`, uid, customerID).Scan(&lifetimeCoins, &messageCount, &firstMessageAt, &lastMessageAt)
	if err != nil {
		return errInternal(c, err)
	}

	return c.JSON(fiber.Map{
		"customer_id":      customerID,
		"display_name":     displayName,
		"avatar_url":       avatarURL,
		"joined_at":        joinedAt,
		"lifetime_coins":   lifetimeCoins,
		"message_count":    messageCount,
		"first_message_at": firstMessageAt,
		"last_message_at":  lastMessageAt,
	})
}

// ============================================================================
// PROFIL-VERWALTUNG (Self-Service für Creator)
// ============================================================================

// GET /api/creator/profile — Eigenes Profil zum Bearbeiten holen
func (s *Server) getMyProfile(c *fiber.Ctx) error {
	uid := currentUserID(c)
	role, _ := c.Locals("role").(models.UserRole)
	ctx := c.UserContext()

	if role != models.RoleCreator {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_a_creator"})
	}

	var (
		handle, displayName            string
		bio, city, country, avatarURL  *string
		age                            *int
		latitude, longitude            *float64
		messagePriceCoins              int
		profileDataRaw                 []byte
		galleryURLs                    []string
	)
	err := s.db.QueryRow(ctx, `
		SELECT handle, display_name, bio, city, country, avatar_url,
		       age, latitude, longitude, message_price_coins,
		       COALESCE(profile_data::text::bytea, ''::bytea), gallery_urls
		FROM creators WHERE user_id = $1
	`, uid).Scan(&handle, &displayName, &bio, &city, &country, &avatarURL,
		&age, &latitude, &longitude, &messagePriceCoins, &profileDataRaw, &galleryURLs)
	if err != nil {
		return errInternal(c, err)
	}

	var profileData map[string]interface{}
	if len(profileDataRaw) > 0 {
		_ = json.Unmarshal(profileDataRaw, &profileData)
	}

	return c.JSON(fiber.Map{
		"handle":              handle,
		"display_name":        displayName,
		"bio":                 bio,
		"city":                city,
		"country":             country,
		"avatar_url":          avatarURL,
		"age":                 age,
		"latitude":            latitude,
		"longitude":           longitude,
		"message_price_coins": messagePriceCoins,
		"gallery_urls":        galleryURLs,
		"profile_data":        profileData,
	})
}

// updateProfileRequest — nur erlaubte Felder
type updateProfileRequest struct {
	Bio          *string                `json:"bio"`
	ProfileData  map[string]interface{} `json:"profile_data"`
}

// PATCH /api/creator/profile — Profil-Daten aktualisieren
// Erlaubt: bio + profile_data (figure, height_cm, hair_color, ..., looking_for[], turn_ons[], interests[], about_text)
// NICHT erlaubt: display_name, city, age, message_price_coins, gallery_urls (das macht Manager)
func (s *Server) updateMyProfile(c *fiber.Ctx) error {
	uid := currentUserID(c)
	role, _ := c.Locals("role").(models.UserRole)
	ctx := c.UserContext()

	if role != models.RoleCreator {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_a_creator"})
	}

	var req updateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return errBadRequest(c, "invalid_body")
	}

	// Validierung
	if req.Bio != nil && len(*req.Bio) > 500 {
		return errBadRequest(c, "bio_too_long")
	}

	// profile_data validieren: about_text max 2000 chars
	if req.ProfileData != nil {
		if at, ok := req.ProfileData["about_text"].(string); ok && len(at) > 2000 {
			return errBadRequest(c, "about_text_too_long")
		}
	}

	// Update
	updates := []string{}
	args := []interface{}{uid}
	argIdx := 2

	if req.Bio != nil {
		updates = append(updates, "bio = $"+itoa(argIdx))
		args = append(args, *req.Bio)
		argIdx++
	}
	if req.ProfileData != nil {
		pd, err := json.Marshal(req.ProfileData)
		if err != nil {
			return errInternal(c, err)
		}
		updates = append(updates, "profile_data = $"+itoa(argIdx)+"::jsonb")
		args = append(args, string(pd))
		argIdx++
	}

	if len(updates) == 0 {
		return c.JSON(fiber.Map{"updated": false})
	}

	sql := "UPDATE creators SET " + joinStrings(updates, ", ") + " WHERE user_id = $1"
	_, err := s.db.Exec(ctx, sql, args...)
	if err != nil {
		return errInternal(c, err)
	}

	return c.JSON(fiber.Map{"updated": true})
}

// Helper: int -> string (statt strconv um Import zu sparen)
func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	neg := i < 0
	if neg {
		i = -i
	}
	b := [16]byte{}
	pos := len(b)
	for i > 0 {
		pos--
		b[pos] = byte('0' + i%10)
		i /= 10
	}
	if neg {
		pos--
		b[pos] = '-'
	}
	return string(b[pos:])
}

func joinStrings(parts []string, sep string) string {
	if len(parts) == 0 {
		return ""
	}
	out := parts[0]
	for _, p := range parts[1:] {
		out += sep + p
	}
	return out
}

// Unused warning verhindern — wir brauchen errors-Package im File
var _ = errors.New

// ============================================================================
// PAYOUTS (Auszahlungen)
// ============================================================================

// GET /api/creator/payouts — Eigene Auszahlungs-Historie
func (s *Server) listMyPayouts(c *fiber.Ctx) error {
	uid := currentUserID(c)
	role, _ := c.Locals("role").(models.UserRole)
	ctx := c.UserContext()

	if role != models.RoleCreator {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_a_creator"})
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, period_year, period_month, coins_earned, messages_count,
		       amount_cents, tier_percent, status,
		       invoice_path IS NOT NULL AS has_invoice,
		       paid_at, created_at
		FROM payouts
		WHERE creator_id = $1
		ORDER BY period_year DESC, period_month DESC
	`, uid)
	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	payouts := []fiber.Map{}
	for rows.Next() {
		var (
			id             uuid.UUID
			year           int
			month          int
			coinsEarned    int64
			messages       int64
			amountCents    int64
			tierPercent    *float64
			status         string
			hasInvoice     bool
			paidAt         interface{}
			createdAt      interface{}
		)
		if err := rows.Scan(&id, &year, &month, &coinsEarned, &messages,
			&amountCents, &tierPercent, &status, &hasInvoice, &paidAt, &createdAt); err != nil {
			return errInternal(c, err)
		}
		payouts = append(payouts, fiber.Map{
			"id":              id,
			"period_year":     year,
			"period_month":    month,
			"coins_earned":    coinsEarned,
			"messages_count":  messages,
			"amount_cents":    amountCents,
			"tier_percent":    tierPercent,
			"status":          status,
			"has_invoice":     hasInvoice,
			"paid_at":         paidAt,
			"created_at":      createdAt,
		})
	}
	return c.JSON(fiber.Map{"payouts": payouts})
}

// GET /api/creator/payouts/:id/invoice — Rechnung herunterladen
func (s *Server) downloadMyInvoice(c *fiber.Ctx) error {
	uid := currentUserID(c)
	role, _ := c.Locals("role").(models.UserRole)
	ctx := c.UserContext()

	if role != models.RoleCreator {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_a_creator"})
	}

	payoutID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errBadRequest(c, "invalid_payout_id")
	}

	var invoicePath *string
	err = s.db.QueryRow(ctx, `
		SELECT invoice_path FROM payouts
		WHERE id = $1 AND creator_id = $2
	`, payoutID, uid).Scan(&invoicePath)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "payout_not_found"})
		}
		return errInternal(c, err)
	}

	if invoicePath == nil || *invoicePath == "" {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no_invoice"})
	}

	// Pfad muss unter STORAGE_PATH liegen (Security)
	storageBase := os.Getenv("STORAGE_PATH")
	if storageBase == "" {
		storageBase = "/app/storage"
	}
	// invoice_path ist relativ, z.B. "invoices/2026-05/elena.pdf"
	cleanPath := strings.TrimPrefix(*invoicePath, "/")
	absPath := filepath.Join(storageBase, cleanPath)

	// Anti-Path-Traversal Check
	if !strings.HasPrefix(filepath.Clean(absPath), filepath.Clean(storageBase)) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "invalid_path"})
	}

	// Datei prüfen
	if _, err := os.Stat(absPath); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "invoice_missing"})
	}

	// Als Download anbieten
	filename := filepath.Base(absPath)
	c.Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	return c.SendFile(absPath)
}
