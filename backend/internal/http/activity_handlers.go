package http

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ============================================================================
// ACTIVITY TRACKING
//
// Heartbeat-System: Frontend pingt /api/auth/heartbeat alle 60 Sekunden.
// - Wenn letzter Heartbeat < 5 Min her: Session verlaengern
// - Sonst: neue Session anfangen
// ============================================================================

const heartbeatGapSeconds = 300 // 5 Minuten

// POST /api/auth/heartbeat
// Aufgerufen vom Frontend alle 60s. Aktualisiert Aktivitaets-Session.
func (s *Server) authHeartbeat(c *fiber.Ctx) error {
	ctx := c.UserContext()

	uid, _ := c.Locals("user_id").(uuid.UUID)
	if uid == uuid.Nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthenticated"})
	}

	now := time.Now().UTC()

	// Letzte Session des Users suchen
	var lastID uuid.UUID
	var lastHeartbeat time.Time
	err := s.db.QueryRow(ctx, `
		SELECT id, last_heartbeat_at
		FROM user_activity_log
		WHERE user_id = $1
		ORDER BY last_heartbeat_at DESC
		LIMIT 1
	`, uid).Scan(&lastID, &lastHeartbeat)

	if err != nil {
		// Keine vorherige Session -> neue anlegen
		_, insErr := s.db.Exec(ctx, `
			INSERT INTO user_activity_log (user_id, session_start, last_heartbeat_at, duration_seconds)
			VALUES ($1, $2, $2, 0)
		`, uid, now)
		if insErr != nil {
			return errInternal(c, insErr)
		}
		return c.JSON(fiber.Map{"ok": true, "session": "new"})
	}

	// Gap berechnen
	gap := now.Sub(lastHeartbeat).Seconds()

	if gap > heartbeatGapSeconds {
		// Zu lange weg -> neue Session anlegen
		_, insErr := s.db.Exec(ctx, `
			INSERT INTO user_activity_log (user_id, session_start, last_heartbeat_at, duration_seconds)
			VALUES ($1, $2, $2, 0)
		`, uid, now)
		if insErr != nil {
			return errInternal(c, insErr)
		}
		return c.JSON(fiber.Map{"ok": true, "session": "new"})
	}

	// Session verlaengern
	_, updErr := s.db.Exec(ctx, `
		UPDATE user_activity_log
		SET last_heartbeat_at = $1,
		    duration_seconds = EXTRACT(EPOCH FROM ($1 - session_start))::INTEGER
		WHERE id = $2
	`, now, lastID)
	if updErr != nil {
		return errInternal(c, updErr)
	}

	return c.JSON(fiber.Map{"ok": true, "session": "extended"})
}

// GET /api/admin/creators/:id/activity?period=today|week|month
// Liefert Online-Zeit + Antwort-Stats fuer einen Creator
func (s *Server) adminCreatorActivity(c *fiber.Ctx) error {
	ctx := c.UserContext()

	creatorID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_id"})
	}

	period := c.Query("period", "today")
	var since time.Time
	now := time.Now().UTC()
	switch period {
	case "today":
		since = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	case "week":
		since = now.AddDate(0, 0, -7)
	case "month":
		since = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_period"})
	}

	// Online-Sekunden im Zeitraum
	var onlineSeconds int64
	err = s.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(duration_seconds), 0)
		FROM user_activity_log
		WHERE user_id = $1 AND session_start >= $2
	`, creatorID, since).Scan(&onlineSeconds)
	if err != nil {
		return errInternal(c, err)
	}

	// Antwort-Stats
	var avgResponse, medianResponse *float64
	var messagesAnswered int64
	err = s.db.QueryRow(ctx, `
		SELECT
			AVG(response_time_seconds),
			PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_seconds),
			COUNT(*)
		FROM messages
		WHERE sender_id = $1
		  AND response_time_seconds IS NOT NULL
		  AND created_at >= $2
		  AND deleted_at IS NULL
	`, creatorID, since).Scan(&avgResponse, &medianResponse, &messagesAnswered)
	if err != nil {
		return errInternal(c, err)
	}

	// Letzter Heartbeat (fuer "online jetzt" Indicator)
	var lastHeartbeat *time.Time
	_ = s.db.QueryRow(ctx, `
		SELECT last_heartbeat_at FROM user_activity_log
		WHERE user_id = $1
		ORDER BY last_heartbeat_at DESC LIMIT 1
	`, creatorID).Scan(&lastHeartbeat)

	var lastHeartbeatStr *string
	isOnlineNow := false
	if lastHeartbeat != nil {
		s := lastHeartbeat.Format(time.RFC3339)
		lastHeartbeatStr = &s
		isOnlineNow = now.Sub(*lastHeartbeat).Seconds() < heartbeatGapSeconds
	}

	return c.JSON(fiber.Map{
		"period":              period,
		"online_seconds":      onlineSeconds,
		"messages_answered":   messagesAnswered,
		"avg_response_seconds": avgResponse,
		"median_response_seconds": medianResponse,
		"last_heartbeat_at":   lastHeartbeatStr,
		"is_online_now":       isOnlineNow,
	})
}

// GET /api/admin/creators/activity-summary
// Liefert Activity-Zusammenfassung fuer ALLE Creator (heute)
// Wird in der Creator-Liste verwendet
func (s *Server) adminAllCreatorsActivitySummary(c *fiber.Ctx) error {
	ctx := c.UserContext()

	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	rows, err := s.db.Query(ctx, `
		SELECT
			cr.user_id,
			COALESCE((
				SELECT SUM(duration_seconds)
				FROM user_activity_log
				WHERE user_id = cr.user_id AND session_start >= $1
			), 0) AS online_today_seconds,
			(
				SELECT last_heartbeat_at FROM user_activity_log
				WHERE user_id = cr.user_id
				ORDER BY last_heartbeat_at DESC LIMIT 1
			) AS last_heartbeat,
			COALESCE((
				SELECT AVG(response_time_seconds)
				FROM messages
				WHERE sender_id = cr.user_id
				  AND response_time_seconds IS NOT NULL
				  AND created_at >= $1
				  AND deleted_at IS NULL
			), 0) AS avg_response_today
		FROM creators cr
	`, today)
	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	type Row struct {
		UserID            string   `json:"user_id"`
		OnlineTodaySeconds int64   `json:"online_today_seconds"`
		LastHeartbeatAt   *string  `json:"last_heartbeat_at"`
		IsOnlineNow       bool     `json:"is_online_now"`
		AvgResponseToday  *float64 `json:"avg_response_today_seconds"`
	}

	out := []Row{}
	for rows.Next() {
		var r Row
		var uid uuid.UUID
		var lastHB *time.Time
		var avgResp *float64
		if err := rows.Scan(&uid, &r.OnlineTodaySeconds, &lastHB, &avgResp); err != nil {
			return errInternal(c, err)
		}
		r.UserID = uid.String()
		if lastHB != nil {
			s := lastHB.Format(time.RFC3339)
			r.LastHeartbeatAt = &s
			r.IsOnlineNow = now.Sub(*lastHB).Seconds() < heartbeatGapSeconds
		}
		if avgResp != nil && *avgResp > 0 {
			r.AvgResponseToday = avgResp
		}
		out = append(out, r)
	}

	return c.JSON(fiber.Map{"creators": out})
}
