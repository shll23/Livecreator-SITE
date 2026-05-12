package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/livecreator/backend/internal/config"
	"github.com/livecreator/backend/internal/db"
	httpSrv "github.com/livecreator/backend/internal/http"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg := config.Load()

	log.Printf("Starting livecreator-api in %s mode", cfg.AppEnv)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// ===== Postgres =====
	pool, err := db.Connect(ctx, cfg.DB.DSN())
	if err != nil {
		log.Fatalf("DB connect: %v", err)
	}
	defer pool.Close()
	log.Println("✓ Postgres verbunden")

	// Migrations
	migrationDir := os.Getenv("MIGRATION_DIR")
	if migrationDir == "" {
		migrationDir = "/app/migrations"
		if _, err := os.Stat(migrationDir); os.IsNotExist(err) {
			migrationDir = "./migrations"
		}
	}
	if err := db.RunMigrations(ctx, pool, migrationDir); err != nil {
		log.Fatalf("Migrations: %v", err)
	}
	log.Println("✓ Migrations angewandt")

	// ===== Redis =====
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr(),
		Password: cfg.Redis.Password,
		DB:       0,
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Redis ping: %v", err)
	}
	defer rdb.Close()
	log.Println("✓ Redis verbunden")

	// ===== HTTP-Server =====
	srv := httpSrv.NewServer(cfg, pool, rdb)
	app := srv.SetupRouter()

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		log.Println("Shutdown signal empfangen, schließe Server...")
		shutdownCtx, c := context.WithTimeout(context.Background(), 10*time.Second)
		defer c()
		_ = app.ShutdownWithContext(shutdownCtx)
	}()

	log.Printf("✓ HTTP-Server lauscht auf :%s", cfg.AppPort)
	if err := app.Listen(":" + cfg.AppPort); err != nil {
		log.Fatalf("Listen: %v", err)
	}
}
