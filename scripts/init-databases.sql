-- path: scripts/init-databases.sql
-- purpose: tao 8 database rieng biet - moi service 1 DB (Database per Service).
-- Chay tu dong khi dung Docker Compose. Neu dung XAMPP thi mo phpMyAdmin va chay file nay 1 lan.

CREATE DATABASE IF NOT EXISTS identity_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS catalog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS content_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS commerce_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS learning_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS social_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS org_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS assist_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
