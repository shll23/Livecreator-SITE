package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

// SetupRouter baut die komplette Route-Tabelle auf.
func (s *Server) SetupRouter() *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:               "livecreator-api",
		DisableStartupMessage: false,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${ip} ${status} - ${method} ${path} (${latency})\n",
	}))

	// CORS
	corsOrigins := ""
	for i, o := range s.cfg.CORSOrigins {
		if i > 0 {
			corsOrigins += ","
		}
		corsOrigins += o
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins,
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))

	// ===== Public =====
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	api := app.Group("/api")

	// Auth
	authGroup := api.Group("/auth")
	authGroup.Post("/register/creator", s.registerCreator)
	authGroup.Post("/register/customer", s.registerCustomer)
	authGroup.Post("/login", s.login)
	authGroup.Post("/refresh", s.refresh)
	authGroup.Post("/logout", s.logout)
	authGroup.Get("/me", s.requireAuth, s.me)

	// Public Creator-Listing
	api.Get("/creators", s.listCreators)
	api.Get("/creators/:handle", s.getCreatorByHandle)

	// ===== Authenticated =====
	// Hier kommen später: chat, wallet, media

	return app
}
