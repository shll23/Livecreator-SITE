package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppEnv      string
	AppPort     string
	LogLevel    string

	DB          DBConfig
	Redis       RedisConfig
	JWT         JWTConfig

	CORSOrigins []string

	PaymentProvider string
}

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Database string
}

func (d DBConfig) DSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		d.User, d.Password, d.Host, d.Port, d.Database,
	)
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
}

func (r RedisConfig) Addr() string {
	return r.Host + ":" + r.Port
}

type JWTConfig struct {
	AccessSecret    string
	RefreshSecret   string
	AccessTTL       time.Duration
	RefreshTTL      time.Duration
}

// Load liest alle Werte aus Env-Vars. Fehlt was Kritisches → Panic beim Start.
func Load() *Config {
	cfg := &Config{
		AppEnv:   getEnv("APP_ENV", "development"),
		AppPort:  getEnv("APP_PORT", "8080"),
		LogLevel: getEnv("APP_LOG_LEVEL", "info"),

		DB: DBConfig{
			Host:     mustEnv("POSTGRES_HOST"),
			Port:     getEnv("POSTGRES_PORT", "5432"),
			User:     mustEnv("POSTGRES_USER"),
			Password: mustEnv("POSTGRES_PASSWORD"),
			Database: mustEnv("POSTGRES_DB"),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "redis"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
		},
		JWT: JWTConfig{
			AccessSecret:  mustEnv("JWT_ACCESS_SECRET"),
			RefreshSecret: mustEnv("JWT_REFRESH_SECRET"),
			AccessTTL:     time.Duration(getEnvInt("JWT_ACCESS_TTL_MINUTES", 15)) * time.Minute,
			RefreshTTL:    time.Duration(getEnvInt("JWT_REFRESH_TTL_DAYS", 30)) * 24 * time.Hour,
		},

		CORSOrigins:     splitCSV(getEnv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")),
		PaymentProvider: getEnv("PAYMENT_PROVIDER", "mock"),
	}

	// Hard checks
	if len(cfg.JWT.AccessSecret) < 32 {
		panic("JWT_ACCESS_SECRET muss mindestens 32 Zeichen lang sein")
	}
	if len(cfg.JWT.RefreshSecret) < 32 {
		panic("JWT_REFRESH_SECRET muss mindestens 32 Zeichen lang sein")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic("Env-Variable fehlt: " + key)
	}
	return v
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
