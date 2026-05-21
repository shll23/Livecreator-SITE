package http

import (
	"errors"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/livecreator/backend/internal/models"
)

// ============================================================================
// ADMIN HANDLERS
//
// Alle Endpoints unter /api/admin/* erfordern role='admin'.
// Routing-Middleware (requireAdmin) prüft das einmalig.
// ============================================================================

// Middleware: nur Admins durchlassen
func (s *Server) requireAdmin(c *fiber.Ctx) error {
	role, _ := c.Locals("role").(models.UserRole)
	if role != models.RoleAdmin {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "admin_required"})
	}
	return c.Next()
}

// ============================================================================
// PHOTO MODERATION
// ============================================================================

// GET /api/admin/photos/pending — Alle Photos im Review-Status
func (s *Server) adminListPendingPhotos(c *fiber.Ctx) error {
	ctx := c.UserContext()

	rows, err := s.db.Query(ctx, `
		SELECT
			pp.id, pp.file_path, pp.thumb_path, pp.status,
			pp.width, pp.height, pp.file_size_bytes, pp.created_at,
			pp.creator_id, cr.display_name, cr.handle, cr.city, cr.age
		FROM profile_photos pp
		JOIN creators cr ON cr.user_id = pp.creator_id
		WHERE pp.status = 'pending_review'
		ORDER BY pp.created_at ASC
	`)
	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	photos := []fiber.Map{}
	for rows.Next() {
		var (
			id              uuid.UUID
			filePath        string
			thumbPath       *string
			status          string
			width, height   *int
			fileSize        *int
			createdAt       interface{}
			creatorID       uuid.UUID
			displayName     string
			handle          string
			city            *string
			age             *int
		)
		if err := rows.Scan(&id, &filePath, &thumbPath, &status,
			&width, &height, &fileSize, &createdAt,
			&creatorID, &displayName, &handle, &city, &age); err != nil {
			return errInternal(c, err)
		}
		photos = append(photos, fiber.Map{
			"id":              id,
			"file_path":       filePath,
			"thumb_path":      thumbPath,
			"status":          status,
			"width":           width,
			"height":          height,
			"file_size_bytes": fileSize,
			"created_at":      createdAt,
			"creator": fiber.Map{
				"id":           creatorID,
				"display_name": displayName,
				"handle":       handle,
				"city":         city,
				"age":          age,
			},
		})
	}
	return c.JSON(fiber.Map{"photos": photos})
}

// POST /api/admin/photos/:id/approve
func (s *Server) adminApprovePhoto(c *fiber.Ctx) error {
	uid := currentUserID(c)
	ctx := c.UserContext()

	photoID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errBadRequest(c, "invalid_photo_id")
	}

	tag, err := s.db.Exec(ctx, `
		UPDATE profile_photos
		SET status = 'approved',
		    rejection_reason = NULL,
		    reviewed_at = NOW(),
		    reviewed_by = $1
		WHERE id = $2 AND status = 'pending_review'
	`, uid, photoID)
	if err != nil {
		return errInternal(c, err)
	}
	if tag.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "photo_not_found_or_not_pending"})
	}

	// === PUSH an Creator: Foto freigegeben ===
	var creatorID uuid.UUID
	if err := s.db.QueryRow(ctx, `SELECT creator_id FROM profile_photos WHERE id = $1`, photoID).Scan(&creatorID); err == nil {
		s.notifyCreatorPhotoApproved(ctx, creatorID)
	}

	return c.JSON(fiber.Map{"approved": true})
}

type rejectPhotoRequest struct {
	Reason string `json:"reason"`
}

// POST /api/admin/photos/:id/reject
func (s *Server) adminRejectPhoto(c *fiber.Ctx) error {
	uid := currentUserID(c)
	ctx := c.UserContext()

	photoID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errBadRequest(c, "invalid_photo_id")
	}

	var req rejectPhotoRequest
	if err := c.BodyParser(&req); err != nil {
		return errBadRequest(c, "invalid_body")
	}
	if len(req.Reason) > 500 {
		return errBadRequest(c, "reason_too_long")
	}

	tag, err := s.db.Exec(ctx, `
		UPDATE profile_photos
		SET status = 'rejected',
		    rejection_reason = $1,
		    reviewed_at = NOW(),
		    reviewed_by = $2
		WHERE id = $3 AND status = 'pending_review'
	`, req.Reason, uid, photoID)
	if err != nil {
		return errInternal(c, err)
	}
	if tag.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "photo_not_found_or_not_pending"})
	}
	return c.JSON(fiber.Map{"rejected": true})
}

// Unused-import-Killer (errors/pgx werden später in andere Handler gebraucht)
var _ = errors.New
var _ = pgx.ErrNoRows

// ============================================================================
// PAYOUTS-MANAGEMENT
// ============================================================================

