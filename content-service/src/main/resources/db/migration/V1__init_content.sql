-- content curriculum: lecture, quiz, assignment (link), resource
CREATE TABLE lecture (
    id BIGINT NOT NULL AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    type VARCHAR(20) NOT NULL,
    video_url VARCHAR(500) NULL,
    body_html TEXT NULL,
    duration_seconds INT NOT NULL DEFAULT 0,
    download_url VARCHAR(500) NULL,
    PRIMARY KEY (id),
    KEY idx_lecture_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quiz (
    id BIGINT NOT NULL AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    kind VARCHAR(20) NOT NULL DEFAULT 'QUIZ',
    pass_score INT NOT NULL DEFAULT 70,
    PRIMARY KEY (id),
    KEY idx_quiz_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quiz_question (
    id BIGINT NOT NULL AUTO_INCREMENT,
    quiz_id BIGINT NOT NULL,
    prompt TEXT NOT NULL,
    option_a VARCHAR(300) NOT NULL,
    option_b VARCHAR(300) NOT NULL,
    option_c VARCHAR(300) NULL,
    option_d VARCHAR(300) NULL,
    correct_option VARCHAR(1) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_question_quiz (quiz_id),
    CONSTRAINT fk_question_quiz FOREIGN KEY (quiz_id) REFERENCES quiz (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assignment (
    id BIGINT NOT NULL AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    instruction TEXT NULL,
    PRIMARY KEY (id),
    KEY idx_assignment_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
