package payment

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
)

// MockProvider simuliert einen PSP für die Entwicklung.
// Keine echten Zahlungen — gibt sofort eine "Confirm"-URL zurück, die wenn
// aufgerufen die Coins gutschreibt. So können wir den kompletten Flow testen
// ohne PSP-Account.
type MockProvider struct {
	baseURL string // wie das Backend nach außen erreichbar ist, für die Confirm-URL
}

func NewMockProvider(baseURL string) *MockProvider {
	return &MockProvider{baseURL: baseURL}
}

func (p *MockProvider) Name() string {
	return "mock"
}

func (p *MockProvider) CreatePurchase(ctx context.Context, req PurchaseRequest) (*PurchaseResponse, error) {
	// Mock-Strategie: Der Frontend bekommt eine spezielle URL,
	// die direkt /api/wallet/mock-confirm/:purchase_id aufruft.
	// Im echten Frontend simulieren wir einen "Zahlen"-Klick.
redirectURL := fmt.Sprintf("%s/api/mock/confirm/%s", p.baseURL, req.PurchaseID.String())
	providerTxID := "mock_" + uuid.New().String()[:12]

	return &PurchaseResponse{
		RedirectURL:  redirectURL,
		ProviderTxID: providerTxID,
		Status:       "pending",
	}, nil
}

func (p *MockProvider) VerifyWebhook(rawBody []byte, headers map[string]string) (bool, error) {
	// Mock vertraut blindly. In echtem PSP würden wir HMAC-Signaturen prüfen.
	return true, nil
}

func (p *MockProvider) ParseWebhook(rawBody []byte, headers map[string]string) (*WebhookEvent, error) {
	var payload struct {
		ProviderTxID string `json:"provider_tx_id"`
		PurchaseID   string `json:"purchase_id"`
		EventType    string `json:"event_type"`
		AmountCents  int    `json:"amount_cents"`
		Currency     string `json:"currency"`
	}
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		return nil, err
	}

	purchaseID, err := uuid.Parse(payload.PurchaseID)
	if err != nil {
		return nil, err
	}

	return &WebhookEvent{
		ProviderTxID: payload.ProviderTxID,
		PurchaseID:   purchaseID,
		EventType:    payload.EventType,
		AmountCents:  payload.AmountCents,
		Currency:     payload.Currency,
		RawPayload:   rawBody,
	}, nil
}
