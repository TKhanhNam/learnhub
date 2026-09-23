-- path: identity-service/src/main/resources/db/migration/V1__init_identity.sql
-- purpose: schema cua identity_db. Quan ly bang Flyway, khong sua tay tren DB.

CREATE TABLE app_user (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    username      VARCHAR(60)  NOT NULL,
    email         VARCHAR(160) NOT NULL,
    full_name     VARCHAR(160) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL,
    locked        TINYINT(1)   NOT NULL DEFAULT 0,
    headline      VARCHAR(200) NULL,
    bio           TEXT         NULL,
    avatar_url    VARCHAR(400) NULL,
    language      VARCHAR(5)   NOT NULL DEFAULT 'vi',
    created_at    DATETIME(6)  NOT NULL,
    updated_at    DATETIME(6)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_app_user_username (username),
    UNIQUE KEY uk_app_user_email (email),
    KEY idx_app_user_role (role)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Refresh token luu ban BAM (khong luu ban goc) de co the thu hoi khi logout/doi mat khau
CREATE TABLE refresh_token (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    jti        VARCHAR(64) NOT NULL,
    user_id    BIGINT      NOT NULL,
    token_hash VARCHAR(90) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    revoked    TINYINT(1)  NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_refresh_jti (jti),
    KEY idx_refresh_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
