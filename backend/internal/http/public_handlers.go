package http

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// ============================================================================
// GET /api/creators
//
// Öffentliche Liste der gelisteten Creators mit optionalen Filtern.
//
// Query-Parameter (alle optional):
//   city         exakte Stadt-Übereinstimmung, z.B. "Berlin"
//   min_age      Mindestalter (inkl.), z.B. 25
//   max_age      Höchstalter (inkl.), z.B. 35
//   near_lat     Breitengrad für Umkreis-Suche (zusammen mit near_lng + radius_km)
//   near_lng     Längengrad für Umkreis-Suche
//   radius_km    Umkreis in km (default 100 wenn near_lat/lng gesetzt, max 500)
//   limit        max Ergebnisse (default 50, max 100)
//
// Beispiel:
//   GET /api/creators?city=Berlin&min_age=20&max_age=30
//   GET /api/creators?near_lat=52.52&near_lng=13.40&radius_km=200
// ============================================================================
func (s *Server) listCreators(c *fiber.Ctx) error {
	// Query-Builder: WHERE-Clauses + Args dynamisch zusammenbauen
	where := []string{
		"c.is_listed = TRUE",
		"u.status = 'active'",
	}
	args := []any{}
	argIdx := 1

	// city-Filter
	if city := strings.TrimSpace(c.Query("city")); city != "" {
		where = append(where, fmt.Sprintf("LOWER(c.city) = LOWER($%d)", argIdx))
		args = append(args, city)
		argIdx++
	}

	// min_age-Filter
	if minAgeStr := c.Query("min_age"); minAgeStr != "" {
		minAge, err := strconv.Atoi(minAgeStr)
		if err != nil || minAge < 18 || minAge > 99 {
			return errBadRequest(c, "invalid_min_age")
		}
		where = append(where, fmt.Sprintf("c.age >= $%d", argIdx))
		args = append(args, minAge)
		argIdx++
	}

	// max_age-Filter
	if maxAgeStr := c.Query("max_age"); maxAgeStr != "" {
		maxAge, err := strconv.Atoi(maxAgeStr)
		if err != nil || maxAge < 18 || maxAge > 99 {
			return errBadRequest(c, "invalid_max_age")
		}
		where = append(where, fmt.Sprintf("c.age <= $%d", argIdx))
		args = append(args, maxAge)
		argIdx++
	}

	// Umkreis-Suche mit Haversine via earthdistance Extension
	// earth_distance(ll_to_earth(lat1, lng1), ll_to_earth(lat2, lng2)) gibt Meter zurück
	var distanceSelect, distanceOrder string
	nearLatStr := c.Query("near_lat")
	nearLngStr := c.Query("near_lng")
	if nearLatStr != "" && nearLngStr != "" {
		nearLat, err1 := strconv.ParseFloat(nearLatStr, 64)
		nearLng, err2 := strconv.ParseFloat(nearLngStr, 64)
		if err1 != nil || err2 != nil {
			return errBadRequest(c, "invalid_coordinates")
		}

		// Radius in km, default 100, max 500
		radiusKm := 100.0
		if rStr := c.Query("radius_km"); rStr != "" {
			r, err := strconv.ParseFloat(rStr, 64)
			if err != nil || r < 1 || r > 500 {
				return errBadRequest(c, "invalid_radius_km")
			}
			radiusKm = r
		}

		// Distanz-Berechnung + Filter
		distanceSelect = fmt.Sprintf(
			", earth_distance(ll_to_earth($%d, $%d), ll_to_earth(c.latitude, c.longitude)) / 1000 AS distance_km",
			argIdx, argIdx+1,
		)
		where = append(where, "c.latitude IS NOT NULL", "c.longitude IS NOT NULL")
		where = append(where, fmt.Sprintf(
			"earth_distance(ll_to_earth($%d, $%d), ll_to_earth(c.latitude, c.longitude)) <= $%d * 1000",
			argIdx, argIdx+1, argIdx+2,
		))
		args = append(args, nearLat, nearLng, radiusKm)
		argIdx += 3

		// Bei Umkreis-Suche: nach Distanz sortieren
		distanceOrder = "distance_km ASC, "
	}

	// Limit
	limit := 50
	if lStr := c.Query("limit"); lStr != "" {
		l, err := strconv.Atoi(lStr)
		if err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	// Query zusammenbauen
	query := fmt.Sprintf(`
		SELECT c.user_id, c.handle, c.display_name, c.bio, c.avatar_url,
		       c.cover_url, c.message_price_coins, c.is_verified,
		       c.age, c.city, c.country, c.latitude, c.longitude
		       %s
		FROM creators c
		JOIN users u ON u.id = c.user_id
		WHERE %s
		ORDER BY %s c.created_at DESC
		LIMIT %d
	`, distanceSelect, strings.Join(where, " AND "), distanceOrder, limit)

	rows, err := s.db.Query(c.UserContext(), query, args...)
	if err != nil {
		return errInternal(c, err)
	}
	defer rows.Close()

	creators := []fiber.Map{}
	for rows.Next() {
		var (
			userID            string
			handle            string
			displayName       string
			bio               *string
			avatarURL         *string
			coverURL          *string
			messagePriceCoins int
			isVerified        bool
			age               *int
			city              *string
			country           *string
			latitude          *float64
			longitude         *float64
			distanceKm        *float64
		)

		if distanceSelect != "" {
			if err := rows.Scan(&userID, &handle, &displayName, &bio, &avatarURL, &coverURL,
				&messagePriceCoins, &isVerified, &age, &city, &country, &latitude, &longitude,
				&distanceKm); err != nil {
				return errInternal(c, err)
			}
		} else {
			if err := rows.Scan(&userID, &handle, &displayName, &bio, &avatarURL, &coverURL,
				&messagePriceCoins, &isVerified, &age, &city, &country, &latitude, &longitude); err != nil {
				return errInternal(c, err)
			}
		}

		entry := fiber.Map{
			"user_id":             userID,
			"handle":              handle,
			"display_name":        displayName,
			"bio":                 bio,
			"avatar_url":          avatarURL,
			"cover_url":           coverURL,
			"message_price_coins": messagePriceCoins,
			"is_verified":         isVerified,
			"age":                 age,
			"city":                city,
			"country":             country,
		}
		// Koordinaten + Distanz nur bei Umkreis-Suche zurückgeben (Privacy)
		if distanceKm != nil {
			entry["distance_km"] = *distanceKm
		}
		creators = append(creators, entry)
	}

	return c.JSON(fiber.Map{"creators": creators})
}

// ============================================================================
// GET /api/creators/:handle — Details zu einem Creator
// ============================================================================
func (s *Server) getCreatorByHandle(c *fiber.Ctx) error {
	handle := c.Params("handle")
	if handle == "" {
		return errBadRequest(c, "missing_handle")
	}

	var (
		userID            string
		displayName       string
		bio               *string
		avatarURL         *string
		coverURL          *string
		messagePriceCoins int
		isVerified        bool
		age               *int
		city              *string
		country           *string
	)
	err := s.db.QueryRow(c.UserContext(), `
		SELECT c.user_id, c.display_name, c.bio, c.avatar_url, c.cover_url,
		       c.message_price_coins, c.is_verified,
		       c.age, c.city, c.country
		FROM creators c
		JOIN users u ON u.id = c.user_id
		WHERE c.handle = $1 AND c.is_listed = TRUE AND u.status = 'active'
	`, handle).Scan(&userID, &displayName, &bio, &avatarURL, &coverURL,
		&messagePriceCoins, &isVerified, &age, &city, &country)

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "creator_not_found"})
	}

	return c.JSON(fiber.Map{
		"user_id":             userID,
		"handle":              handle,
		"display_name":        displayName,
		"bio":                 bio,
		"avatar_url":          avatarURL,
		"cover_url":           coverURL,
		"message_price_coins": messagePriceCoins,
		"is_verified":         isVerified,
		"age":                 age,
		"city":                city,
		"country":             country,
	})
}
