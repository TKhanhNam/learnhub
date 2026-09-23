CREATE TABLE organization (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(160) NOT NULL,
    plan VARCHAR(40) NOT NULL,
    seat_limit INT NOT NULL,
    owner_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE org_member (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_org_user (org_id, user_id),
    CONSTRAINT fk_member_org FOREIGN KEY (org_id) REFERENCES organization (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE learning_path (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    course_ids VARCHAR(500) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_path_org FOREIGN KEY (org_id) REFERENCES organization (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE demo_request (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company VARCHAR(160) NOT NULL,
    contact_email VARCHAR(160) NOT NULL,
    message VARCHAR(1000) NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
