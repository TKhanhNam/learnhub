ALTER TABLE help_article
    ADD COLUMN audience VARCHAR(20) NOT NULL DEFAULT 'all' AFTER locale;
