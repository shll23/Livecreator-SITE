package http

import (
	"github.com/gofiber/fiber/v2"
)

// GET /api/creators — öffentliche Liste aller gelisteten Creators
// (später paginieren, filtern, sortieren)
func (s *Server) listCreators(c *fiber.Ctx) error {
	rows, err := s.db.Query(c.UserContext(), `
		SELECT c.user_id, c.handle, c.display_name, c.bio, c.avatar_url,
		       c.cover_url, c.message_price_coins, c.is_verified
		FROM creators c
		JOIN users u ON u.id = c.user_id
		WHERE c.is_listed = TRUE AND u.status = 'active'
		ORDER BY c.created_at DESC
		LIMIT 50
	`)
	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	creators := []fiber.Map{}
	for rows.Next() {
		var (
			userID            string
			handle            string
			displayName       string
			bio               *string
			avatarURL         *string
			coverURL          *string
			messagePriceCoins int
			isVerified        bool
		)
		if err := rows.Scan(&userID, &handle, &displayName, &bio, &avatarURL, &coverURL, &messagePriceCoins, &isVerified); err != nil {
			return errInternal(c, err)
		}
		creators = append(creators, fiber.Map{
			"user_id":             userID,
			"handle":              handle,
			"display_name":        displayName,
			"bio":                 bio,
			"avatar_url":          avatarURL,
			"cover_url":           coverURL,
			"message_price_coins": messagePriceCoins,
			"is_verified":         isVerified,
		})
	}

	return c.JSON(fiber.Map{"creators": creators})
}

// GET /api/creators/:handle — Details zu einem Creator
func (s *Server) getCreatorByHandle(c *fiber.Ctx) error {
	handle := c.Params("handle")
	if handle == "" {
		return errBadRequest(c, "missing_handle")
	}

	var (
		userID            string
		displayName       string
		bio               *string
		avatarURL         *string
		coverURL          *string
		messagePriceCoins int
		isVerified        bool
	)
	err := s.db.QueryRow(c.UserContext(), `
		SELECT c.user_id, c.display_name, c.bio, c.avatar_url, c.cover_url,
		       c.message_price_coins, c.is_verified
		FROM creators c
		JOIN users u ON u.id = c.user_id
		WHERE c.handle = $1 AND c.is_listed = TRUE AND u.status = 'active'
	`, handle).Scan(&userID, &displayName, &bio, &avatarURL, &coverURL, &messagePriceCoins, &isVerified)

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "creator_not_found"})
	}

	return c.JSON(fiber.Map{
		"user_id":             userID,
		"handle":              handle,
		"display_name":        displayName,
		"bio":                 bio,
		"avatar_url":          avatarURL,
		"cover_url":           coverURL,
		"message_price_coins": messagePriceCoins,
		"is_verified":         isVerified,
	})
}
