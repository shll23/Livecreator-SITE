-- Tokens für Email-Verifizierung
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token       text PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  timestamptz NOT NULL,
    used_at     timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evt_user ON email_verification_tokens(user_id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS signup_bonus_granted boolean NOT NULL DEFAULT false;
