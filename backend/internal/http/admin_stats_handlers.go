package http

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

// ============================================================================
// ADMIN STATS HANDLERS
//
// Plattform-Statistiken, Kunden-Liste, Coin-Kaeufe-Log
// Alle Endpoints unter /api/admin/* erfordern role=admin (Middleware in router.go)
// ============================================================================

// GET /api/admin/stats/platform
// Liefert Plattform-Uebersicht: Umsatz, Kunden, Nachrichten, etc.
func (s *Server) adminPlatformStats(c *fiber.Ctx) error {
	ctx := c.UserContext()

	type PlatformStats struct {
		RevenueTotalCents     int64 `json:"revenue_total_cents"`
		RevenueMonthCents     int64 `json:"revenue_month_cents"`
		PurchasesTotal        int64 `json:"purchases_total"`
		PurchasesMonth        int64 `json:"purchases_month"`
		CoinsSoldTotal        int64 `json:"coins_sold_total"`
		CoinsSoldMonth        int64 `json:"coins_sold_month"`
		CustomersTotal        int64 `json:"customers_total"`
		CustomersActiveMonth  int64 `json:"customers_active_month"`
		CustomersNewMonth     int64 `json:"customers_new_month"`
		MessagesTotal         int64 `json:"messages_total"`
		MessagesMonth         int64 `json:"messages_month"`
		CreatorsActive        int64 `json:"creators_active"`
	}

	var stats PlatformStats

	// Eine grosse Query mit subqueries fuer Effizienz
	err := s.db.QueryRow(ctx, `
		SELECT
			COALESCE((SELECT SUM(price_cents) FROM coin_purchases WHERE status = 'completed'), 0) AS revenue_total,
			COALESCE((SELECT SUM(price_cents) FROM coin_purchases WHERE status = 'completed' AND completed_at >= date_trunc('month', NOW())), 0) AS revenue_month,
			COALESCE((SELECT COUNT(*) FROM coin_purchases WHERE status = 'completed'), 0) AS purchases_total,
			COALESCE((SELECT COUNT(*) FROM coin_purchases WHERE status = 'completed' AND completed_at >= date_trunc('month', NOW())), 0) AS purchases_month,
			COALESCE((SELECT SUM(coins) FROM coin_purchases WHERE status = 'completed'), 0) AS coins_total,
			COALESCE((SELECT SUM(coins) FROM coin_purchases WHERE status = 'completed' AND completed_at >= date_trunc('month', NOW())), 0) AS coins_month,
			(SELECT COUNT(*) FROM customers) AS customers_total,
			(SELECT COUNT(DISTINCT user_id) FROM coin_purchases WHERE status = 'completed' AND completed_at >= date_trunc('month', NOW())) AS customers_active_month,
			(SELECT COUNT(*) FROM users WHERE role = 'customer' AND created_at >= date_trunc('month', NOW())) AS customers_new_month,
			(SELECT COUNT(*) FROM messages WHERE deleted_at IS NULL) AS messages_total,
			(SELECT COUNT(*) FROM messages WHERE deleted_at IS NULL AND created_at >= date_trunc('month', NOW())) AS messages_month,
			(SELECT COUNT(*) FROM users WHERE role = 'creator' AND status = 'active') AS creators_active
	`).Scan(
		&stats.RevenueTotalCents,
		&stats.RevenueMonthCents,
		&stats.PurchasesTotal,
		&stats.PurchasesMonth,
		&stats.CoinsSoldTotal,
		&stats.CoinsSoldMonth,
		&stats.CustomersTotal,
		&stats.CustomersActiveMonth,
		&stats.CustomersNewMonth,
		&stats.MessagesTotal,
		&stats.MessagesMonth,
		&stats.CreatorsActive,
	)
	if err != nil {
		return errInternal(c, err)
	}

	return c.JSON(stats)
}

