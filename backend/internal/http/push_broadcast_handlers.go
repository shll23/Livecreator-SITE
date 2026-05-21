package http

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/livecreator/backend/internal/push"
)

// ============================================================================
// ADMIN PUSH-BROADCAST
//
// Erlaubt Admins, eine Push-Nachricht an eine Audience zu senden.
// ============================================================================

type pushBroadcastRequest struct {
	Title    string `json:"title"`
	Body     string `json:"body"`
	Audience string `json:"audience"` // "all_customers" | "paying_customers" | "new_customers_7d" | "inactive_customers"
	ClickURL string `json:"click_url"`
}

type pushBroadcastResponse struct {
	OK         bool `json:"ok"`
	Recipients int  `json:"recipients"`
}

// POST /api/admin/push/broadcast
func (s *Server) adminPushBroadcast(c *fiber.Ctx) error {
	ctx := c.UserContext()

	var req pushBroadcastRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Body = strings.TrimSpace(req.Body)
	if req.Title == "" || req.Body == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title_and_body_required"})
	}
	if len(req.Title) > 100 || len(req.Body) > 300 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "text_too_long"})
	}

	if req.ClickURL == "" {
		req.ClickURL = "/"
	}

	// SQL je nach Audience
	var query string
	switch req.Audience {
	case "all_customers":
		query = `SELECT id FROM users WHERE role = 'customer'`
	case "paying_customers":
		query = `
			SELECT DISTINCT u.id
			FROM users u
			JOIN coin_purchases p ON p.user_id = u.id AND p.status = 'completed'
			WHERE u.role = 'customer'
		`
	case "new_customers_7d":
		query = `
			SELECT id FROM users
			WHERE role = 'customer' AND created_at >= NOW() - INTERVAL '7 days'
		`
	case "inactive_customers":
		query = `
			SELECT u.id FROM users u
			WHERE u.role = 'customer'
			  AND NOT EXISTS (
			    SELECT 1 FROM coin_purchases p
			    WHERE p.user_id = u.id AND p.status = 'completed'
			  )
		`
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_audience"})
	}

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	var userIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err == nil {
			userIDs = append(userIDs, id)
		}
	}

	if s.pushSender == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "push_disabled"})
	}

	// Async senden
	s.pushSender.SendToUsers(userIDs, push.Payload{
		Title: req.Title,
		Body:  req.Body,
		Tag:   "broadcast",
		Data: map[string]string{
			"url": req.ClickURL,
		},
	})

	return c.JSON(pushBroadcastResponse{OK: true, Recipients: len(userIDs)})
}

// GET /api/admin/push/audience-counts
// Liefert Anzahl pro Audience-Filter (fuer Vorschau im Admin-UI)
func (s *Server) adminPushAudienceCounts(c *fiber.Ctx) error {
	ctx := c.UserContext()

	counts := map[string]int{}

	queries := map[string]string{
		"all_customers":      `SELECT COUNT(*) FROM users WHERE role = 'customer'`,
		"paying_customers":   `SELECT COUNT(DISTINCT u.id) FROM users u JOIN coin_purchases p ON p.user_id = u.id AND p.status = 'completed' WHERE u.role = 'customer'`,
		"new_customers_7d":   `SELECT COUNT(*) FROM users WHERE role = 'customer' AND created_at >= NOW() - INTERVAL '7 days'`,
		"inactive_customers": `SELECT COUNT(*) FROM users u WHERE u.role = 'customer' AND NOT EXISTS (SELECT 1 FROM coin_purchases p WHERE p.user_id = u.id AND p.status = 'completed')`,
	}

	for key, q := range queries {
		var n int
		if err := s.db.QueryRow(ctx, q).Scan(&n); err == nil {
			counts[key] = n
		}
	}

	return c.JSON(fiber.Map{"counts": counts})
}
