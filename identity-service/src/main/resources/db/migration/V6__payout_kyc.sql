CREATE TABLE payout_kyc (
    user_id BIGINT NOT NULL PRIMARY KEY,
    legal_name VARCHAR(160) NOT NULL,
    id_number VARCHAR(32) NOT NULL,
    bank VARCHAR(80) NOT NULL,
    account_number VARCHAR(40) NOT NULL,
    account_name VARCHAR(160) NOT NULL,
    status VARCHAR(20) NOT NULL,
    submitted_at DATETIME(6) NOT NULL,
    reviewed_at DATETIME(6) NULL
);
