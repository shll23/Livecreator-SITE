package http

import (
	"os"

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

	// Static-File-Serving für Profile-Photos
	storagePath := os.Getenv("STORAGE_PATH")
	if storagePath == "" {
		storagePath = "/app/storage"
	}
	app.Static("/storage", storagePath)

	api := app.Group("/api")

	// Auth
	authGroup := api.Group("/auth")
	authGroup.Post("/register/creator", s.registerCreator)
	authGroup.Post("/register/customer", s.registerCustomer)
	authGroup.Post("/login", s.login)
	authGroup.Post("/refresh", s.refresh)
	authGroup.Post("/logout", s.logout)
	authGroup.Get("/me", s.requireAuth, s.me)
	authGroup.Get("/verify-email", s.verifyEmail)

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

	// Creator-spezifische Endpoints (alle prüfen Role intern)
	// Auth-Heartbeat (alle eingeloggten User)
	api.Post("/auth/heartbeat", s.requireAuth, s.authHeartbeat)

	// Push-Notifications
	api.Get("/notifications/vapid-public-key", s.pushVapidPublicKey)
	api.Post("/notifications/subscribe", s.requireAuth, s.pushSubscribe)
	api.Delete("/notifications/unsubscribe", s.requireAuth, s.pushUnsubscribe)

	creatorGroup := api.Group("/creator", s.requireAuth)
	creatorGroup.Get("/stats", s.creatorStats)
	creatorGroup.Get("/customers/:customer_id", s.creatorCustomerInfo)
	creatorGroup.Get("/profile", s.getMyProfile)
	creatorGroup.Patch("/profile", s.updateMyProfile)
	creatorGroup.Get("/profile/photos", s.listMyPhotos)
	creatorGroup.Post("/profile/photos", s.uploadMyPhoto)
	creatorGroup.Delete("/profile/photos/:id", s.deleteMyPhoto)
	creatorGroup.Post("/profile/photos/:id/primary", s.setMyPrimaryPhoto)
	creatorGroup.Post("/profile/photos/reorder", s.reorderMyPhotos)
	creatorGroup.Get("/payouts", s.listMyPayouts)
	creatorGroup.Get("/payouts/:id/invoice", s.downloadMyInvoice)

	// Admin-Routes
	adminGroup := api.Group("/admin", s.requireAuth, s.requireAdmin)
	adminGroup.Get("/photos/pending", s.adminListPendingPhotos)
	adminGroup.Post("/photos/:id/approve", s.adminApprovePhoto)
	adminGroup.Post("/photos/:id/reject", s.adminRejectPhoto)
	adminGroup.Get("/creators", s.adminListCreators)
	adminGroup.Get("/creators/:id/monthly-earnings", s.adminCreatorMonthlyEarnings)
	adminGroup.Get("/payouts", s.adminListAllPayouts)
	adminGroup.Post("/payouts", s.adminCreatePayout)
	adminGroup.Post("/payouts/:id/invoice", s.adminUploadInvoice)

	// Admin Stats + Customers + Purchases (Phase G1+G2)
	adminGroup.Get("/stats/platform", s.adminPlatformStats)
	adminGroup.Get("/customers", s.adminListCustomers)
	adminGroup.Get("/purchases", s.adminListPurchases)
	adminGroup.Get("/creators/activity-summary", s.adminAllCreatorsActivitySummary)
	adminGroup.Get("/creators/:id/activity", s.adminCreatorActivity)
	adminGroup.Get("/push/audience-counts", s.adminPushAudienceCounts)
	adminGroup.Post("/push/broadcast", s.adminPushBroadcast)

	return app
}
