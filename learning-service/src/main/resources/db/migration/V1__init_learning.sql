-- path: learning-service/src/main/resources/db/migration/V1__init_learning.sql
-- purpose: schema learning_db - quyen so huu khoa hoc, tien do, ghi chu, quiz, bai tap, chung chi.

-- So huu TRON DOI: khong co truong ngay het han (khac han "dang ky hoc phan" theo ky cua lab CRS)
CREATE TABLE enrollment (
    id               BIGINT      NOT NULL AUTO_INCREMENT,
    user_id          BIGINT      NOT NULL,
    course_id        BIGINT      NOT NULL,
    source           VARCHAR(20) NOT NULL DEFAULT 'PURCHASE',
    order_id         BIGINT      NULL,
    progress_percent INT         NOT NULL DEFAULT 0,
    total_lectures   INT         NOT NULL DEFAULT 0,
    granted_at       DATETIME(6) NOT NULL,
    completed_at     DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_enrollment_user_course (user_id, course_id),
    KEY idx_enrollment_user (user_id),
    KEY idx_enrollment_course (course_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE lesson_progress (
    id              BIGINT      NOT NULL AUTO_INCREMENT,
    enrollment_id   BIGINT      NOT NULL,
    lecture_id      BIGINT      NOT NULL,
    completed       TINYINT(1)  NOT NULL DEFAULT 0,
    seconds_watched INT         NOT NULL DEFAULT 0,
    updated_at      DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_progress_enrollment_lecture (enrollment_id, lecture_id),
    CONSTRAINT fk_progress_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollment (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE learner_note (
    id                BIGINT      NOT NULL AUTO_INCREMENT,
    enrollment_id     BIGINT      NOT NULL,
    lecture_id        BIGINT      NOT NULL,
    timestamp_seconds INT         NOT NULL DEFAULT 0,
    content           TEXT        NOT NULL,
    created_at        DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_note_enrollment (enrollment_id),
    CONSTRAINT fk_note_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollment (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE quiz_attempt (
    id            BIGINT      NOT NULL AUTO_INCREMENT,
    enrollment_id BIGINT      NOT NULL,
    quiz_id       BIGINT      NOT NULL,
    score         INT         NOT NULL,
    total         INT         NOT NULL,
    passed        TINYINT(1)  NOT NULL DEFAULT 0,
    created_at    DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_attempt_enrollment (enrollment_id),
    KEY idx_attempt_quiz (quiz_id),
    CONSTRAINT fk_attempt_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollment (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Bai tap: hoc vien nop LINK (theo dung yeu cau de bai), giang vien cham diem
CREATE TABLE assignment_submission (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    enrollment_id BIGINT       NOT NULL,
    assignment_id BIGINT       NOT NULL,
    course_id     BIGINT       NOT NULL,
    link_url      VARCHAR(500) NOT NULL,
    note          VARCHAR(500) NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'SUBMITTED',
    score         INT          NULL,
    feedback      VARCHAR(500) NULL,
    created_at    DATETIME(6)  NOT NULL,
    graded_at     DATETIME(6)  NULL,
    PRIMARY KEY (id),
    KEY idx_submission_enrollment (enrollment_id),
    KEY idx_submission_course (course_id),
    CONSTRAINT fk_submission_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollment (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE certificate (
    id            BIGINT      NOT NULL AUTO_INCREMENT,
    enrollment_id BIGINT      NOT NULL,
    code          VARCHAR(40) NOT NULL,
    pdf_status    VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    issued_at     DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_certificate_code (code),
    UNIQUE KEY uk_certificate_enrollment (enrollment_id),
    CONSTRAINT fk_certificate_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollment (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
