package push

import (
	"context"
	"encoding/json"
	"io"
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

// PublicKey gibt den VAPID-Public-Key zurueck (fuer Frontend-Subscribe).
func (sender *Sender) PublicKey() string {
	return sender.vapidPublic
}

// SendToUser schickt eine Push-Notification an alle Devices eines Users.
// Funktioniert async im Hintergrund (kein Block des HTTP-Requests).
// Tote Subscriptions (410 Gone) werden automatisch geloescht.
func (sender *Sender) SendToUser(userID uuid.UUID, payload Payload) {
	if sender.vapidPublic == "" || sender.vapidPriv == "" {
		log.Printf("[push] VAPID-Keys fehlen, skip")
		return
	}
	go sender.sendToUserInternal(userID, payload)
}

// SendToUsers schickt eine Push-Notification an alle aufgelisteten User.
// Beispiel: an alle Admins gleichzeitig.
func (sender *Sender) SendToUsers(userIDs []uuid.UUID, payload Payload) {
	for _, uid := range userIDs {
		sender.SendToUser(uid, payload)
	}
}

// SetGlobal bleibt als no-op fuer Backwards-Compat (kann spaeter entfernt werden).
func SetGlobal(s *Sender) {}

type subscription struct {
	ID       uuid.UUID
	Endpoint string
	P256dh   string
	Auth     string
}

func (sender *Sender) sendToUserInternal(userID uuid.UUID, payload Payload) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	rows, err := sender.db.Query(ctx, `
		SELECT id, endpoint, p256dh_key, auth_key
		FROM push_subscriptions
		WHERE user_id = $1
	`, userID)
	if err != nil {
		log.Printf("[push] Query-Error: %v", err)
		return
	}

	var subs []subscription
	for rows.Next() {
		var x subscription
		if err := rows.Scan(&x.ID, &x.Endpoint, &x.P256dh, &x.Auth); err != nil {
			continue
		}
		subs = append(subs, x)
	}
	rows.Close()

	if len(subs) == 0 {
		return
	}

	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[push] Marshal-Error: %v", err)
		return
	}

	subj := sender.vapidSubj
	if subj == "" {
		subj = "mailto:admin@verliebdich.com"
	}

	for _, sub := range subs {
		webpushSub := &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys: webpush.Keys{
				P256dh: sub.P256dh,
				Auth:   sub.Auth,
			},
		}

		resp, err := webpush.SendNotification(body, webpushSub, &webpush.Options{
			Subscriber:      subj,
			VAPIDPublicKey:  sender.vapidPublic,
			VAPIDPrivateKey: sender.vapidPriv,
			TTL:             60,
		})
		if err != nil {
			log.Printf("[push] Send-Error fuer %s: %v", sub.Endpoint, err)
			continue
		}
		if resp.StatusCode >= 400 {
			bodyBytes, _ := io.ReadAll(resp.Body)
			log.Printf("[push] Send-Error status=%d body=%s", resp.StatusCode, string(bodyBytes))
		}
		_ = resp.Body.Close()

		// 404/410 = Subscription tot -> loeschen
		if resp.StatusCode == http.StatusGone || resp.StatusCode == http.StatusNotFound {
			ctx2, c2 := context.WithTimeout(context.Background(), 5*time.Second)
			_, _ = sender.db.Exec(ctx2, "DELETE FROM push_subscriptions WHERE id = $1", sub.ID)
			c2()
			log.Printf("[push] tote Subscription geloescht: %s", sub.Endpoint)
			continue
		}

		// Erfolgreich -> last_used_at updaten
		ctx2, c2 := context.WithTimeout(context.Background(), 5*time.Second)
		_, _ = sender.db.Exec(ctx2, "UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = $1", sub.ID)
		c2()
	}
}
