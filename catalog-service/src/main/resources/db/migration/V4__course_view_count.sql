-- Dem luot xem / truy cap khoa hoc de hien "6 khoa hot" tren sidebar.
ALTER TABLE course
    ADD COLUMN view_count INT NOT NULL DEFAULT 0 AFTER enrollment_count;

CREATE INDEX idx_course_view_count ON course (status, view_count);
