package earnings

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ============================================================================
// EARNINGS — Tiered Provisions-System
//
// Berechnung der Provision basierend auf Lifetime-Coins der Frau.
// 10 Coins = 1€ = 100 Cent, also 1 Coin = 10 Cent.
// Provision in Cent = coins * percent / 10
// ============================================================================

type Tier struct {
	Name     string
	MinCoins int64
	MaxCoins int64 // -1 = unbegrenzt
	Percent  float64
}

var Tiers = []Tier{
	{Name: "", MinCoins: 0, MaxCoins: 10000, Percent: 22.5},
	{Name: "", MinCoins: 10001, MaxCoins: 25000, Percent: 25.0},
	{Name: "", MinCoins: 25001, MaxCoins: 50000, Percent: 27.5},
	{Name: "", MinCoins: 50001, MaxCoins: 100000, Percent: 30.0},
	{Name: "", MinCoins: 100001, MaxCoins: -1, Percent: 32.5},
}

// TierForCoins gibt zurück: aktueller Tier, nächster Tier, Coins bis zum nächsten Tier.
func TierForCoins(lifetimeCoins int64) (current Tier, next *Tier, coinsToNext int64) {
	for i, t := range Tiers {
		if lifetimeCoins >= t.MinCoins && (t.MaxCoins == -1 || lifetimeCoins <= t.MaxCoins) {
			current = t
			if i+1 < len(Tiers) {
				nt := Tiers[i+1]
				next = &nt
				coinsToNext = nt.MinCoins - lifetimeCoins
				if coinsToNext < 0 {
					coinsToNext = 0
				}
			}
			return
		}
	}
	current = Tiers[0]
	return
}

// CommissionCents berechnet Provision in Cent.
// z.B. 9 Coins * 25% = 9 * 25 / 10 = 22 Cent
func CommissionCents(coins int, percent float64) int {
	return int(float64(coins) * percent / 10.0)
}

// RecordEarning speichert einen Earning-Eintrag innerhalb einer Transaction.
// Wird vom chat_handlers.sendMessage aufgerufen, in der gleichen Transaction
// wie der Message-Insert.
func RecordEarning(
	ctx context.Context,
	tx pgx.Tx,
	messageID, creatorID, customerID uuid.UUID,
	coinsEarned int,
) error {
	// MONATS-Coins VOR dieser Nachricht abfragen (Reset am 1. des Monats)
	var monthCoinsBefore int64
	err := tx.QueryRow(ctx, `
		SELECT COALESCE(SUM(coins_earned), 0)::BIGINT
		FROM creator_earnings
		WHERE creator_id = $1
		  AND created_at >= date_trunc('month', NOW())
	`, creatorID).Scan(&monthCoinsBefore)
	if err != nil {
		return fmt.Errorf("query month coins: %w", err)
	}

	tier, _, _ := TierForCoins(monthCoinsBefore)
	commission := CommissionCents(coinsEarned, tier.Percent)

	_, err = tx.Exec(ctx, `
		INSERT INTO creator_earnings (
			message_id, creator_id, customer_id,
			coins_earned, tier_percent, commission_cents
		) VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (message_id) DO NOTHING
	`, messageID, creatorID, customerID, coinsEarned, tier.Percent, commission)
	if err != nil {
		return fmt.Errorf("insert earning: %w", err)
	}
	return nil
}

// ============================================================================
// STATS für Dashboard
// ============================================================================

type Stats struct {
	Today       Period  `json:"today"`
	Week        Period  `json:"week"`
	Month       Period  `json:"month"`
	Total       Period  `json:"total"`
	CurrentTier string  `json:"current_tier"`
	TierPercent float64 `json:"tier_percent"`
	NextTier    *string `json:"next_tier,omitempty"`
	CoinsToNext int64   `json:"coins_to_next"`
}

type Period struct {
	Coins    int64 `json:"coins"`
	Messages int64 `json:"messages"`
	Cents    int64 `json:"cents"`
}

// PgxDB ist das minimale Interface das Service braucht.
type PgxDB interface {
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

type Service struct {
	db PgxDB
}

func NewService(db PgxDB) *Service {
	return &Service{db: db}
}

// GetStats holt alle Perioden-Statistiken UND berechnet den aktuellen Tier.
func (s *Service) GetStats(ctx context.Context, creatorID uuid.UUID) (*Stats, error) {
	stats := &Stats{}

	err := s.db.QueryRow(ctx, `
		SELECT
			-- today
			COALESCE(SUM(CASE WHEN created_at >= date_trunc('day', NOW()) THEN coins_earned ELSE 0 END), 0)::BIGINT,
			COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW()))::BIGINT,
			COALESCE(SUM(CASE WHEN created_at >= date_trunc('day', NOW()) THEN commission_cents ELSE 0 END), 0)::BIGINT,
			-- week
			COALESCE(SUM(CASE WHEN created_at >= date_trunc('week', NOW()) THEN coins_earned ELSE 0 END), 0)::BIGINT,
			COUNT(*) FILTER (WHERE created_at >= date_trunc('week', NOW()))::BIGINT,
			COALESCE(SUM(CASE WHEN created_at >= date_trunc('week', NOW()) THEN commission_cents ELSE 0 END), 0)::BIGINT,
			-- month
			COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN coins_earned ELSE 0 END), 0)::BIGINT,
			COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::BIGINT,
			COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN commission_cents ELSE 0 END), 0)::BIGINT,
			-- total
			COALESCE(SUM(coins_earned), 0)::BIGINT,
			COUNT(*)::BIGINT,
			COALESCE(SUM(commission_cents), 0)::BIGINT
		FROM creator_earnings
		WHERE creator_id = $1
	`, creatorID).Scan(
		&stats.Today.Coins, &stats.Today.Messages, &stats.Today.Cents,
		&stats.Week.Coins, &stats.Week.Messages, &stats.Week.Cents,
		&stats.Month.Coins, &stats.Month.Messages, &stats.Month.Cents,
		&stats.Total.Coins, &stats.Total.Messages, &stats.Total.Cents,
	)
	if err != nil {
		return nil, fmt.Errorf("query stats: %w", err)
	}

	// Tier basiert auf MONATS-Coins (Reset am 1. des Monats)
	tier, nextTier, coinsToNext := TierForCoins(stats.Month.Coins)
	stats.CurrentTier = tier.Name
	stats.TierPercent = tier.Percent
	if nextTier != nil {
		nt := nextTier.Name
		stats.NextTier = &nt
		stats.CoinsToNext = coinsToNext
	}

	return stats, nil
}
