package http

import (
	"errors"
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
