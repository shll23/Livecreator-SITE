package payment

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

// ============================================================================
// Provider-Interface
// Jeder echte PSP (CCBill, Verotel, Vendo, paysafecard, CoinGate, etc.)
// implementiert dieses Interface. Mock-Adapter simuliert sofortige Buchung.
// ============================================================================

type Provider interface {
	// Name gibt den PSP-Bezeichner zurück, z.B. "mock", "ccbill"
	Name() string

	// CreatePurchase startet einen Coin-Kauf.
	// Gibt eine Redirect-URL zurück, an die der Browser den Nutzer schickt
	// (bei echten PSPs eine PSP-Checkout-Seite; bei Mock direkt /api/wallet/mock-confirm)
	CreatePurchase(ctx context.Context, req PurchaseRequest) (*PurchaseResponse, error)

	// VerifyWebhook validiert eine eingehende Webhook-Anfrage.
	// Returns true, wenn der Webhook vom echten PSP stammt.
	VerifyWebhook(rawBody []byte, headers map[string]string) (bool, error)

	// ParseWebhook konvertiert das Webhook-Payload in ein WebhookEvent.
	ParseWebhook(rawBody []byte, headers map[string]string) (*WebhookEvent, error)
}

// ============================================================================
// Request / Response Types
// ============================================================================

type PurchaseRequest struct {
	UserID     uuid.UUID
	PurchaseID uuid.UUID
	Coins      int
	PriceCents int
	Currency   string
	// Wo soll PSP nach Erfolg/Fehler hin redirecten?
	SuccessURL string
	CancelURL  string
	// Webhook-Endpoint für asynchrone Status-Updates
	WebhookURL string
}

type PurchaseResponse struct {
	// URL zu der wir den Browser des Users schicken (PSP-Checkout)
	RedirectURL string
	// Provider-interne Transaction-ID
	ProviderTxID string
	// Status: "pending", "completed" (Mock kann sofort completen)
	Status string
}

type WebhookEvent struct {
	ProviderTxID string
	PurchaseID   uuid.UUID
	EventType    string // "completed", "failed", "refunded", "chargeback"
	AmountCents  int
	Currency     string
	RawPayload   []byte
}

// ============================================================================
// Errors
// ============================================================================

var (
	ErrInvalidSignature = errors.New("invalid webhook signature")
	ErrUnknownEvent     = errors.New("unknown webhook event type")
)
