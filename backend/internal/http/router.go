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

	// Mock-Confirm-Endpoint (public, simuliert PSP-Callback)
	// Wichtig: MUSS vor der walletGroup registriert werden, sonst greift die Auth-Middleware!
	// Eigener Pfad-Präfix /mock damit die /wallet-Gruppe nicht zuschlägt.
	api.Get("/mock/confirm/:purchase_id", s.mockConfirmPurchase)

	// ===== Authenticated =====
	// Wallet
	walletGroup := api.Group("/wallet", s.requireAuth)
	walletGroup.Get("/", s.getWallet)
	walletGroup.Get("/packages", s.listPackages)
	walletGroup.Get("/history", s.walletHistory)
	walletGroup.Get("/purchases", s.walletPurchases)
	walletGroup.Post("/purchase", s.startPurchase)

	// Chat / Conversations (Customer + Creator)
	convGroup := api.Group("/conversations", s.requireAuth)
	convGroup.Get("/", s.listConversations)
	convGroup.Post("/", s.createConversation)
	convGroup.Get("/:id", s.getConversation)
	convGroup.Get("/:id/messages", s.listMessages)
	convGroup.Post("/:id/messages", s.sendMessage)
	convGroup.Post("/:id/read", s.markConversationRead)

	return app
}
