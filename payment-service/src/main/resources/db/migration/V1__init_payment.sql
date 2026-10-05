CREATE TABLE payment_transaction (
    id BIGINT NOT NULL AUTO_INCREMENT,
    commerce_order_id BIGINT NOT NULL,
    gateway VARCHAR(20) NOT NULL,
    gateway_order_id VARCHAR(80) NULL,
    amount BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    result_code INT NULL,
    message VARCHAR(255) NULL,
    trans_id VARCHAR(64) NULL,
    created_at DATETIME(6) NOT NULL,
    paid_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    KEY idx_payment_order (commerce_order_id),
    KEY idx_payment_gateway_order (gateway_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
