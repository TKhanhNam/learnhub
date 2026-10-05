-- Xac thuc email truoc khi thanh toan. Tai khoan da co san duoc coi la da xac thuc.

ALTER TABLE app_user
    ADD COLUMN email_verified_at DATETIME(6) NULL;

UPDATE app_user
SET email_verified_at = created_at
WHERE email_verified_at IS NULL;

CREATE TABLE email_verification (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     BIGINT       NOT NULL,
    token_hash  VARCHAR(64)  NOT NULL,
    expires_at  DATETIME(6)  NOT NULL,
    used_at     DATETIME(6)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_email_verification_token (token_hash),
    KEY idx_email_verification_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
