-- Email verification columns for users table
-- Run manually if not using programmatic sync via userModel.js

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS verification_token_expiry DATETIME NULL,
  ADD COLUMN IF NOT EXISTS verified_at DATETIME NULL;

-- Existing accounts created before verification rollout should remain able to log in
UPDATE users
SET is_verified = TRUE,
    verified_at = COALESCE(verified_at, NOW())
WHERE verification_token IS NULL
  AND is_verified = FALSE
  AND (auth_provider = 'google' OR created_at < NOW());
