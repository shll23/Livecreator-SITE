-- ============================================================================
-- 011_user_activity.up.sql
--
-- Activity-Tracking fuer User (besonders Creator):
-- - user_activity_log: Login-Sessions + Heartbeats fuer Online-Zeit
-- - messages.response_time_seconds: Antwortzeit pro Creator-Nachricht
-- ============================================================================

-- Heartbeat- und Session-Log
CREATE TABLE user_activity_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Eine "Aktivitaets-Session" wird beim ersten Heartbeat erzeugt
    -- und bei jedem weiteren Heartbeat verlaengert (last_heartbeat_at).
    -- Wenn > 5 Min Pause -> neue Session.
    session_start   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Berechnete Dauer in Sekunden (last_heartbeat - session_start)
    duration_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_activity_user_time ON user_activity_log (user_id, session_start DESC);
CREATE INDEX idx_activity_recent ON user_activity_log (last_heartbeat_at DESC);

-- Antwortzeit-Spalte in messages (nur fuer Creator-Antworten gesetzt)
ALTER TABLE messages ADD COLUMN response_time_seconds INTEGER;
COMMENT ON COLUMN messages.response_time_seconds IS
    'Sekunden zwischen letzter Customer-Message und dieser Creator-Antwort. NULL wenn Customer-Message oder keine vorherige Customer-Message.';

CREATE INDEX idx_messages_response_time ON messages (sender_id, response_time_seconds)
    WHERE response_time_seconds IS NOT NULL;
