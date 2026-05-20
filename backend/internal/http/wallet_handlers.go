package http

import (
	"context"
	"errors"
	"os"
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

	frontendURL := os.Getenv("PUBLIC_FRONTEND_URL")

	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Zahlung bestätigt</title>
<style>
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;background:#ffffff;color:#18181b;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%%;min-height:100vh;min-height:100dvh;overflow-x:hidden}
.wrap{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 20px}
.card{width:100%%;max-width:440px;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;padding:32px 28px;text-align:center}
.check{width:56px;height:56px;margin:0 auto 20px;border-radius:50%%;background:#f0fdf4;display:flex;align-items:center;justify-content:center}
.check svg{color:#16a34a}
h1{margin:0 0 8px 0;font-size:22px;font-weight:700;letter-spacing:-0.01em;color:#18181b}
p.sub{margin:0 0 24px 0;font-size:14px;color:#71717a;line-height:1.5}
a.btn{display:block;width:100%%;background:#18181b;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:999px;font-size:14px;font-weight:600;letter-spacing:0.01em;transition:background-color 0.15s ease}
a.btn:hover{background:#27272a}
a.btn:active{background:#000000}
.trust{margin-top:24px;padding-top:20px;border-top:1px solid #e4e4e7;display:grid;grid-template-columns:1fr 1fr;gap:12px 16px}
.trust-item{display:flex;align-items:center;gap:8px;font-size:11px;color:#52525b;text-align:left}
.trust-item svg{flex-shrink:0;color:#16a34a}
.meta{margin-top:20px;font-size:11px;color:#a1a1aa;line-height:1.5;word-break:break-all}
@media (min-width:480px){.card{padding:40px 36px}h1{font-size:24px}}
</style>
</head>
<body>
<div class="wrap">
<div class="card">
<div class="check">
<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
<polyline points="20 6 9 17 4 12"></polyline>
</svg>
</div>
<h1>Zahlung bestätigt</h1>
<p class="sub">Dein Guthaben wurde aufgeladen und steht dir sofort zur Verfügung.</p>
<a href="%s/wallet" class="btn">Zurück zum Konto</a>
<div class="trust">
<div class="trust-item">
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<rect x="3" y="11" width="18" height="11" rx="2"></rect>
<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
</svg>
<span>SSL-verschlüsselt</span>
</div>
<div class="trust-item">
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
</svg>
<span>Neutrale Abrechnung</span>
</div>
<div class="trust-item">
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<polyline points="20 6 9 17 4 12"></polyline>
</svg>
<span>PCI DSS zertifiziert</span>
</div>
<div class="trust-item">
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<polyline points="20 6 9 17 4 12"></polyline>
</svg>
<span>Einmalig · Kein Abo</span>
</div>
</div>
<div class="meta">Transaktion-ID: %s</div>
</div>
</div>
</body>
</html>`, frontendURL, purchaseID.String())

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
