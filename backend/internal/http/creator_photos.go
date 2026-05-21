package http

import (
	"fmt"
	"image"
	"os"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/livecreator/backend/internal/models"
)

// ============================================================================
// CREATOR PHOTO MANAGEMENT
//
// Upload-Flow:
//   1. Frau lädt JPG/PNG hoch (max 10MB)
//   2. Backend speichert Original (resized auf max 2000px Breite)
//   3. Thumbnail (400x500) wird generiert
//   4. Status: 'pending_review' bis Manager approved
//   5. Approved Bilder erscheinen im Customer-Profil
// ============================================================================

const (
	maxUploadSize  = 10 * 1024 * 1024  // 10MB
	maxImageWidth  = 2000
	thumbWidth     = 400
	thumbHeight    = 500
)

// storagePath gibt den Basis-Pfad für Storage zurück (env STORAGE_PATH)
func storagePath() string {
	p := os.Getenv("STORAGE_PATH")
	if p == "" {
		p = "/app/storage"
	}
	return p
}

// ============================================================================
// GET /api/creator/profile/photos — Eigene Photos auflisten
// ============================================================================
func (s *Server) listMyPhotos(c *fiber.Ctx) error {
	uid := currentUserID(c)
	role, _ := c.Locals("role").(models.UserRole)
	if role != models.RoleCreator {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_a_creator"})
	}

	rows, err := s.db.Query(c.UserContext(), `
		SELECT id, file_path, thumb_path, sort_order, is_primary, status,
		       rejection_reason, width, height, file_size_bytes, created_at, reviewed_at
		FROM profile_photos
		WHERE creator_id = $1
		ORDER BY sort_order ASC, created_at ASC
	`, uid)
	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	photos := []fiber.Map{}
	for rows.Next() {
		var (
			id                   uuid.UUID
			filePath             string
			thumbPath            *string
			sortOrder            int
			isPrimary            bool
			status               string
			rejectionReason      *string
			width, height        *int
			fileSize             *int
			createdAt, reviewedAt interface{}
		)
		if err := rows.Scan(&id, &filePath, &thumbPath, &sortOrder, &isPrimary, &status,
			&rejectionReason, &width, &height, &fileSize, &createdAt, &reviewedAt); err != nil {
			return errInternal(c, err)
		}
		photos = append(photos, fiber.Map{
			"id":               id,
			"file_path":        filePath,
			"thumb_path":       thumbPath,
			"sort_order":       sortOrder,
			"is_primary":       isPrimary,
			"status":           status,
			"rejection_reason": rejectionReason,
			"width":            width,
			"height":           height,
			"file_size_bytes":  fileSize,
			"created_at":       createdAt,
			"reviewed_at":      reviewedAt,
		})
	}
	return c.JSON(fiber.Map{"photos": photos})
}

// ============================================================================
// POST /api/creator/profile/photos — Upload eines neuen Bilds
// Body: multipart/form-data mit Feld "photo"
// ============================================================================
func (s *Server) uploadMyPhoto(c *fiber.Ctx) error {
	uid := currentUserID(c)
	role, _ := c.Locals("role").(models.UserRole)
	if role != models.RoleCreator {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_a_creator"})
	}

	// File aus multipart holen
	fileHeader, err := c.FormFile("photo")
	if err != nil {
		return errBadRequest(c, "no_file")
	}
	if fileHeader.Size > maxUploadSize {
		return errBadRequest(c, "file_too_large")
	}

	// Content-Type prüfen
	ct := fileHeader.Header.Get("Content-Type")
	if !strings.HasPrefix(ct, "image/") {
		return errBadRequest(c, "not_an_image")
	}

	// Datei öffnen und mit imaging einlesen
	src, err := fileHeader.Open()
	if err != nil {
		return errInternal(c, err)
	}
	defer src.Close()

	img, _, err := image.Decode(src)
	if err != nil {
		return errBadRequest(c, "invalid_image")
	}

	// Original: max 2000px breit (wenn breiter, runter-skalieren)
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	if width > maxImageWidth {
		img = imaging.Resize(img, maxImageWidth, 0, imaging.Lanczos)
		bounds = img.Bounds()
		width = bounds.Dx()
		height = bounds.Dy()
	}

	// Thumbnail: 400x500 (Fill = wie object-cover)
	thumb := imaging.Fill(img, thumbWidth, thumbHeight, imaging.Center, imaging.Lanczos)

	// Dateiname (UUID) + Pfade
	photoID := uuid.New()
	dirRel := filepath.Join("profiles", uid.String())
	dirAbs := filepath.Join(storagePath(), dirRel)
	if err := os.MkdirAll(dirAbs, 0755); err != nil {
		return errInternal(c, err)
	}

	fileName := photoID.String() + ".jpg"
	thumbName := photoID.String() + "_thumb.jpg"
	fileRel := filepath.Join(dirRel, fileName)
	thumbRel := filepath.Join(dirRel, thumbName)
	fileAbs := filepath.Join(storagePath(), fileRel)
	thumbAbs := filepath.Join(storagePath(), thumbRel)

	// Speichern als JPEG (Quality 90)
	if err := imaging.Save(img, fileAbs, imaging.JPEGQuality(90)); err != nil {
		return errInternal(c, fmt.Errorf("save original: %w", err))
	}
	if err := imaging.Save(thumb, thumbAbs, imaging.JPEGQuality(85)); err != nil {
		os.Remove(fileAbs)
		return errInternal(c, fmt.Errorf("save thumb: %w", err))
	}

	// Dateigröße ermitteln
	stat, _ := os.Stat(fileAbs)
	var fileSize int64
	if stat != nil {
		fileSize = stat.Size()
	}

	// DB-Eintrag: nächster sort_order = max+1
	var nextSortOrder int
	err = s.db.QueryRow(c.UserContext(), `
		SELECT COALESCE(MAX(sort_order), -1) + 1 FROM profile_photos WHERE creator_id = $1
	`, uid).Scan(&nextSortOrder)
	if err != nil {
		os.Remove(fileAbs)
		os.Remove(thumbAbs)
		return errInternal(c, err)
	}

	// URL-Format: storage liegt unter /storage im API, also "/storage/profiles/..."
	urlPath := "/storage/" + fileRel
	thumbURLPath := "/storage/" + thumbRel

	_, err = s.db.Exec(c.UserContext(), `
		INSERT INTO profile_photos (
			id, creator_id, file_path, thumb_path, sort_order, is_primary,
			status, width, height, file_size_bytes
		) VALUES ($1, $2, $3, $4, $5, FALSE, 'pending_review', $6, $7, $8)
	`, photoID, uid, urlPath, thumbURLPath, nextSortOrder, width, height, fileSize)
	if err != nil {
		os.Remove(fileAbs)
		os.Remove(thumbAbs)
		return errInternal(c, err)
	}

	return c.JSON(fiber.Map{
		"id":         photoID,
		"file_path":  urlPath,
		"thumb_path": thumbURLPath,
		"status":     "pending_review",
		"width":      width,
		"height":     height,
	})
}

