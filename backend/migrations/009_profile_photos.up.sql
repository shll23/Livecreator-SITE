-- ============================================================================
-- 009_profile_photos.up.sql
--
-- Photo-Management für Creator-Profile mit Moderations-Workflow
-- Status-Flow: pending_review -> approved | rejected
-- ============================================================================

CREATE TABLE profile_photos (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id        UUID NOT NULL REFERENCES creators(user_id) ON DELETE CASCADE,
    file_path         TEXT NOT NULL,        -- Relativ: profiles/{creator_id}/{uuid}.jpg
    thumb_path        TEXT,                 -- Thumbnail: profiles/{creator_id}/{uuid}_thumb.jpg
    sort_order        INTEGER NOT NULL DEFAULT 0,
    is_primary        BOOLEAN NOT NULL DEFAULT FALSE,
    status            TEXT NOT NULL DEFAULT 'pending_review'
                      CHECK (status IN ('pending_review', 'approved', 'rejected')),
    rejection_reason  TEXT,
    width             INTEGER,
    height            INTEGER,
    file_size_bytes   INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at       TIMESTAMPTZ,
    reviewed_by       UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_profile_photos_creator ON profile_photos(creator_id, sort_order);
CREATE INDEX idx_profile_photos_status ON profile_photos(status, created_at DESC);

-- Nur EIN Primary-Photo pro Creator
CREATE UNIQUE INDEX idx_profile_photos_one_primary
  ON profile_photos(creator_id)
  WHERE is_primary = TRUE AND status = 'approved';
