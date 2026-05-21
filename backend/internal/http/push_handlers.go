package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ============================================================================
// PUSH-NOTIFICATIONS (Web-Push API mit VAPID)
// ============================================================================

// GET /api/notifications/vapid-public-key
// Frontend braucht den Public-Key um sich zu subscriben.
func (s *Server) pushVapidPublicKey(c *fiber.Ctx) error {
	if s.pushSender == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "push_disabled"})
	}
	return c.JSON(fiber.Map{"public_key": s.pushSender.PublicKey()})
}

// POST /api/notifications/subscribe
// Body: { endpoint, keys: { p256dh, auth } }
type pushSubscribeRequest struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

func (s *Server) pushSubscribe(c *fiber.Ctx) error {
	ctx := c.UserContext()
	uid, _ := c.Locals("user_id").(uuid.UUID)
	if uid == uuid.Nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthenticated"})
	}

	var req pushSubscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}
	if req.Endpoint == "" || req.Keys.P256dh == "" || req.Keys.Auth == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_fields"})
	}

	userAgent := c.Get("User-Agent")

	// UPSERT: bei gleichem (user_id, endpoint) -> updaten
	_, err := s.db.Exec(ctx, `
		INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, endpoint) DO UPDATE
		  SET p256dh_key = EXCLUDED.p256dh_key,
		      auth_key = EXCLUDED.auth_key,
		      user_agent = EXCLUDED.user_agent,
		      last_used_at = NOW()
	`, uid, req.Endpoint, req.Keys.P256dh, req.Keys.Auth, userAgent)
	if err != nil {
		return errInternal(c, err)
	}

	return c.JSON(fiber.Map{"ok": true})
}

// DELETE /api/notifications/unsubscribe
// Body: { endpoint }
type pushUnsubscribeRequest struct {
	Endpoint string `json:"endpoint"`
}

func (s *Server) pushUnsubscribe(c *fiber.Ctx) error {
	ctx := c.UserContext()
	uid, _ := c.Locals("user_id").(uuid.UUID)
	if uid == uuid.Nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthenticated"})
	}

	var req pushUnsubscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_body"})
	}
	if req.Endpoint == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_endpoint"})
	}

	_, err := s.db.Exec(ctx, `
		DELETE FROM push_subscriptions
		WHERE user_id = $1 AND endpoint = $2
	`, uid, req.Endpoint)
	if err != nil {
		return errInternal(c, err)
	}

	return c.JSON(fiber.Map{"ok": true})
}
