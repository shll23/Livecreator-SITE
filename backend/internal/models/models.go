package models

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleCreator  UserRole = "creator"
	RoleCustomer UserRole = "customer"
	RoleAdmin    UserRole = "admin"
)

type UserStatus string

const (
	StatusActive    UserStatus = "active"
	StatusSuspended UserStatus = "suspended"
	StatusDeleted   UserStatus = "deleted"
)

type User struct {
	ID              uuid.UUID  `json:"id"`
	Email           string     `json:"email"`
	PasswordHash    string     `json:"-"`
	Role            UserRole   `json:"role"`
	Status          UserStatus `json:"status"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
	LastLoginAt     *time.Time `json:"last_login_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type Creator struct {
	UserID            uuid.UUID `json:"user_id"`
	Handle            string    `json:"handle"`
	DisplayName       string    `json:"display_name"`
	Bio               *string   `json:"bio,omitempty"`
	AvatarURL         *string   `json:"avatar_url,omitempty"`
	CoverURL          *string   `json:"cover_url,omitempty"`
	MessagePriceCoins int       `json:"message_price_coins"`
	RevenueShareBPS   int       `json:"revenue_share_bps"`
	IsVerified        bool      `json:"is_verified"`
	IsListed          bool      `json:"is_listed"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type Customer struct {
	UserID      uuid.UUID `json:"user_id"`
	DisplayName *string   `json:"display_name,omitempty"`
	AvatarURL   *string   `json:"avatar_url,omitempty"`
	CountryCode *string   `json:"country_code,omitempty"`
	Locale      string    `json:"locale"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Session struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	RefreshTokenHash string     `json:"-"`
	UserAgent        *string    `json:"user_agent,omitempty"`
	IPAddress        *string    `json:"ip_address,omitempty"`
	ExpiresAt        time.Time  `json:"expires_at"`
	RevokedAt        *time.Time `json:"revoked_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	LastUsedAt       time.Time  `json:"last_used_at"`
}
