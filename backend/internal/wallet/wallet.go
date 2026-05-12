package wallet

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Service kapselt alle Operationen am Wallet/Ledger.
// Doppelte Buchführung: Jede Transaktion = 2+ Einträge, Summe = 0.
type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

// ============================================================================
// Account-Keys (Konvention)
// ============================================================================

func UserAccountKey(userID uuid.UUID) string {
	return "user:" + userID.String()
}

func CreatorAccountKey(creatorUserID uuid.UUID) string {
	return "creator:" + creatorUserID.String()
}

const (
	SystemIncoming = "system:incoming"
	SystemRevenue  = "system:revenue"
	SystemWriteoff = "system:writeoff"
)

// ============================================================================
// Account-Lookup mit Auto-Create
// ============================================================================

// EnsureAccount holt oder erstellt ein Ledger-Konto und gibt dessen ID zurück.
func (s *Service) EnsureAccount(ctx context.Context, tx pgx.Tx, accountKey, accountType string) (uuid.UUID, error) {
	var id uuid.UUID
	err := tx.QueryRow(ctx, `
		INSERT INTO ledger_accounts (account_key, account_type)
		VALUES ($1, $2)
		ON CONFLICT (account_key) DO UPDATE SET account_key = EXCLUDED.account_key
		RETURNING id
	`, accountKey, accountType).Scan(&id)
	return id, err
}

// ============================================================================
// Balance-Abfrage
// ============================================================================

// GetBalance gibt das aktuelle Coin-Guthaben eines Users zurück.
// Kommt aus dem cached balance_coins-Feld.
func (s *Service) GetBalance(ctx context.Context, userID uuid.UUID) (int64, error) {
	var balance int64
	err := s.db.QueryRow(ctx, `
		SELECT COALESCE(balance_coins, 0)
		FROM ledger_accounts
		WHERE account_key = $1
	`, UserAccountKey(userID)).Scan(&balance)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return balance, err
}

// ============================================================================
// Transaktion-Logik
// ============================================================================

// Entry beschreibt einen einzelnen Ledger-Eintrag (debit oder credit).
type Entry struct {
	AccountKey  string
	AccountType string // "user", "creator", "system"
	AmountCoins int64  // positiv = credit, negativ = debit
	Description string
}

// RecordTransaction schreibt mehrere Einträge atomar als eine Transaktion.
// Validiert: Summe aller AmountCoins muss 0 sein (doppelte Buchführung).
// Updated den cached balance_coins jedes betroffenen Accounts.
func (s *Service) RecordTransaction(
	ctx context.Context,
	txType string,
	idempotencyKey string,
	entries []Entry,
	metadata map[string]interface{},
) (uuid.UUID, error) {
	if len(entries) < 2 {
		return uuid.Nil, errors.New("transaction needs at least 2 entries")
	}

	// Doppelte Buchführung: Summe muss exakt 0 sein
	var sum int64
	for _, e := range entries {
		sum += e.AmountCoins
	}
	if sum != 0 {
		return uuid.Nil, fmt.Errorf("entries sum to %d, must be 0", sum)
	}

	txID := uuid.New()

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)

	// Idempotenz-Check: gibt es schon einen Eintrag mit diesem Key?
	if idempotencyKey != "" {
		var existingTxID uuid.UUID
		err := tx.QueryRow(ctx, `
			SELECT transaction_id FROM ledger_entries WHERE idempotency_key = $1 LIMIT 1
		`, idempotencyKey).Scan(&existingTxID)
		if err == nil {
			// Schon gebucht, gib die existierende TX-ID zurück
			return existingTxID, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, err
		}
	}

	// Metadata zu JSON serialisieren (JSONB column)
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return uuid.Nil, fmt.Errorf("marshal metadata: %w", err)
	}
	if metadata == nil {
		metadataJSON = []byte("{}")
	}

	// Jeden Entry schreiben
	for i, e := range entries {
		accountID, err := s.EnsureAccount(ctx, tx, e.AccountKey, e.AccountType)
		if err != nil {
			return uuid.Nil, fmt.Errorf("ensure account %s: %w", e.AccountKey, err)
		}

		// Eintrag ins Ledger
		// Nur der erste Eintrag bekommt den Idempotency-Key
		var idemKey *string
		if i == 0 && idempotencyKey != "" {
			idemKey = &idempotencyKey
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO ledger_entries
				(transaction_id, tx_type, account_id, amount_coins, description, metadata, idempotency_key)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, txID, txType, accountID, e.AmountCoins, e.Description, metadataJSON, idemKey)
		if err != nil {
			return uuid.Nil, fmt.Errorf("insert entry: %w", err)
		}

		// Cached Balance updaten
		_, err = tx.Exec(ctx, `
			UPDATE ledger_accounts
			SET balance_coins = balance_coins + $1
			WHERE id = $2
		`, e.AmountCoins, accountID)
		if err != nil {
			return uuid.Nil, fmt.Errorf("update balance: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return uuid.Nil, err
	}
	return txID, nil
}

// ============================================================================
// History
// ============================================================================

type HistoryEntry struct {
	ID          uuid.UUID `json:"id"`
	TxType      string    `json:"tx_type"`
	AmountCoins int64     `json:"amount_coins"`
	Description string    `json:"description"`
	CreatedAt   string    `json:"created_at"`
}

// GetHistory gibt die letzten N Ledger-Bewegungen eines Users zurück.
func (s *Service) GetHistory(ctx context.Context, userID uuid.UUID, limit int) ([]HistoryEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	rows, err := s.db.Query(ctx, `
		SELECT e.id, e.tx_type, e.amount_coins, e.description, e.created_at
		FROM ledger_entries e
		JOIN ledger_accounts a ON a.id = e.account_id
		WHERE a.account_key = $1
		ORDER BY e.created_at DESC
		LIMIT $2
	`, UserAccountKey(userID), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []HistoryEntry{}
	for rows.Next() {
		var (
			e         HistoryEntry
			createdAt interface{}
		)
		if err := rows.Scan(&e.ID, &e.TxType, &e.AmountCoins, &e.Description, &createdAt); err != nil {
			return nil, err
		}
		e.CreatedAt = fmt.Sprintf("%v", createdAt)
		out = append(out, e)
	}
	return out, nil
}
