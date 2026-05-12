package http

import (
	"context"
	"errors"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/livecreator/backend/internal/payment"
	"github.com/livecreator/backend/internal/wallet"
)

// ============================================================================
// GET /api/wallet — Eigene Balance + Status
// ============================================================================

func (s *Server) getWallet(c *fiber.Ctx) error {
	uid := currentUserID(c)
	balance, err := s.wallet.GetBalance(c.UserContext(), uid)
	if err != nil {
		return errInternal(c, err)
	}
	return c.JSON(fiber.Map{
		"balance_coins": balance,
	})
}

// ============================================================================
// GET /api/wallet/packages — Verfügbare Coin-Pakete
// ============================================================================

type coinPackage struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	Coins      int       `json:"coins"`
	PriceCents int       `json:"price_cents"`
	Currency   string    `json:"currency"`
}

func (s *Server) listPackages(c *fiber.Ctx) error {
	rows, err := s.db.Query(c.UserContext(), `
		SELECT id, name, coins, price_cents, currency
		FROM coin_packages
		WHERE is_active = TRUE
		ORDER BY sort_order ASC, coins ASC
	`)
	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	out := []coinPackage{}
	for rows.Next() {
		var p coinPackage
		if err := rows.Scan(&p.ID, &p.Name, &p.Coins, &p.PriceCents, &p.Currency); err != nil {
			return errInternal(c, err)
		}
		out = append(out, p)
	}
	return c.JSON(fiber.Map{"packages": out})
}

// ============================================================================
// POST /api/wallet/purchase — Coin-Kauf starten
// Body: { "package_id": "uuid" }
// Antwort: { "purchase_id": "...", "redirect_url": "...", "status": "pending" }
// ============================================================================

type purchaseRequest struct {
	PackageID string `json:"package_id"`
}

func (s *Server) startPurchase(c *fiber.Ctx) error {
	uid := currentUserID(c)

	var req purchaseRequest
	if err := c.BodyParser(&req); err != nil {
		return errBadRequest(c, "invalid_body")
	}
	packageID, err := uuid.Parse(req.PackageID)
	if err != nil {
		return errBadRequest(c, "invalid_package_id")
	}

	ctx := c.UserContext()

	// Paket holen
	var (
		coins      int
		priceCents int
		currency   string
		name       string
	)
	err = s.db.QueryRow(ctx, `
		SELECT name, coins, price_cents, currency
		FROM coin_packages
		WHERE id = $1 AND is_active = TRUE
	`, packageID).Scan(&name, &coins, &priceCents, &currency)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "package_not_found"})
		}
		return errInternal(c, err)
	}

	// Purchase-Eintrag erstellen (pending)
	purchaseID := uuid.New()
	_, err = s.db.Exec(ctx, `
		INSERT INTO coin_purchases (id, user_id, package_id, coins, price_cents, currency, provider, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
	`, purchaseID, uid, packageID, coins, priceCents, currency, s.payment.Name())
	if err != nil {
		return errInternal(c, err)
	}

	// Provider aufrufen
	resp, err := s.payment.CreatePurchase(ctx, payment.PurchaseRequest{
		UserID:     uid,
		PurchaseID: purchaseID,
		Coins:      coins,
		PriceCents: priceCents,
		Currency:   currency,
	})
	if err != nil {
		return errInternal(c, err)
	}

	// provider_tx_id speichern
	_, _ = s.db.Exec(ctx, `
		UPDATE coin_purchases SET provider_tx_id = $1 WHERE id = $2
	`, resp.ProviderTxID, purchaseID)

	return c.JSON(fiber.Map{
		"purchase_id":  purchaseID,
		"redirect_url": resp.RedirectURL,
		"status":       resp.Status,
		"coins":        coins,
		"price_cents":  priceCents,
		"currency":     currency,
	})
}

// ============================================================================
// GET /api/wallet/mock-confirm/:purchase_id
// Mock-Endpoint: simuliert PSP-Callback. Bei echtem PSP wäre das ein Webhook.
// Schreibt Coins ins Ledger, markiert Purchase als completed.
// ============================================================================

