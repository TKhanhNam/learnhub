CREATE TABLE cart_item (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cart_user_course (user_id, course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
    id BIGINT NOT NULL AUTO_INCREMENT,
    buyer_id BIGINT NOT NULL,
    recipient_id BIGINT NULL,
    recipient_email VARCHAR(160) NULL,
    status VARCHAR(20) NOT NULL,
    coupon_code VARCHAR(40) NULL,
    coupon_id BIGINT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    platform_fee DECIMAL(12,2) NOT NULL,
    instructor_earn DECIMAL(12,2) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_order_buyer (buyer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_item (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    instructor_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    ai_assist TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_item_order (order_id),
    CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE outbox_event (
    id BIGINT NOT NULL AUTO_INCREMENT,
    event_type VARCHAR(60) NOT NULL,
    payload TEXT NOT NULL,
    published TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
