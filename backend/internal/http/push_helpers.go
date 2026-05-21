package http

import (
	"context"
	"log"
	"strings"

	"github.com/google/uuid"
	"github.com/livecreator/backend/internal/push"
)

// ============================================================================
// PUSH-HELPER FUNKTIONEN
//
// Convenience-Wrapper um pushSender.SendToUser fuer die einzelnen Events.
// Werden in den jeweiligen Event-Handlern aufgerufen.
// ============================================================================

// getAllAdminUserIDs gibt die User-IDs aller Admins zurueck.
func (s *Server) getAllAdminUserIDs(ctx context.Context) []uuid.UUID {
	rows, err := s.db.Query(ctx, `SELECT id FROM users WHERE role = 'admin'`)
	if err != nil {
		log.Printf("[push] Admin-Query-Error: %v", err)
		return nil
	}
	defer rows.Close()
	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}
	return ids
}

// senderDisplayName liefert einen menschenlesbaren Namen fuer den Sender:
// - Wenn Creator: display_name aus creators-Tabelle
// - Wenn Customer: display_name aus customers-Tabelle, sonst Email-Prefix
func (s *Server) senderDisplayName(ctx context.Context, senderID uuid.UUID, role string) string {
	if role == "creator" {
		var name string
		if err := s.db.QueryRow(ctx, `SELECT display_name FROM creators WHERE user_id = $1`, senderID).Scan(&name); err == nil {
			return name
		}
		return "Creator"
	}
	// Customer
	var name, email string
	_ = s.db.QueryRow(ctx, `
		SELECT COALESCE(cu.display_name, ''), u.email
		FROM users u
		LEFT JOIN customers cu ON cu.user_id = u.id
		WHERE u.id = $1
	`, senderID).Scan(&name, &email)
	name = strings.TrimSpace(name)
	if name != "" {
		return name
	}
	if email != "" {
		// Email-Prefix mit Capitalize ("max@gmail.com" -> "Max")
		prefix := strings.SplitN(email, "@", 2)[0]
		if len(prefix) > 0 {
			return strings.ToUpper(prefix[:1]) + prefix[1:]
		}
	}
	return "Jemand"
}

// notifyNewMessage: Sender hat Nachricht geschickt -> Receiver kriegt Push.
func (s *Server) notifyNewMessage(ctx context.Context, receiverID, senderID uuid.UUID, senderRole, conversationID, messageBody string) {
	if s.pushSender == nil {
		return
	}
	displayName := s.senderDisplayName(ctx, senderID, senderRole)

	// Body kuerzen (max 100 Zeichen)
	preview := strings.TrimSpace(messageBody)
	if len(preview) > 100 {
		preview = preview[:97] + "..."
	}

	// Click-URL haengt vom Receiver-Role ab
	var clickURL string
	if senderRole == "customer" {
		// Sender ist Customer -> Receiver ist Creator -> Creator-App
		clickURL = "/messages"
	} else {
		// Sender ist Creator -> Receiver ist Customer -> Customer-App
		clickURL = "/inbox"
	}

	s.pushSender.SendToUser(receiverID, push.Payload{
		Title: displayName,
		Body:  preview,
		Tag:   "chat-" + conversationID,
		Data: map[string]string{
			"url":             clickURL,
			"conversation_id": conversationID,
		},
	})
}

// notifyAdminsNewPurchase: Coin-Kauf erfolgreich -> alle Admins.
func (s *Server) notifyAdminsNewPurchase(ctx context.Context, customerID uuid.UUID, coins int, amountCents int) {
	if s.pushSender == nil {
		return
	}
	admins := s.getAllAdminUserIDs(ctx)
	if len(admins) == 0 {
		return
	}
	customerName := s.senderDisplayName(ctx, customerID, "customer")
	amount := float64(amountCents) / 100
	body := customerName + " hat " + formatEuro(amount) + " (" + formatInt(coins) + " Coins) gekauft"
	s.pushSender.SendToUsers(admins, push.Payload{
		Title: "Neuer Coin-Kauf",
		Body:  body,
		Tag:   "purchase",
		Data: map[string]string{
			"url": "/purchases",
		},
	})
}

// notifyAdminsNewCustomer: Neue Registrierung -> alle Admins.
func (s *Server) notifyAdminsNewCustomer(ctx context.Context, email string) {
	if s.pushSender == nil {
		return
	}
	admins := s.getAllAdminUserIDs(ctx)
	if len(admins) == 0 {
		return
	}
	s.pushSender.SendToUsers(admins, push.Payload{
		Title: "Neuer Kunde",
		Body:  email + " hat sich registriert",
		Tag:   "registration",
		Data: map[string]string{
			"url": "/customers",
		},
	})
}

// notifyAdminsNewPhoto: Foto hochgeladen -> alle Admins.
func (s *Server) notifyAdminsNewPhoto(ctx context.Context, creatorID uuid.UUID) {
	if s.pushSender == nil {
		return
	}
	admins := s.getAllAdminUserIDs(ctx)
	if len(admins) == 0 {
		return
	}
	creatorName := s.senderDisplayName(ctx, creatorID, "creator")
	s.pushSender.SendToUsers(admins, push.Payload{
		Title: "Neues Foto zur Pruefung",
		Body:  creatorName + " hat ein neues Bild hochgeladen",
		Tag:   "photo-pending",
		Data: map[string]string{
			"url": "/photos",
		},
	})
}

// notifyCreatorPhotoApproved: Foto freigegeben -> Creator.
func (s *Server) notifyCreatorPhotoApproved(ctx context.Context, creatorID uuid.UUID) {
	if s.pushSender == nil {
		return
	}
	s.pushSender.SendToUser(creatorID, push.Payload{
		Title: "Foto freigegeben",
		Body:  "Dein neues Bild ist jetzt sichtbar",
		Tag:   "photo-approved",
		Data: map[string]string{
			"url": "/profile",
		},
	})
}

// ===== kleine Format-Helpers =====
func formatEuro(amount float64) string {
	// Simples deutsches Format: "24,99 €"
	whole := int(amount)
	cents := int((amount - float64(whole)) * 100)
	if cents < 0 {
		cents = -cents
	}
	return formatInt(whole) + "," + padTwo(cents) + " €"
}

func formatInt(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	neg := n < 0
	if neg {
		n = -n
	}
	for i := 0; n > 0; i++ {
		if i > 0 && i%3 == 0 {
			s = "." + s
		}
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	if neg {
		s = "-" + s
	}
	return s
}

func padTwo(n int) string {
	if n < 10 {
		return "0" + string(rune('0'+n))
	}
	return string(rune('0'+n/10)) + string(rune('0'+n%10))
}