// ============================================================================
// DELETE /api/creator/profile/photos/:id — Eigenes Bild löschen
// ============================================================================
func (s *Server) deleteMyPhoto(c *fiber.Ctx) error {
	uid := currentUserID(c)
	role, _ := c.Locals("role").(models.UserRole)
	if role != models.RoleCreator {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_a_creator"})
	}

	photoID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errBadRequest(c, "invalid_photo_id")
	}

	// Pfade holen + Ownership prüfen
	var filePath, thumbPath string
	err = s.db.QueryRow(c.UserContext(), `
		SELECT file_path, COALESCE(thumb_path, '') FROM profile_photos
		WHERE id = $1 AND creator_id = $2
	`, photoID, uid).Scan(&filePath, &thumbPath)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "photo_not_found"})
	}

	// DB-Eintrag löschen
	_, err = s.db.Exec(c.UserContext(), `
		DELETE FROM profile_photos WHERE id = $1 AND creator_id = $2
	`, photoID, uid)
	if err != nil {
		return errInternal(c, err)
	}

	// Dateien löschen (best effort) — nur wenn unter /storage/
	if strings.HasPrefix(filePath, "/storage/") {
		os.Remove(filepath.Join(storagePath(), strings.TrimPrefix(filePath, "/storage/")))
	}
	if strings.HasPrefix(thumbPath, "/storage/") {
		os.Remove(filepath.Join(storagePath(), strings.TrimPrefix(thumbPath, "/storage/")))
	}

	return c.JSON(fiber.Map{"deleted": true})
}

// ============================================================================
// POST /api/creator/profile/photos/:id/primary — Als Hauptbild markieren
// ============================================================================
func (s *Server) setMyPrimaryPhoto(c *fiber.Ctx) error {
	uid := currentUserID(c)
	role, _ := c.Locals("role").(models.UserRole)
	if role != models.RoleCreator {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_a_creator"})
	}

	photoID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errBadRequest(c, "invalid_photo_id")
	}

	tx, err := s.db.Begin(c.UserContext())
	if err != nil {
		return errInternal(c, err)
	}
	defer tx.Rollback(c.UserContext())

	// Erst alle anderen unprimaryen
	_, err = tx.Exec(c.UserContext(), `
		UPDATE profile_photos SET is_primary = FALSE WHERE creator_id = $1
	`, uid)
	if err != nil {
		return errInternal(c, err)
	}

	// Dann das gewünschte als primary (nur wenn es ihr gehört)
	tag, err := tx.Exec(c.UserContext(), `
		UPDATE profile_photos SET is_primary = TRUE
		WHERE id = $1 AND creator_id = $2
	`, photoID, uid)
	if err != nil {
		return errInternal(c, err)
	}
	if tag.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "photo_not_found"})
	}

	if err := tx.Commit(c.UserContext()); err != nil {
		return errInternal(c, err)
	}

	return c.JSON(fiber.Map{"updated": true})
}

// ============================================================================
// POST /api/creator/profile/photos/reorder — Reihenfolge ändern
// Body: { "photo_ids": ["uuid1", "uuid2", ...] }
// ============================================================================
type reorderRequest struct {
	PhotoIDs []string `json:"photo_ids"`
}

func (s *Server) reorderMyPhotos(c *fiber.Ctx) error {
	uid := currentUserID(c)
	role, _ := c.Locals("role").(models.UserRole)
	if role != models.RoleCreator {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not_a_creator"})
	}

	var req reorderRequest
	if err := c.BodyParser(&req); err != nil {
		return errBadRequest(c, "invalid_body")
	}

	tx, err := s.db.Begin(c.UserContext())
	if err != nil {
		return errInternal(c, err)
	}
	defer tx.Rollback(c.UserContext())

	for i, idStr := range req.PhotoIDs {
		pid, err := uuid.Parse(idStr)
		if err != nil {
			continue
		}
		_, err = tx.Exec(c.UserContext(), `
			UPDATE profile_photos SET sort_order = $1
			WHERE id = $2 AND creator_id = $3
		`, i, pid, uid)
		if err != nil {
			return errInternal(c, err)
		}
	}

	if err := tx.Commit(c.UserContext()); err != nil {
		return errInternal(c, err)
	}

	return c.JSON(fiber.Map{"updated": true})
}
