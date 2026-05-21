package http

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/livecreator/backend/internal/auth"
	"github.com/livecreator/backend/internal/config"
	"github.com/livecreator/backend/internal/models"
	"github.com/livecreator/backend/internal/payment"
	"github.com/livecreator/backend/internal/push"
	"github.com/livecreator/backend/internal/wallet"
	"github.com/redis/go-redis/v9"
)

type Server struct {
	cfg        *config.Config
	db         *pgxpool.Pool
	redis      *redis.Client
	wallet     *wallet.Service
	payment    payment.Provider
	pushSender *push.Sender
}

func NewServer(cfg *config.Config, db *pgxpool.Pool, rdb *redis.Client, pp payment.Provider) *Server {
	sender := push.NewSender(db)
	push.SetGlobal(sender)
	return &Server{
		cfg:        cfg,
		db:         db,
		redis:      rdb,
		wallet:     wallet.NewService(db),
		payment:    pp,
		pushSender: sender,
	}
}

// requireAuth: Middleware die JWT validiert und user_id + role in c.Locals legt.
func (s *Server) requireAuth(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return errUnauthorized(c, "missing_token")
	}
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

	claims, err := auth.ParseAccessToken(tokenStr, s.cfg.JWT.AccessSecret)
	if err != nil {
		return errUnauthorized(c, "invalid_token")
	}

	c.Locals("user_id", claims.UserID)
	c.Locals("role", models.UserRole(claims.Role))
	return c.Next()
}

// requireRole: Wrapper-Middleware um nur eine bestimmte Rolle reinzulassen.
func (s *Server) requireRole(role models.UserRole) fiber.Handler {
	return func(c *fiber.Ctx) error {
		current, ok := c.Locals("role").(models.UserRole)
		if !ok {
			return errUnauthorized(c, "unauthorized")
		}
		if current != role && current != models.RoleAdmin {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
		}
		return c.Next()
	}
}

// Helper für Handler die UUID des aktuellen Users brauchen
func currentUserID(c *fiber.Ctx) uuid.UUID {
	return c.Locals("user_id").(uuid.UUID)
}
