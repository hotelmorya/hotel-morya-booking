-- Add the hotel's UPI VPA (e.g. hotelgokul@okaxis) to settings.
-- Powers the public booking flow's mobile "Pay with UPI app" deep link
-- (upi://pay?pa=<upi_id>&...), which opens the guest's UPI app directly — a QR
-- image alone can't be scanned on the same device the guest is booking from.
-- Nullable: hotels that only use the QR image (desktop) leave it empty.

alter table hotel_settings add column if not exists upi_id text;