// GET /api/admin/creators — Liste aller Frauen für Payout-Erstellung
func (s *Server) adminListCreators(c *fiber.Ctx) error {
	ctx := c.UserContext()

	rows, err := s.db.Query(ctx, `
		SELECT cr.user_id, cr.handle, cr.display_name, cr.city, cr.age,
		       u.status,
		       COALESCE((
		           SELECT SUM(coins_earned)::BIGINT FROM creator_earnings
		           WHERE creator_id = cr.user_id
		       ), 0) AS lifetime_coins,
		       COALESCE((
		           SELECT COUNT(*)::BIGINT FROM creator_earnings
		           WHERE creator_id = cr.user_id
		       ), 0) AS lifetime_messages
		FROM creators cr
		JOIN users u ON u.id = cr.user_id
		ORDER BY cr.display_name ASC
	`)
	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	creators := []fiber.Map{}
	for rows.Next() {
		var (
			id               uuid.UUID
			handle           string
			displayName      string
			city             *string
			age              *int
			status           string
			lifetimeCoins    int64
			lifetimeMessages int64
		)
		if err := rows.Scan(&id, &handle, &displayName, &city, &age, &status,
			&lifetimeCoins, &lifetimeMessages); err != nil {
			return errInternal(c, err)
		}
		creators = append(creators, fiber.Map{
			"id":                id,
			"handle":            handle,
			"display_name":      displayName,
			"city":              city,
			"age":               age,
			"status":            status,
			"lifetime_coins":    lifetimeCoins,
			"lifetime_messages": lifetimeMessages,
		})
	}
	return c.JSON(fiber.Map{"creators": creators})
}