func (s *Server) mockConfirmPurchase(c *fiber.Ctx) error {
	purchaseID, err := uuid.Parse(c.Params("purchase_id"))
	if err != nil {
		return errBadRequest(c, "invalid_purchase_id")
	}

	if err := s.completePurchase(c.UserContext(), purchaseID); err != nil {
		return errInternal(c, err)
	}

	// HTML-Antwort mit Auto-Close für Mock-Flow
	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><title>Zahlung erfolgreich</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:linear-gradient(135deg,#fdf2f8,#fce7f3);color:#1f2937}
.box{background:white;padding:48px;border-radius:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,.1);text-align:center;max-width:420px}
h1{margin:0 0 8px;font-size:28px;color:#be185d}
p{margin:0 0 24px;color:#6b7280}
.coins{font-size:48px;font-weight:bold;color:#ec4899;margin:16px 0}
a{display:inline-block;background:#ec4899;color:white;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600}
</style></head>
<body><div class="box">
<h1>✨ Zahlung erfolgreich</h1>
<p>Deine Coins wurden gutgeschrieben.</p>
<div class="coins">%s</div>
<a href="http://localhost:3000/wallet">Zurück zum Wallet</a>
</div></body></html>`, "✓")

	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.SendString(html)
}

// completePurchase ist die zentrale Logik die einen Coin-Kauf finalisiert:
// 1. Purchase als 'completed' markieren
// 2. Ledger-Buchung: system:incoming → user:{uid}
// Idempotent über purchase_id als Idempotency-Key.
func (s *Server) completePurchase(ctx context.Context, purchaseID uuid.UUID) error {
	// Purchase holen
	var (
		userID uuid.UUID
		coins  int
		status string
	)
	err := s.db.QueryRow(ctx, `
		SELECT user_id, coins, status FROM coin_purchases WHERE id = $1
	`, purchaseID).Scan(&userID, &coins, &status)
	if err != nil {
		return fmt.Errorf("get purchase: %w", err)
	}

	if status == "completed" {
		return nil // Idempotent — schon erledigt
	}
	if status != "pending" {
		return fmt.Errorf("purchase in unexpected status: %s", status)
	}

	// Ledger-Buchung (doppelte Buchführung)
	txID, err := s.wallet.RecordTransaction(
		ctx,
		"coin_purchase",
		"purchase:"+purchaseID.String(),
		[]wallet.Entry{
			{
				AccountKey:  wallet.SystemIncoming,
				AccountType: "system",
				AmountCoins: -int64(coins), // System "gibt aus"
				Description: "Coin-Verkauf an User " + userID.String(),
			},
			{
				AccountKey:  wallet.UserAccountKey(userID),
				AccountType: "user",
				AmountCoins: int64(coins), // User bekommt gutgeschrieben
				Description: "Coin-Kauf",
			},
		},
		map[string]interface{}{
			"purchase_id": purchaseID.String(),
		},
	)
	if err != nil {
		return fmt.Errorf("record tx: %w", err)
	}

	// Purchase als completed markieren
	_, err = s.db.Exec(ctx, `
		UPDATE coin_purchases
		SET status = 'completed',
		    completed_at = NOW(),
		    ledger_transaction_id = $1
		WHERE id = $2
	`, txID, purchaseID)
	if err != nil {
		return fmt.Errorf("update purchase: %w", err)
	}

	return nil
}

// ============================================================================
// GET /api/wallet/history — Transaktionsverlauf
// ============================================================================

func (s *Server) walletHistory(c *fiber.Ctx) error {
	uid := currentUserID(c)
	history, err := s.wallet.GetHistory(c.UserContext(), uid, 50)
	if err != nil {
		return errInternal(c, err)
	}
	return c.JSON(fiber.Map{"history": history})
}

// ============================================================================
// GET /api/wallet/purchases — Liste der Käufe
// ============================================================================

func (s *Server) walletPurchases(c *fiber.Ctx) error {
	uid := currentUserID(c)
	rows, err := s.db.Query(c.UserContext(), `
		SELECT p.id, cp.name, p.coins, p.price_cents, p.currency, p.status, p.created_at, p.completed_at
		FROM coin_purchases p
		LEFT JOIN coin_packages cp ON cp.id = p.package_id
		WHERE p.user_id = $1
		ORDER BY p.created_at DESC
		LIMIT 50
	`, uid)
	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	out := []fiber.Map{}
	for rows.Next() {
		var (
			id          uuid.UUID
			name        *string
			coins       int
			priceCents  int
			currency    string
			status      string
			createdAt   interface{}
			completedAt interface{}
		)
		if err := rows.Scan(&id, &name, &coins, &priceCents, &currency, &status, &createdAt, &completedAt); err != nil {
			return errInternal(c, err)
		}
		out = append(out, fiber.Map{
			"id":           id,
			"package_name": name,
			"coins":        coins,
			"price_cents":  priceCents,
			"currency":     currency,
			"status":       status,
			"created_at":   createdAt,
			"completed_at": completedAt,
		})
	}
	return c.JSON(fiber.Map{"purchases": out})
}
