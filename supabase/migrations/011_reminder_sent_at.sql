-- (Renumbered 005 -> 011 to resolve a duplicate-005 prefix and give the
--  migration set a strict linear apply order. A standalone column add; nothing
--  depends on its position, so the move is order-safe.)
--
-- Phase 6 follow-up: make the daily pre-arrival reminder idempotent.
-- The cron route filters on `reminder_sent_at is null` and stamps it after a
-- successful send, so a cron-job.org retry (or a second run the same day) can't
-- email the same guest twice.

alter table bookings add column if not exists reminder_sent_at timestamptz;
