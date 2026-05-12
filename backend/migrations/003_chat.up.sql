-- ============================================================================
-- Migration 003: Chat
-- Pay-per-Message: Customer schickt Nachricht → Coins werden abgezogen.
-- Creator-Antworten kosten nichts.
-- ============================================================================

-- Conversation = 1:1 zwischen einem Customer und einem Creator
CREATE TABLE conversations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Snapshot des Preises bei Conversation-Start (gegen Race Conditions wenn Creator Preis ändert)
    -- Aktueller Preis kommt aus creators.message_price_coins, das hier ist nur Audit
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    -- Counter für Inbox-Sortierung & Unread-Badges
    creator_unread_count  INTEGER NOT NULL DEFAULT 0,
    customer_unread_count INTEGER NOT NULL DEFAULT 0,
    -- Status
    is_archived_by_creator  BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived_by_customer BOOLEAN NOT NULL DEFAULT FALSE,
    is_blocked   BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_by   UUID REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Eine Conversation pro Creator+Customer-Paar
    UNIQUE (creator_id, customer_id)
);

CREATE INDEX idx_conv_creator_inbox ON conversations(creator_id, last_message_at DESC NULLS LAST)
    WHERE is_archived_by_creator = FALSE;
CREATE INDEX idx_conv_customer_inbox ON conversations(customer_id, last_message_at DESC NULLS LAST)
    WHERE is_archived_by_customer = FALSE;

-- ============================================================================
-- Nachrichten
-- ============================================================================
CREATE TYPE message_sender AS ENUM ('creator', 'customer', 'system');
CREATE TYPE message_type AS ENUM ('text', 'media', 'system_notice');

CREATE TABLE messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_role  message_sender NOT NULL,
    sender_id    UUID NOT NULL REFERENCES users(id),
    msg_type     message_type NOT NULL DEFAULT 'text',
    body         TEXT,                              -- Plain Text. Media-Refs in attachments
    -- Wenn Customer geschickt: Coin-Kosten zum Zeitpunkt
    coin_cost    INTEGER NOT NULL DEFAULT 0,
    ledger_transaction_id UUID,                     -- Verweis auf Coin-Abbuchung
    -- Read-Receipts
    read_at      TIMESTAMPTZ,
    -- Soft-Delete (nur Creator/Admin kann)
    deleted_at   TIMESTAMPTZ,
    deleted_by   UUID REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time-series-optimiert: neueste Nachrichten zuerst pro Conversation
CREATE INDEX idx_messages_conv_time ON messages(conversation_id, created_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_unread ON messages(conversation_id, sender_role, read_at)
    WHERE read_at IS NULL AND deleted_at IS NULL;

-- ============================================================================
-- Attachments (Bilder/Videos in Nachrichten — PPV optional)
-- Wird in Session 4 voll implementiert, hier schon Schema vorbereiten
-- ============================================================================
CREATE TYPE media_type AS ENUM ('image', 'video', 'audio');
CREATE TYPE media_status AS ENUM ('uploading', 'processing', 'ready', 'failed', 'rejected');

CREATE TABLE media_assets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id     UUID NOT NULL REFERENCES users(id),  -- meist Creator
    media_type   media_type NOT NULL,
    storage_key  TEXT NOT NULL,                       -- S3/R2-Key
    mime_type    VARCHAR(80),
    size_bytes   BIGINT,
    width        INTEGER,
    height       INTEGER,
    duration_ms  INTEGER,                             -- für Video/Audio
    -- Verarbeitung
    status       media_status NOT NULL DEFAULT 'uploading',
    thumbnail_storage_key TEXT,
    -- Moderation (später)
    moderation_score JSONB,
    -- PPV
    is_ppv       BOOLEAN NOT NULL DEFAULT FALSE,
    ppv_price_coins INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_owner ON media_assets(owner_id, created_at DESC);
CREATE INDEX idx_media_status ON media_assets(status) WHERE status IN ('uploading', 'processing');

-- Verknüpfung Nachricht ↔ Attachment (n:m)
CREATE TABLE message_attachments (
    message_id   UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    media_id     UUID NOT NULL REFERENCES media_assets(id),
    sort_order   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (message_id, media_id)
);

-- Tracking welcher Customer welches PPV-Asset freigeschaltet hat
CREATE TABLE media_unlocks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id),
    media_id     UUID NOT NULL REFERENCES media_assets(id),
    coin_cost    INTEGER NOT NULL,
    ledger_transaction_id UUID NOT NULL,
    unlocked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, media_id)
);

CREATE INDEX idx_media_unlocks_user ON media_unlocks(user_id, unlocked_at DESC);

CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_media_assets_updated  BEFORE UPDATE ON media_assets  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
