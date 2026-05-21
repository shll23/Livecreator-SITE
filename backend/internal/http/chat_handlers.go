package http

import (
	"errors"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/livecreator/backend/internal/earnings"
	"github.com/livecreator/backend/internal/models"
	"github.com/livecreator/backend/internal/wallet"
)

// ============================================================================
// GET /api/conversations — Inbox des aktuellen Users
//
// Funktioniert für Customer UND Creator:
//  - Customer sieht alle Chats mit Creators
//  - Creator sieht alle Chats mit Customers
// ============================================================================

func (s *Server) listConversations(c *fiber.Ctx) error {
	uid := currentUserID(c)
	role, _ := c.Locals("role").(models.UserRole)
	ctx := c.UserContext()

	var rows pgx.Rows
	var err error

	if role == models.RoleCreator {
		// Creator-Sicht: zeige Chats wo creator_id = uid, mit Customer-Details
		rows, err = s.db.Query(ctx, `
			SELECT
				c.id,
				c.customer_id AS peer_id,
				cu.display_name AS peer_name,
				NULL::TEXT AS peer_handle,
				cu.avatar_url AS peer_avatar,
				c.last_message_preview,
				c.last_message_at,
				c.creator_unread_count AS unread_count,
				c.is_blocked
			FROM conversations c
			JOIN customers cu ON cu.user_id = c.customer_id
			WHERE c.creator_id = $1
			  AND c.is_archived_by_creator = FALSE
			ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
			LIMIT 100
		`, uid)
	} else {
		// Customer-Sicht: zeige Chats wo customer_id = uid, mit Creator-Details
		rows, err = s.db.Query(ctx, `
			SELECT
				c.id,
				c.creator_id AS peer_id,
				cr.display_name AS peer_name,
				cr.handle AS peer_handle,
				cr.avatar_url AS peer_avatar,
				c.last_message_preview,
				c.last_message_at,
				c.customer_unread_count AS unread_count,
				c.is_blocked
			FROM conversations c
			JOIN creators cr ON cr.user_id = c.creator_id
			WHERE c.customer_id = $1
			  AND c.is_archived_by_customer = FALSE
			ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
			LIMIT 100
		`, uid)
	}

	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	out := []fiber.Map{}
	for rows.Next() {
		var (
			id          uuid.UUID
			peerID      uuid.UUID
			peerName    string
			peerHandle  *string
			peerAvatar  *string
			lastPreview *string
			lastAt      interface{}
			unread      int
			isBlocked   bool
		)
		if err := rows.Scan(&id, &peerID, &peerName, &peerHandle, &peerAvatar, &lastPreview, &lastAt, &unread, &isBlocked); err != nil {
			return errInternal(c, err)
		}
		out = append(out, fiber.Map{
			"id":                   id,
			"peer_id":              peerID,
			"peer_name":            peerName,
			"peer_handle":          peerHandle,
			"peer_avatar":          peerAvatar,
			"last_message_preview": lastPreview,
			"last_message_at":      lastAt,
			"unread_count":         unread,
			"is_blocked":           isBlocked,
		})
	}
	return c.JSON(fiber.Map{"conversations": out})
}

// ============================================================================
// POST /api/conversations — Neuen Chat starten (oder existierenden zurückgeben)
//
// Body: { "creator_user_id": "uuid" } — Customer startet Chat mit Creator
// Idempotent: Falls Chat schon existiert, gibt diesen zurück.
// Nur Customer dürfen Chats starten (Creator antwortet nur).
// ============================================================================

type createConversationRequest struct {
	CreatorUserID string `json:"creator_user_id"`
}

