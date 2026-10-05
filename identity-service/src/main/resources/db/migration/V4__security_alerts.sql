-- Canh bao tan cong va dia chi IP admin da chan.

CREATE TABLE security_alert (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    kind        VARCHAR(40)  NOT NULL,
    source_ip   VARCHAR(64)  NULL,
    username    VARCHAR(60)  NULL,
    message     VARCHAR(500) NOT NULL,
    status      VARCHAR(20)  NOT NULL,
    created_at  DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    KEY idx_security_alert_created (created_at),
    KEY idx_security_alert_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE blocked_ip (
    ip          VARCHAR(64)  NOT NULL,
    reason      VARCHAR(255) NOT NULL,
    created_at  DATETIME(6)  NOT NULL,
    PRIMARY KEY (ip)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
