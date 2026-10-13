-- So dien thoai, dat lai mat khau, va khoa IP co han.

ALTER TABLE app_user
    ADD COLUMN phone VARCHAR(20) NULL;

ALTER TABLE blocked_ip
    ADD COLUMN expires_at DATETIME(6) NULL;

CREATE TABLE password_reset (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     BIGINT       NOT NULL,
    token_hash  VARCHAR(64)  NOT NULL,
    expires_at  DATETIME(6)  NOT NULL,
    used_at     DATETIME(6)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_password_reset_token (token_hash),
    KEY idx_password_reset_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
