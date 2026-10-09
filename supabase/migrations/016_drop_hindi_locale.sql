-- 016_drop_hindi_locale.sql
-- Drop Hindi as a supported language — keep only English + Marathi.
-- Restrict guests.preferred_language to ('en','mr'). Safe: no 'hi' rows exist.
alter table guests drop constraint if exists guests_preferred_language_check;
alter table guests add constraint guests_preferred_language_check
  check (preferred_language in ('en','mr'));
