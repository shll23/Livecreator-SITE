package push

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Payload ist die Daten-Struktur die im Service Worker als event.data.json() ankommt.
type Payload struct {
	Title string            `json:"title"`
	Body  string            `json:"body"`
	Tag   string            `json:"tag,omitempty"`
	Data  map[string]string `json:"data,omitempty"`
}

// Sender enthaelt VAPID-Keys und DB-Pool.
type Sender struct {
	db          *pgxpool.Pool
	vapidPublic string
	vapidPriv   string
	vapidSubj   string
}

func NewSender(db *pgxpool.Pool) *Sender {
	return &Sender{
		db:          db,
		vapidPublic: os.Getenv("VAPID_PUBLIC_KEY"),
		vapidPriv:   os.Getenv("VAPID_PRIVATE_KEY"),
		vapidSubj:   os.Getenv("VAPID_SUBJECT"),
	}
}

// SendToUser schickt eine Push-Notification an alle Devices eines Users.
// Funktioniert async im Hintergrund (kein Block des HTTP-Requests).
// Tote Subscriptions (410 Gone) werden automatisch geloescht.
func (s *Sender) SendToUser(userID uuid.UUID, payload Payload) {
	if s.vapidPublic == "" || s.vapidPriv == "" {
		log.Printf("[push] VAPID-Keys fehlen, skip")
		return
	}

	go s.sendToUserInternal(userID, payload)
}

func (s *Sender) sendToUserInternal(userID uuid.UUID, payload Payload) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	rows, err := s.db.Query(ctx, `
		SELECT id, endpoint, p256dh_key, auth_key
		FROM push_subscriptions
		WHERE user_id = $1
	`, userID)
	if err != nil {
		log.Printf("[push] Query-Error: %v", err)
		return
	}
	defer rows.Close()

	type sub struct {
		ID       uuid.UUID
		Endpoint string
		P256dh   string
		Auth     string
	}
	var subs []sub
	for rows.Next() {
		var x sub
		if err := rows.Scan(&x.ID, &x.Endpoint, &x.P256dh, &x.Auth); err != nil {
			continue
		}
		subs = append(subs, x)
	}

	if len(subs) == 0 {
		return
	}

	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[push] Marshal-Error: %v", err)
		return
	}

	for _, x := range subs {
		s := &webpush.Subscription{
			Endpoint: x.Endpoint,
			Keys: webpush.Keys{
				P256dh: x.P256dh,
				Auth:   x.Auth,
			},
		}

		resp, err := webpush.SendNotification(body, s, &webpush.Options{
			Subscriber:      sender_subject_or_default(),
			VAPIDPublicKey:  sender_public_or_default(),
			VAPIDPrivateKey: sender_priv_or_default(),
			TTL:             60,
		})
		if err != nil {
			log.Printf("[push] Send-Error fuer %s: %v", x.Endpoint, err)
			continue
		}
		_ = resp.Body.Close()

		// 404/410 = Subscription tot -> loeschen
		if resp.StatusCode == http.StatusGone || resp.StatusCode == http.StatusNotFound {
			_, _ = s_db_exec(x.ID)
			log.Printf("[push] tote Subscription geloescht: %s", x.Endpoint)
			continue
		}

		// Erfolgreich -> last_used_at updaten
		_, _ = s_db_update_last_used(x.ID)
	}
}

// Helper-Funktionen weil senderInternal kein Receiver-Access auf "s" hat
// (Workaround weil die Closure-Variable s gleichzeitig die Subscription ist).
// Wir nutzen Package-globale Funktionen die das Sender-Singleton lesen.

var globalSender *Sender

func sender_subject_or_default() string {
	if globalSender != nil && globalSender.vapidSubj != "" {
		return globalSender.vapidSubj
	}
	return "mailto:admin@verliebdich.com"
}

func sender_public_or_default() string {
	if globalSender != nil {
		return globalSender.vapidPublic
	}
	return ""
}

func sender_priv_or_default() string {
	if globalSender != nil {
		return globalSender.vapidPriv
	}
	return ""
}

func s_db_exec(id uuid.UUID) (any, error) {
	if globalSender == nil {
		return nil, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return globalSender.db.Exec(ctx, "DELETE FROM push_subscriptions WHERE id = $1", id)
}

func s_db_update_last_used(id uuid.UUID) (any, error) {
	if globalSender == nil {
		return nil, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return globalSender.db.Exec(ctx, "UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = $1", id)
}

// SetGlobal wird beim Server-Start aufgerufen.
func SetGlobal(s *Sender) {
	globalSender = s
}

// PublicKey gibt den VAPID-Public-Key zurueck (fuer Frontend-Subscribe).
func (s *Sender) PublicKey() string {
	return s.vapidPublic
}
