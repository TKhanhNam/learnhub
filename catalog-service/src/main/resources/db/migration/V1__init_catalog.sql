-- path: catalog-service/src/main/resources/db/migration/V1__init_catalog.sql
-- purpose: schema catalog_db - danh muc, khoa hoc, coupon.
-- Index dat dung cho cac truong hay loc/sap xep (file cong nghe loi muc 4).

CREATE TABLE category (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(120) NOT NULL,
    slug        VARCHAR(140) NOT NULL,
    description VARCHAR(400) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_category_slug (slug)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE course (
    id                 BIGINT         NOT NULL AUTO_INCREMENT,
    title              VARCHAR(200)   NOT NULL,
    slug               VARCHAR(220)   NOT NULL,
    subtitle           VARCHAR(300)   NULL,
    description        TEXT           NULL,
    category_id        BIGINT         NOT NULL,
    instructor_id      BIGINT         NOT NULL,
    price              DECIMAL(12, 2) NOT NULL DEFAULT 0,
    level              VARCHAR(20)    NOT NULL DEFAULT 'BEGINNER',
    language           VARCHAR(5)     NOT NULL DEFAULT 'vi',
    thumbnail_url      VARCHAR(400)   NULL,
    promo_video_url    VARCHAR(400)   NULL,
    skills             VARCHAR(400)   NULL,
    status             VARCHAR(20)    NOT NULL DEFAULT 'DRAFT',
    ai_assist_enabled  TINYINT(1)     NOT NULL DEFAULT 0,
    rating_avg         DECIMAL(3, 2)  NOT NULL DEFAULT 0,
    rating_count       INT            NOT NULL DEFAULT 0,
    enrollment_count   INT            NOT NULL DEFAULT 0,
    created_at         DATETIME(6)    NOT NULL,
    updated_at         DATETIME(6)    NULL,
    published_at       DATETIME(6)    NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_course_slug (slug),
    KEY idx_course_category (category_id),
    KEY idx_course_instructor (instructor_id),
    KEY idx_course_status (status),
    KEY idx_course_title (title),
    CONSTRAINT fk_course_category FOREIGN KEY (category_id) REFERENCES category (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Coupon: giang vien tao cho khoa cua minh, admin tao cho toan san
CREATE TABLE coupon (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    code             VARCHAR(40)  NOT NULL,
    course_id        BIGINT       NULL,
    owner_type       VARCHAR(20)  NOT NULL,
    owner_id         BIGINT       NULL,
    discount_percent INT          NOT NULL,
    max_uses         INT          NOT NULL DEFAULT 100,
    used_count       INT          NOT NULL DEFAULT 0,
    valid_from       DATETIME(6)  NOT NULL,
    valid_to         DATETIME(6)  NOT NULL,
    active           TINYINT(1)   NOT NULL DEFAULT 1,
    created_at       DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_coupon_code (code),
    KEY idx_coupon_course (course_id),
    KEY idx_coupon_owner (owner_type, owner_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
