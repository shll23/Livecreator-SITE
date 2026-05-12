package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/argon2"
)

// ============================================================================
// PASSWORT-HASHING (Argon2id)
// ============================================================================

// OWASP-Empfehlung Stand 2024:
// - Memory: 19 MiB, Iterations: 2, Parallelism: 1, Salt: 16 Byte, Hash: 32 Byte
// (Wir nehmen 64 MiB für höhere Sicherheit, kostet ~30ms pro Hash auf moderner CPU)
const (
	argonMemory      = 64 * 1024 // 64 MiB
	argonIterations  = 2
	argonParallelism = 1
	argonSaltLen     = 16
	argonKeyLen      = 32
)

// HashPassword erzeugt einen kompletten Argon2id-Hash-String:
// $argon2id$v=19$m=65536,t=2,p=1$<salt-base64>$<hash-base64>
func HashPassword(password string) (string, error) {
	if len(password) < 8 {
		return "", errors.New("password too short")
	}

	salt := make([]byte, argonSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("salt: %w", err)
	}

	hash := argon2.IDKey([]byte(password), salt, argonIterations, argonMemory, argonParallelism, argonKeyLen)

	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		argonMemory,
		argonIterations,
		argonParallelism,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash),
	), nil
}

// VerifyPassword vergleicht Klartext-Passwort gegen Hash. Constant-time-Vergleich.
func VerifyPassword(password, encodedHash string) (bool, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return false, errors.New("invalid hash format")
	}

	if parts[1] != "argon2id" {
		return false, errors.New("not argon2id")
	}

	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return false, err
	}

	var memory uint32
	var iterations uint32
	var parallelism uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism); err != nil {
		return false, err
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, err
	}
	expectedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, err
	}

	keyLen := uint32(len(expectedHash))
	actualHash := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, keyLen)

	return subtle.ConstantTimeCompare(expectedHash, actualHash) == 1, nil
}

// ============================================================================
// JWT (Access-Token)
// ============================================================================

type Role string

const (
	RoleCreator  Role = "creator"
	RoleCustomer Role = "customer"
	RoleAdmin    Role = "admin"
)

type Claims struct {
	UserID uuid.UUID `json:"uid"`
	Role   Role      `json:"role"`
	jwt.RegisteredClaims
}

func GenerateAccessToken(userID uuid.UUID, role Role, secret string, ttl time.Duration) (string, error) {
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			Issuer:    "livecreator",
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString([]byte(secret))
}

func ParseAccessToken(tokenString, secret string) (*Claims, error) {
	claims := &Claims{}
	tok, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if !tok.Valid {
		return nil, errors.New("token invalid")
	}
	return claims, nil
}

// ============================================================================
// REFRESH-TOKEN (Random + SHA256-Hash für DB-Storage)
// ============================================================================

// GenerateRefreshToken erzeugt einen 64-Byte zufälligen Token (hex = 128 Zeichen).
func GenerateRefreshToken() (string, error) {
	b := make([]byte, 64)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// HashRefreshToken: SHA256 vom Token. Nur Hash speichern, nie das Klartext-Token!
func HashRefreshToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