func (s *Server) createConversation(c *fiber.Ctx) error {
	uid := currentUserID(c)
	role, _ := c.Locals("role").(models.UserRole)
	ctx := c.UserContext()

	if role != models.RoleCustomer {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "only_customer_can_start_chat"})
	}

	var req createConversationRequest
	if err := c.BodyParser(&req); err != nil {
		return errBadRequest(c, "invalid_body")
	}
	creatorID, err := uuid.Parse(req.CreatorUserID)
	if err != nil {
		return errBadRequest(c, "invalid_creator_user_id")
	}

	// Creator muss existieren und gelistet sein
	var creatorExists bool
	err = s.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM creators cr
			JOIN users u ON u.id = cr.user_id
			WHERE cr.user_id = $1 AND cr.is_listed = TRUE AND u.status = 'active'
		)
	`, creatorID).Scan(&creatorExists)
	if err != nil {
		return errInternal(c, err)
	}
	if !creatorExists {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "creator_not_found"})
	}

	// Conversation upsert (UNIQUE constraint sorgt für Idempotenz)
	var convID uuid.UUID
	err = s.db.QueryRow(ctx, `
		INSERT INTO conversations (creator_id, customer_id)
		VALUES ($1, $2)
		ON CONFLICT (creator_id, customer_id) DO UPDATE
		  SET updated_at = NOW()
		RETURNING id
	`, creatorID, uid).Scan(&convID)
	if err != nil {
		return errInternal(c, err)
	}

	return c.JSON(fiber.Map{
		"id":              convID,
		"creator_user_id": creatorID,
	})
}

// ============================================================================
// GET /api/conversations/:id — Chat-Details
// Validiert, dass der User Teilnehmer ist.
// ============================================================================

func (s *Server) getConversation(c *fiber.Ctx) error {
	uid := currentUserID(c)
	ctx := c.UserContext()

	convID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errBadRequest(c, "invalid_conversation_id")
	}

	var (
		creatorID, customerID uuid.UUID
		peerName              string
		peerHandle            *string
		peerAvatar            *string
		peerBio               *string
		messagePriceCoins     int
		isBlocked             bool
		creatorUnread         int
		customerUnread        int
	)

	err = s.db.QueryRow(ctx, `
		SELECT
			c.creator_id, c.customer_id, c.is_blocked,
			c.creator_unread_count, c.customer_unread_count,
			CASE WHEN c.customer_id = $1
				THEN cr.display_name
				ELSE cu.display_name
			END AS peer_name,
			CASE WHEN c.customer_id = $1 THEN cr.handle ELSE NULL END AS peer_handle,
			CASE WHEN c.customer_id = $1 THEN cr.avatar_url ELSE cu.avatar_url END AS peer_avatar,
			CASE WHEN c.customer_id = $1 THEN cr.bio ELSE NULL END AS peer_bio,
			cr.message_price_coins
		FROM conversations c
		JOIN creators cr  ON cr.user_id  = c.creator_id
		JOIN customers cu ON cu.user_id  = c.customer_id
		WHERE c.id = $2
	`, uid, convID).Scan(
		&creatorID, &customerID, &isBlocked,
		&creatorUnread, &customerUnread,
		&peerName, &peerHandle, &peerAvatar, &peerBio,
		&messagePriceCoins,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "conversation_not_found"})
		}
		return errInternal(c, err)
	}

	// Authorization: User muss Teilnehmer sein
	if uid != creatorID && uid != customerID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_participant"})
	}

	// Eigene Unread-Count je nach Rolle
	var myUnread int
	if uid == creatorID {
		myUnread = creatorUnread
	} else {
		myUnread = customerUnread
	}

	return c.JSON(fiber.Map{
		"id":                  convID,
		"creator_user_id":     creatorID,
		"customer_user_id":    customerID,
		"peer_name":           peerName,
		"peer_handle":         peerHandle,
		"peer_avatar":         peerAvatar,
		"peer_bio":            peerBio,
		"message_price_coins": messagePriceCoins,
		"unread_count":        myUnread,
		"is_blocked":          isBlocked,
	})
}

// ============================================================================
// GET /api/conversations/:id/messages — Nachrichten in einem Chat
// Optional: ?before=<message_uuid>&limit=50 für Pagination
// ============================================================================

func (s *Server) listMessages(c *fiber.Ctx) error {
	uid := currentUserID(c)
	ctx := c.UserContext()

	convID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errBadRequest(c, "invalid_conversation_id")
	}

	// Authorization: User muss Teilnehmer sein
	var creatorID, customerID uuid.UUID
	err = s.db.QueryRow(ctx, `
		SELECT creator_id, customer_id FROM conversations WHERE id = $1
	`, convID).Scan(&creatorID, &customerID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "conversation_not_found"})
		}
		return errInternal(c, err)
	}
	if uid != creatorID && uid != customerID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_participant"})
	}

	// Pagination
	limit := c.QueryInt("limit", 50)
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	before := c.Query("before")

	var rows pgx.Rows
	if before != "" {
		var beforeID uuid.UUID
		beforeID, err = uuid.Parse(before)
		if err != nil {
			return errBadRequest(c, "invalid_before")
		}
		rows, err = s.db.Query(ctx, `
			SELECT id, sender_role, sender_id, msg_type, body, coin_cost, read_at, created_at
			FROM messages
			WHERE conversation_id = $1
			  AND deleted_at IS NULL
			  AND created_at < (SELECT created_at FROM messages WHERE id = $2)
			ORDER BY created_at DESC
			LIMIT $3
		`, convID, beforeID, limit)
	} else {
		rows, err = s.db.Query(ctx, `
			SELECT id, sender_role, sender_id, msg_type, body, coin_cost, read_at, created_at
			FROM messages
			WHERE conversation_id = $1
			  AND deleted_at IS NULL
			ORDER BY created_at DESC
			LIMIT $2
		`, convID, limit)
	}

	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	// In Reverse-Order sammeln (Chat soll von alt nach neu zeigen)
	out := []fiber.Map{}
	for rows.Next() {
		var (
			id         uuid.UUID
			senderRole string
			senderID   uuid.UUID
			msgType    string
			body       *string
			coinCost   int
			readAt     interface{}
			createdAt  interface{}
		)
		if err := rows.Scan(&id, &senderRole, &senderID, &msgType, &body, &coinCost, &readAt, &createdAt); err != nil {
			return errInternal(c, err)
		}
		out = append(out, fiber.Map{
			"id":          id,
			"sender_role": senderRole,
			"sender_id":   senderID,
			"msg_type":    msgType,
			"body":        body,
			"coin_cost":   coinCost,
			"read_at":     readAt,
			"created_at":  createdAt,
		})
	}

	// Reverse damit Frontend von alt zu neu rendern kann
	reverse(out)
	return c.JSON(fiber.Map{"messages": out})
}

func reverse(s []fiber.Map) {
	for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
		s[i], s[j] = s[j], s[i]
	}
}

// ============================================================================
// POST /api/conversations/:id/messages — Nachricht senden
//
// HERZSTÜCK: Atomische Transaktion
//   1. Conversation prüfen (User ist Teilnehmer, nicht blocked)
//   2. Customer → Coins abziehen + Ledger-Buchung (Customer -X / Creator +X)
//   3. Creator → kostet nichts (sender_role = 'creator')
//   4. Message einfügen
//   5. Conversation-Metadaten updaten
//   6. Unread-Count beim Empfänger erhöhen
//
// Body: { "body": "text" }
// ============================================================================

type sendMessageRequest struct {
	Body string `json:"body"`
}

func (s *Server) sendMessage(c *fiber.Ctx) error {
	uid := currentUserID(c)
	ctx := c.UserContext()

	convID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errBadRequest(c, "invalid_conversation_id")
	}

	var req sendMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return errBadRequest(c, "invalid_body")
	}
	body := strings.TrimSpace(req.Body)
	if body == "" {
		return errBadRequest(c, "empty_body")
	}
	if len(body) > 4000 {
		return errBadRequest(c, "body_too_long")
	}

	// Conversation laden + Validierungen
	var (
		creatorID, customerID uuid.UUID
		messagePriceCoins     int
		isBlocked             bool
	)
	err = s.db.QueryRow(ctx, `
		SELECT c.creator_id, c.customer_id, c.is_blocked, cr.message_price_coins
		FROM conversations c
		JOIN creators cr ON cr.user_id = c.creator_id
		WHERE c.id = $1
	`, convID).Scan(&creatorID, &customerID, &isBlocked, &messagePriceCoins)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "conversation_not_found"})
		}
		return errInternal(c, err)
	}

	// Authorization
	if uid != creatorID && uid != customerID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_participant"})
	}
	if isBlocked {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "conversation_blocked"})
	}

	// Sender-Rolle aus User-Rolle ableiten
	var senderRole string
	if uid == creatorID {
		senderRole = "creator"
	} else {
		senderRole = "customer"
	}

	// Customer zahlt Coins, Creator nicht
	coinCost := 0
	var ledgerTxID *uuid.UUID

	if senderRole == "customer" {
		// Balance prüfen
		balance, err := s.wallet.GetBalance(ctx, uid)
		if err != nil {
			return errInternal(c, err)
		}
		if balance < int64(messagePriceCoins) {
			return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
				"error":          "insufficient_coins",
				"required_coins": messagePriceCoins,
				"balance_coins":  balance,
			})
		}

		// Ledger-Buchung: Customer -X, Creator +X
		// (Plattform-Cut nehmen wir später beim Auszahlen, nicht hier)
		txID, err := s.wallet.RecordTransaction(
			ctx,
			"message_send",
			"", // Kein Idempotency-Key — jeder Send ist eindeutig
			[]wallet.Entry{
				{
					AccountKey:  wallet.UserAccountKey(uid),
					AccountType: "user",
					AmountCoins: -int64(messagePriceCoins),
					Description: fmt.Sprintf("Nachricht in Chat %s", convID),
				},
				{
					AccountKey:  wallet.CreatorAccountKey(creatorID),
					AccountType: "creator",
					AmountCoins: int64(messagePriceCoins),
					Description: fmt.Sprintf("Nachricht von Customer %s", uid),
				},
			},
			map[string]interface{}{
				"conversation_id": convID.String(),
			},
		)
		if err != nil {
			return errInternal(c, err)
		}
		coinCost = messagePriceCoins
		ledgerTxID = &txID
	}

	// Message einfügen + Conversation updaten in EINER Transaktion
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return errInternal(c, err)
	}
	defer tx.Rollback(ctx)

	preview := body
	if len(preview) > 120 {
		preview = preview[:117] + "..."
	}

	// Response-Time berechnen: nur bei Creator-Antworten relevant.
	// Sekunden seit letzter Customer-Message in dieser Conversation.
	var responseTimeSeconds *int
	if senderRole == "creator" {
		var rt int
		err = tx.QueryRow(ctx, `
			SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::INTEGER
			FROM messages
			WHERE conversation_id = $1
			  AND sender_role = 'customer'
			  AND deleted_at IS NULL
			ORDER BY created_at DESC
			LIMIT 1
		`, convID).Scan(&rt)
		if err == nil {
			responseTimeSeconds = &rt
		}
		// Wenn keine vorherige Customer-Message: NULL bleibt
	}

	var messageID uuid.UUID
	var createdAt interface{}
	err = tx.QueryRow(ctx, `
		INSERT INTO messages
			(conversation_id, sender_role, sender_id, msg_type, body, coin_cost, ledger_transaction_id, response_time_seconds)
		VALUES ($1, $2, $3, 'text', $4, $5, $6, $7)
		RETURNING id, created_at
	`, convID, senderRole, uid, body, coinCost, ledgerTxID, responseTimeSeconds).Scan(&messageID, &createdAt)
	if err != nil {
		return errInternal(c, err)
	}

	// Conversation updaten: Preview, last_message_at, Unread-Count beim Empfänger erhöhen
	var unreadUpdate string
	if senderRole == "customer" {
		unreadUpdate = "creator_unread_count = creator_unread_count + 1"
	} else {
		unreadUpdate = "customer_unread_count = customer_unread_count + 1"
	}

	_, err = tx.Exec(ctx, fmt.Sprintf(`
		UPDATE conversations
		SET last_message_preview = $1,
		    last_message_at = NOW(),
		    %s
		WHERE id = $2
	`, unreadUpdate), preview, convID)
	if err != nil {
		return errInternal(c, err)
	}

	// === EARNINGS: Provision für Creator speichern (nur wenn Customer Sender ist) ===
	if senderRole == "customer" && coinCost > 0 {
		if err := earnings.RecordEarning(ctx, tx, messageID, creatorID, customerID, coinCost); err != nil {
			return errInternal(c, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return errInternal(c, err)
	}

	// Neue Balance zurückgeben (falls Customer)
	resp := fiber.Map{
		"id":          messageID,
		"sender_role": senderRole,
		"sender_id":   uid,
		"body":        body,
		"coin_cost":   coinCost,
		"created_at":  createdAt,
	}
	if senderRole == "customer" {
		newBalance, _ := s.wallet.GetBalance(ctx, uid)
		resp["balance_coins"] = newBalance
	}

	// === PUSH-NOTIFICATION an den Empfaenger ===
	// Der Empfaenger ist der jeweils andere Teilnehmer der Conversation.
	var receiverID uuid.UUID
	if senderRole == "customer" {
		receiverID = creatorID
	} else {
		receiverID = customerID
	}
	s.notifyNewMessage(ctx, receiverID, uid, senderRole, convID.String(), body)

	return c.JSON(resp)
}

// ============================================================================
// POST /api/conversations/:id/read — Chat als gelesen markieren
//
// Setzt unread_count des aktuellen Users auf 0 und markiert alle empfangenen
// Messages als gelesen (read_at = NOW()).
// ============================================================================

func (s *Server) markConversationRead(c *fiber.Ctx) error {
	uid := currentUserID(c)
	ctx := c.UserContext()

	convID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errBadRequest(c, "invalid_conversation_id")
	}

	// Authorization + Rolle holen
	var creatorID, customerID uuid.UUID
	err = s.db.QueryRow(ctx, `
		SELECT creator_id, customer_id FROM conversations WHERE id = $1
	`, convID).Scan(&creatorID, &customerID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "conversation_not_found"})
		}
		return errInternal(c, err)
	}
	if uid != creatorID && uid != customerID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_participant"})
	}

	// Welche Rolle bist du, wessen Nachrichten markierst du als gelesen?
	var oppositeRole string
	var unreadField string
	if uid == creatorID {
		oppositeRole = "customer" // Creator markiert Customer-Messages als gelesen
		unreadField = "creator_unread_count"
	} else {
		oppositeRole = "creator"
		unreadField = "customer_unread_count"
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return errInternal(c, err)
	}
	defer tx.Rollback(ctx)

	// Messages als gelesen markieren
	_, err = tx.Exec(ctx, `
		UPDATE messages
		SET read_at = NOW()
		WHERE conversation_id = $1
		  AND sender_role = $2
		  AND read_at IS NULL
	`, convID, oppositeRole)
	if err != nil {
		return errInternal(c, err)
	}

	// Unread-Counter zurücksetzen
	_, err = tx.Exec(ctx, fmt.Sprintf(`
		UPDATE conversations SET %s = 0 WHERE id = $1
	`, unreadField), convID)
	if err != nil {
		return errInternal(c, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return errInternal(c, err)
	}

	return c.JSON(fiber.Map{"ok": true})
}

// ============================================================================
// EOF
// ============================================================================
