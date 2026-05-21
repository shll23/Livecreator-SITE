package http

import (
	"context"
	"errors"
	"log"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/livecreator/backend/internal/auth"
	"github.com/livecreator/backend/internal/models"
)

// ============================================================================
// Request/Response Types
// ============================================================================

type registerCreatorRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	Handle      string `json:"handle"`
	DisplayName string `json:"display_name"`
}

type registerCustomerRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"` // Sekunden
	Role         string `json:"role"`
	UserID       string `json:"user_id"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// ============================================================================
// Handler-Methoden
// ============================================================================

var (
	handleRegex = regexp.MustCompile(`^[a-z0-9_]{3,32}$`)
	emailRegex  = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
)

// POST /api/auth/register/creator
func (s *Server) registerCreator(c *fiber.Ctx) error {
	var req registerCreatorRequest
	if err := c.BodyParser(&req); err != nil {
		return errBadRequest(c, "invalid_body")
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Handle = strings.ToLower(strings.TrimSpace(req.Handle))
	req.DisplayName = strings.TrimSpace(req.DisplayName)

	// Validation
	if !emailRegex.MatchString(req.Email) {
		return errBadRequest(c, "invalid_email")
	}
	if len(req.Password) < 8 {
		return errBadRequest(c, "password_too_short")
	}
	if !handleRegex.MatchString(req.Handle) {
		return errBadRequest(c, "invalid_handle")
	}
	if len(req.DisplayName) < 1 || len(req.DisplayName) > 80 {
		return errBadRequest(c, "invalid_display_name")
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return errInternal(c, err)
	}

	ctx := c.UserContext()

	// In Transaktion: User + Creator-Profil in einem Rutsch
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return errInternal(c, err)
	}
	defer tx.Rollback(ctx)

	var userID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, role)
		VALUES ($1, $2, 'creator')
		RETURNING id
	`, req.Email, hash).Scan(&userID)
	if err != nil {
		if isUniqueViolation(err, "users_email_key") {
			return errConflict(c, "email_already_registered")
		}
		return errInternal(c, err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO creators (user_id, handle, display_name)
		VALUES ($1, $2, $3)
	`, userID, req.Handle, req.DisplayName)
	if err != nil {
		if isUniqueViolation(err, "creators_handle_key") {
			return errConflict(c, "handle_already_taken")
		}
		return errInternal(c, err)
	}

	// Ledger-Account für Creator anlegen (Earnings-Konto)
	_, err = tx.Exec(ctx, `
		INSERT INTO ledger_accounts (account_key, account_type)
		VALUES ($1, 'creator')
		ON CONFLICT (account_key) DO NOTHING
	`, "creator:"+userID.String())
	if err != nil {
		return errInternal(c, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return errInternal(c, err)
	}

	return s.issueTokens(c, userID, models.RoleCreator)
}

// POST /api/auth/register/customer
func (s *Server) registerCustomer(c *fiber.Ctx) error {
	var req registerCustomerRequest
	if err := c.BodyParser(&req); err != nil {
		return errBadRequest(c, "invalid_body")
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.DisplayName = strings.TrimSpace(req.DisplayName)

	if !emailRegex.MatchString(req.Email) {
		return errBadRequest(c, "invalid_email")
	}
	if len(req.Password) < 8 {
		return errBadRequest(c, "password_too_short")
	}
	if len(req.DisplayName) > 80 {
		return errBadRequest(c, "invalid_display_name")
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return errInternal(c, err)
	}

	ctx := c.UserContext()

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return errInternal(c, err)
	}
	defer tx.Rollback(ctx)

	var userID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, role)
		VALUES ($1, $2, 'customer')
		RETURNING id
	`, req.Email, hash).Scan(&userID)
	if err != nil {
		if isUniqueViolation(err, "users_email_key") {
			return errConflict(c, "email_already_registered")
		}
		return errInternal(c, err)
	}

	displayName := req.DisplayName
	if displayName == "" {
		displayName = strings.Split(req.Email, "@")[0]
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO customers (user_id, display_name)
		VALUES ($1, $2)
	`, userID, displayName)
	if err != nil {
		return errInternal(c, err)
	}

	// Ledger-Account für Customer-Wallet
	_, err = tx.Exec(ctx, `
		INSERT INTO ledger_accounts (account_key, account_type)
		VALUES ($1, 'user')
		ON CONFLICT (account_key) DO NOTHING
	`, "user:"+userID.String())
	if err != nil {
		return errInternal(c, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return errInternal(c, err)
	}

	// === PUSH an Admins: neuer Customer registriert ===
	s.notifyAdminsNewCustomer(ctx, req.Email)

	return s.issueTokens(c, userID, models.RoleCustomer)
}

// POST /api/auth/login
func (s *Server) login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return errBadRequest(c, "invalid_body")
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	ctx := c.UserContext()

	var (
		userID uuid.UUID
		hash   string
		role   models.UserRole
		status models.UserStatus
	)
	err := s.db.QueryRow(ctx, `
		SELECT id, password_hash, role, status FROM users WHERE email = $1
	`, req.Email).Scan(&userID, &hash, &role, &status)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// WICHTIG: gleiche Antwort egal ob Email oder Passwort falsch
			// Sonst kann ein Angreifer Email-Existenz prüfen
			return errUnauthorized(c, "invalid_credentials")
		}
		return errInternal(c, err)
	}

	if status != models.StatusActive {
		return errUnauthorized(c, "account_not_active")
	}

	ok, err := auth.VerifyPassword(req.Password, hash)
	if err != nil || !ok {
		return errUnauthorized(c, "invalid_credentials")
	}

	// last_login_at aktualisieren (best effort)
	_, _ = s.db.Exec(ctx, `UPDATE users SET last_login_at = NOW() WHERE id = $1`, userID)

	return s.issueTokens(c, userID, role)
}

// POST /api/auth/refresh
func (s *Server) refresh(c *fiber.Ctx) error {
	var req refreshRequest
	if err := c.BodyParser(&req); err != nil {
		return errBadRequest(c, "invalid_body")
	}

	if req.RefreshToken == "" {
		return errBadRequest(c, "missing_token")
	}

	tokenHash := auth.HashRefreshToken(req.RefreshToken)
	ctx := c.UserContext()

	var (
		sessionID uuid.UUID
		userID    uuid.UUID
		expiresAt time.Time
		revokedAt *time.Time
		role      models.UserRole
	)
	err := s.db.QueryRow(ctx, `
		SELECT s.id, s.user_id, s.expires_at, s.revoked_at, u.role
		FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.refresh_token_hash = $1
	`, tokenHash).Scan(&sessionID, &userID, &expiresAt, &revokedAt, &role)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errUnauthorized(c, "invalid_refresh_token")
		}
		return errInternal(c, err)
	}

	if revokedAt != nil {
		return errUnauthorized(c, "token_revoked")
	}
	if time.Now().After(expiresAt) {
		return errUnauthorized(c, "token_expired")
	}

	// Token-Rotation: alten Token revoken, neuen ausgeben
	_, err = s.db.Exec(ctx, `UPDATE sessions SET revoked_at = NOW() WHERE id = $1`, sessionID)
	if err != nil {
		return errInternal(c, err)
	}

	return s.issueTokens(c, userID, role)
}

// POST /api/auth/logout
func (s *Server) logout(c *fiber.Ctx) error {
	var req refreshRequest
	if err := c.BodyParser(&req); err != nil {
		return c.JSON(fiber.Map{"ok": true}) // best effort
	}

	if req.RefreshToken != "" {
		hash := auth.HashRefreshToken(req.RefreshToken)
		_, _ = s.db.Exec(c.UserContext(), `
			UPDATE sessions SET revoked_at = NOW()
			WHERE refresh_token_hash = $1 AND revoked_at IS NULL
		`, hash)
	}

	return c.JSON(fiber.Map{"ok": true})
}

// GET /api/auth/me
func (s *Server) me(c *fiber.Ctx) error {
	uid := c.Locals("user_id").(uuid.UUID)
	role := c.Locals("role").(models.UserRole)

	ctx := c.UserContext()

	resp := fiber.Map{
		"user_id": uid,
		"role":    role,
	}

	switch role {
	case models.RoleCreator:
		var (
			email             string
			handle            string
			displayName       string
			bio               *string
			avatarURL         *string
			messagePriceCoins int
			revenueShareBPS   int
			isVerified        bool
		)
		err := s.db.QueryRow(ctx, `
			SELECT u.email, c.handle, c.display_name, c.bio, c.avatar_url,
			       c.message_price_coins, c.revenue_share_bps, c.is_verified
			FROM users u JOIN creators c ON c.user_id = u.id
			WHERE u.id = $1
		`, uid).Scan(&email, &handle, &displayName, &bio, &avatarURL, &messagePriceCoins, &revenueShareBPS, &isVerified)
		if err != nil {
			return errInternal(c, err)
		}
		resp["email"] = email
		resp["handle"] = handle
		resp["display_name"] = displayName
		resp["bio"] = bio
		resp["avatar_url"] = avatarURL
		resp["message_price_coins"] = messagePriceCoins
		resp["revenue_share_bps"] = revenueShareBPS
		resp["is_verified"] = isVerified

	case models.RoleCustomer:
		var (
			email       string
			displayName *string
			avatarURL   *string
		)
		err := s.db.QueryRow(ctx, `
			SELECT u.email, c.display_name, c.avatar_url
			FROM users u JOIN customers c ON c.user_id = u.id
			WHERE u.id = $1
		`, uid).Scan(&email, &displayName, &avatarURL)
		if err != nil {
			return errInternal(c, err)
		}
		resp["email"] = email
		resp["display_name"] = displayName
		resp["avatar_url"] = avatarURL
	}

	return c.JSON(resp)
}

// ============================================================================
// Helpers
// ============================================================================

func (s *Server) issueTokens(c *fiber.Ctx, userID uuid.UUID, role models.UserRole) error {
	accessToken, err := auth.GenerateAccessToken(userID, auth.Role(role), s.cfg.JWT.AccessSecret, s.cfg.JWT.AccessTTL)
	if err != nil {
		return errInternal(c, err)
	}
	refreshToken, err := auth.GenerateRefreshToken()
	if err != nil {
		return errInternal(c, err)
	}

	hash := auth.HashRefreshToken(refreshToken)
	expires := time.Now().Add(s.cfg.JWT.RefreshTTL)

	ua := c.Get("User-Agent")
	ip := c.IP()

	_, err = s.db.Exec(c.UserContext(), `
		INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
		VALUES ($1, $2, $3, $4::inet, $5)
	`, userID, hash, ua, ip, expires)
	if err != nil {
		return errInternal(c, err)
	}

	return c.Status(fiber.StatusOK).JSON(tokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(s.cfg.JWT.AccessTTL.Seconds()),
		Role:         string(role),
		UserID:       userID.String(),
	})
}

func isUniqueViolation(err error, constraint string) bool {
	if err == nil {
		return false
	}
	// pgx-Fehlermeldung enthält den Constraint-Namen
	return strings.Contains(err.Error(), constraint) ||
		(strings.Contains(err.Error(), "23505") && strings.Contains(err.Error(), constraint))
}

func errBadRequest(c *fiber.Ctx, code string) error {
	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": code})
}
func errUnauthorized(c *fiber.Ctx, code string) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": code})
}
func errConflict(c *fiber.Ctx, code string) error {
	return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": code})
}
func errInternal(c *fiber.Ctx, err error) error {
	log.Printf("internal error [%s %s]: %v", c.Method(), c.Path(), err)
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
}

// Sicherstellen dass context.Context nicht ungenutzt ist (für Tests später)
var _ = context.Background
