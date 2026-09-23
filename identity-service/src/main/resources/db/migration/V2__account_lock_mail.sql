-- Khoa tai khoan: luu ly do, nguoi khoa, thoi diem; hop thu email da gui.

ALTER TABLE app_user
    ADD COLUMN lock_reason VARCHAR(1000) NULL,
    ADD COLUMN locked_at DATETIME(6) NULL,
    ADD COLUMN locked_by BIGINT NULL,
    ADD COLUMN unlocked_at DATETIME(6) NULL;

CREATE TABLE email_outbox (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    recipient        VARCHAR(160)  NOT NULL,
    subject          VARCHAR(240)  NOT NULL,
    body             TEXT          NOT NULL,
    status           VARCHAR(20)   NOT NULL,
    error_message    VARCHAR(500)  NULL,
    related_user_id  BIGINT        NULL,
    created_at       DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    KEY idx_email_outbox_user (related_user_id),
    KEY idx_email_outbox_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
