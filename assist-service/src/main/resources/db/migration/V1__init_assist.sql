CREATE TABLE help_article (
    id BIGINT NOT NULL AUTO_INCREMENT,
    slug VARCHAR(140) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    locale VARCHAR(10) NOT NULL DEFAULT 'vi',
    PRIMARY KEY (id),
    UNIQUE KEY uk_help_slug_locale (slug, locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assist_chat (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    course_id BIGINT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_chat_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
