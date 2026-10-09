-- Critical: payments_razorpay_unique was UNIQUE (razorpay_payment_id) NULLS NOT
-- DISTINCT, which treats every NULL as equal — so only ONE manual payment
-- (cash/UPI/pay-at-hotel, where razorpay_payment_id IS NULL) could exist across
-- the whole table. The second manual payment anywhere failed with
-- "duplicate key value violates unique constraint payments_razorpay_unique".
--
-- The constraint's only job (§30) is to dedupe Razorpay webhook retries, which
-- always carry a non-null razorpay_payment_id. Make it a PARTIAL unique index so
-- it applies only to real Razorpay rows and ignores manual (NULL) payments.
-- It's a table constraint (not a bare index), so drop the constraint.
alter table public.payments drop constraint if exists payments_razorpay_unique;

create unique index payments_razorpay_unique
  on public.payments (razorpay_payment_id)
  where razorpay_payment_id is not null;
