SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'review' AND COLUMN_NAME = 'instructor_reply'
);
SET @sql := IF(@col = 0, 'ALTER TABLE review ADD COLUMN instructor_reply VARCHAR(1000) NULL AFTER comment', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