// GET /api/admin/customers
// Liefert Liste aller Kunden mit Stats (Coins gekauft, Coins ausgegeben, etc.)
func (s *Server) adminListCustomers(c *fiber.Ctx) error {
	ctx := c.UserContext()

	rows, err := s.db.Query(ctx, `
		SELECT
			u.id,
			u.email,
			COALESCE(c.display_name, '') AS display_name,
			u.created_at,
			u.last_login_at,
			COALESCE((SELECT SUM(coins) FROM coin_purchases WHERE user_id = u.id AND status = 'completed'), 0) AS coins_bought,
			COALESCE((SELECT SUM(price_cents) FROM coin_purchases WHERE user_id = u.id AND status = 'completed'), 0) AS total_spent_cents,
			COALESCE((SELECT COUNT(*) FROM coin_purchases WHERE user_id = u.id AND status = 'completed'), 0) AS purchase_count,
			COALESCE((SELECT COUNT(*) FROM messages m JOIN conversations co ON co.id = m.conversation_id WHERE co.customer_id = u.id AND m.sender_role = 'customer' AND m.deleted_at IS NULL), 0) AS messages_sent
		FROM users u
		LEFT JOIN customers c ON c.user_id = u.id
		WHERE u.role = 'customer'
		ORDER BY u.created_at DESC
	`)
	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	type CustomerRow struct {
		ID              string  `json:"id"`
		Email           string  `json:"email"`
		DisplayName     string  `json:"display_name"`
		CreatedAt       string  `json:"created_at"`
		LastLoginAt     *string `json:"last_login_at"`
		CoinsBought     int64   `json:"coins_bought"`
		TotalSpentCents int64   `json:"total_spent_cents"`
		PurchaseCount   int64   `json:"purchase_count"`
		MessagesSent    int64   `json:"messages_sent"`
	}

	customers := []CustomerRow{}
	for rows.Next() {
		var r CustomerRow
		var createdAt time.Time
		var lastLogin *time.Time
		err := rows.Scan(&r.ID, &r.Email, &r.DisplayName, &createdAt, &lastLogin, &r.CoinsBought, &r.TotalSpentCents, &r.PurchaseCount, &r.MessagesSent)
		if err != nil {
			return errInternal(c, err)
		}
		r.CreatedAt = createdAt.Format(time.RFC3339)
		if lastLogin != nil {
			s := lastLogin.Format(time.RFC3339)
			r.LastLoginAt = &s
		}
		customers = append(customers, r)
	}

	return c.JSON(fiber.Map{"customers": customers})
}

// GET /api/admin/purchases
// Liefert Log aller Coin-Kaeufe (alle Status)
func (s *Server) adminListPurchases(c *fiber.Ctx) error {
	ctx := c.UserContext()

	rows, err := s.db.Query(ctx, `
		SELECT
			cp.id,
			cp.user_id,
			u.email,
			cp.coins,
			cp.price_cents,
			cp.currency,
			cp.provider,
			cp.status,
			cp.created_at,
			cp.completed_at
		FROM coin_purchases cp
		JOIN users u ON u.id = cp.user_id
		ORDER BY cp.created_at DESC
		LIMIT 500
	`)
	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	type PurchaseRow struct {
		ID          string  `json:"id"`
		UserID      string  `json:"user_id"`
		Email       string  `json:"email"`
		Coins       int     `json:"coins"`
		PriceCents  int     `json:"price_cents"`
		Currency    string  `json:"currency"`
		Provider    string  `json:"provider"`
		Status      string  `json:"status"`
		CreatedAt   string  `json:"created_at"`
		CompletedAt *string `json:"completed_at"`
	}

	purchases := []PurchaseRow{}
	for rows.Next() {
		var r PurchaseRow
		var createdAt time.Time
		var completedAt *time.Time
		err := rows.Scan(&r.ID, &r.UserID, &r.Email, &r.Coins, &r.PriceCents, &r.Currency, &r.Provider, &r.Status, &createdAt, &completedAt)
		if err != nil {
			return errInternal(c, err)
		}
		r.CreatedAt = createdAt.Format(time.RFC3339)
		if completedAt != nil {
			s := completedAt.Format(time.RFC3339)
			r.CompletedAt = &s
		}
		purchases = append(purchases, r)
	}

	return c.JSON(fiber.Map{"purchases": purchases})
}
