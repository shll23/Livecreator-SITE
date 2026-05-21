package http

import (
	"github.com/gofiber/fiber/v2"
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