// GET /api/admin/creators/:id/monthly-earnings?year=2026&month=4
// Zeigt was eine Frau in diesem Monat verdient hat (für Payout-Erstellung)
func (s *Server) adminCreatorMonthlyEarnings(c *fiber.Ctx) error {
	ctx := c.UserContext()

	creatorID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errBadRequest(c, "invalid_creator_id")
	}

	year := c.QueryInt("year", 0)
	month := c.QueryInt("month", 0)
	if year < 2020 || month < 1 || month > 12 {
		return errBadRequest(c, "invalid_period")
	}

	var (
		coinsEarned      int64
		messagesCount    int64
		commissionCents  int64
	)
	err = s.db.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(coins_earned), 0)::BIGINT,
			COUNT(*)::BIGINT,
			COALESCE(SUM(commission_cents), 0)::BIGINT
		FROM creator_earnings
		WHERE creator_id = $1
		  AND EXTRACT(YEAR FROM created_at) = $2
		  AND EXTRACT(MONTH FROM created_at) = $3
	`, creatorID, year, month).Scan(&coinsEarned, &messagesCount, &commissionCents)
	if err != nil {
		return errInternal(c, err)
	}

	// Existiert schon ein Payout für diese Periode?
	var existingPayoutID *uuid.UUID
	err = s.db.QueryRow(ctx, `
		SELECT id FROM payouts
		WHERE creator_id = $1 AND period_year = $2 AND period_month = $3
	`, creatorID, year, month).Scan(&existingPayoutID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return errInternal(c, err)
	}

	return c.JSON(fiber.Map{
		"creator_id":         creatorID,
		"year":               year,
		"month":              month,
		"coins_earned":       coinsEarned,
		"messages_count":     messagesCount,
		"commission_cents":   commissionCents,
		"existing_payout_id": existingPayoutID,
	})
}

// POST /api/admin/payouts — Payout-Eintrag erstellen
type createPayoutRequest struct {
	CreatorID     string  `json:"creator_id"`
	Year          int     `json:"year"`
	Month         int     `json:"month"`
	CoinsEarned   int64   `json:"coins_earned"`
	MessagesCount int64   `json:"messages_count"`
	AmountCents   int64   `json:"amount_cents"`
	TierPercent   float64 `json:"tier_percent"`
	Notes         string  `json:"notes"`
}

func (s *Server) adminCreatePayout(c *fiber.Ctx) error {
	uid := currentUserID(c)
	ctx := c.UserContext()

	var req createPayoutRequest
	if err := c.BodyParser(&req); err != nil {
		return errBadRequest(c, "invalid_body")
	}

	creatorID, err := uuid.Parse(req.CreatorID)
	if err != nil {
		return errBadRequest(c, "invalid_creator_id")
	}
	if req.Year < 2020 || req.Month < 1 || req.Month > 12 {
		return errBadRequest(c, "invalid_period")
	}
	if req.AmountCents < 0 {
		return errBadRequest(c, "invalid_amount")
	}

	// Prüfen ob schon vorhanden
	var existsID uuid.UUID
	err = s.db.QueryRow(ctx, `
		SELECT id FROM payouts
		WHERE creator_id = $1 AND period_year = $2 AND period_month = $3
	`, creatorID, req.Year, req.Month).Scan(&existsID)
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":          "payout_already_exists",
			"existing_id":    existsID,
		})
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return errInternal(c, err)
	}

	// Anlegen
	var newID uuid.UUID
	err = s.db.QueryRow(ctx, `
		INSERT INTO payouts (
			creator_id, period_year, period_month,
			coins_earned, messages_count, amount_cents, tier_percent,
			status, paid_at, created_by, notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'paid', NOW(), $8, $9)
		RETURNING id
	`, creatorID, req.Year, req.Month, req.CoinsEarned, req.MessagesCount,
		req.AmountCents, req.TierPercent, uid, req.Notes).Scan(&newID)
	if err != nil {
		return errInternal(c, err)
	}

	return c.JSON(fiber.Map{"id": newID, "created": true})
}

// POST /api/admin/payouts/:id/invoice — Rechnungs-PDF hochladen
func (s *Server) adminUploadInvoice(c *fiber.Ctx) error {
	ctx := c.UserContext()

	payoutID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errBadRequest(c, "invalid_payout_id")
	}

	fileHeader, err := c.FormFile("invoice")
	if err != nil {
		return errBadRequest(c, "no_file")
	}
	if fileHeader.Size > 10*1024*1024 { // 10MB
		return errBadRequest(c, "file_too_large")
	}

	// Prüfen ob Payout existiert + Period holen für Pfad
	var year, month int
	err = s.db.QueryRow(ctx, `
		SELECT period_year, period_month FROM payouts WHERE id = $1
	`, payoutID).Scan(&year, &month)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "payout_not_found"})
		}
		return errInternal(c, err)
	}

	// Pfad bauen: storage/invoices/{year}-{month:02d}/{payoutID}.pdf
	base := storagePath()
	dirRel := "invoices/" + uuid.UUID{}.String()[:0] // wird gleich gesetzt
	_ = dirRel
	periodStr := ""
	if month < 10 {
		periodStr = "0" + string(rune('0'+month))
	} else {
		periodStr = string(rune('0'+month/10)) + string(rune('0'+month%10))
	}
	yearStr := ""
	for n := year; n > 0; n /= 10 {
		yearStr = string(rune('0'+n%10)) + yearStr
	}
	if yearStr == "" {
		yearStr = "0"
	}

	dirRelFinal := "invoices/" + yearStr + "-" + periodStr
	dirAbs := storagePath() + "/" + dirRelFinal
	_ = base

	if err := os.MkdirAll(dirAbs, 0755); err != nil {
		return errInternal(c, err)
	}

	fileName := payoutID.String() + ".pdf"
	fileRel := dirRelFinal + "/" + fileName
	fileAbs := storagePath() + "/" + fileRel

	if err := c.SaveFile(fileHeader, fileAbs); err != nil {
		return errInternal(c, err)
	}

	// In DB speichern
	_, err = s.db.Exec(ctx, `
		UPDATE payouts SET invoice_path = $1, invoice_uploaded_at = NOW()
		WHERE id = $2
	`, fileRel, payoutID)
	if err != nil {
		return errInternal(c, err)
	}

	return c.JSON(fiber.Map{
		"uploaded":     true,
		"invoice_path": fileRel,
	})
}

// GET /api/admin/payouts — Alle Payouts
func (s *Server) adminListAllPayouts(c *fiber.Ctx) error {
	ctx := c.UserContext()

	rows, err := s.db.Query(ctx, `
		SELECT
			p.id, p.period_year, p.period_month, p.coins_earned, p.messages_count,
			p.amount_cents, p.tier_percent, p.status,
			p.invoice_path IS NOT NULL AS has_invoice,
			p.paid_at, p.created_at, p.notes,
			cr.user_id, cr.display_name, cr.handle
		FROM payouts p
		JOIN creators cr ON cr.user_id = p.creator_id
		ORDER BY p.period_year DESC, p.period_month DESC, cr.display_name ASC
	`)
	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	payouts := []fiber.Map{}
	for rows.Next() {
		var (
			id           uuid.UUID
			year, month  int
			coins        int64
			messages     int64
			cents        int64
			tierPercent  *float64
			status       string
			hasInvoice   bool
			paidAt       interface{}
			createdAt    interface{}
			notes        *string
			creatorID    uuid.UUID
			displayName  string
			handle       string
		)
		if err := rows.Scan(&id, &year, &month, &coins, &messages,
			&cents, &tierPercent, &status, &hasInvoice,
			&paidAt, &createdAt, &notes,
			&creatorID, &displayName, &handle); err != nil {
			return errInternal(c, err)
		}
		payouts = append(payouts, fiber.Map{
			"id":              id,
			"period_year":     year,
			"period_month":    month,
			"coins_earned":    coins,
			"messages_count":  messages,
			"amount_cents":    cents,
			"tier_percent":    tierPercent,
			"status":          status,
			"has_invoice":     hasInvoice,
			"paid_at":         paidAt,
			"created_at":      createdAt,
			"notes":           notes,
			"creator": fiber.Map{
				"id":           creatorID,
				"display_name": displayName,
				"handle":       handle,
			},
		})
	}
	return c.JSON(fiber.Map{"payouts": payouts})
}


