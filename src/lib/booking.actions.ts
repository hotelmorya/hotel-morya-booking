"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextBookingRef } from "@/lib/booking-ref";
import { sendEmail } from "@/lib/email/client";
import { quoteStay, type RateOverride } from "@/lib/pricing";

export const bookingSchema = z.object({
  guestName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{10,18}$/, "Please enter a valid phone number"),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-in date"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-out date"),
  guests: z.number().int().min(1, "Minimum 1 guest").max(100, "Maximum 100 guests"),
  stayType: z.enum(["AC room", "Non-AC room", "Non-AC dormitory", "Mini hall"]),
  note: z.string().trim().max(500).optional(),
  website: z.string().max(200).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export type BookingResult =
  | { success: true; reference: string }
  | { success: false; error: string };

const ROOM_TYPE_MAP: Record<string, string> = {
  "Non-AC room": "10000000-0000-0000-0000-000000000001",
  "AC room": "10000000-0000-0000-0000-000000000002",
  "Non-AC dormitory": "10000000-0000-0000-0000-000000000003",
  "Mini hall": "10000000-0000-0000-0000-000000000003",
};

export async function submitBookingAction(input: BookingInput): Promise<BookingResult> {
  try {
    const data = bookingSchema.parse(input);

    // Honeypot bot protection
    if (data.website) {
      return { success: false, error: "Unable to send request. Please try again." };
    }

    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(`${data.checkIn}T00:00:00Z`);
    const end = new Date(`${data.checkOut}T00:00:00Z`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start.toISOString().slice(0, 10) !== data.checkIn ||
      end.toISOString().slice(0, 10) !== data.checkOut ||
      data.checkIn < today ||
      end <= start
    ) {
      return {
        success: false,
        error: "Please choose a future check-in and a later check-out date.",
      };
    }

    const phoneDigits = data.phone.replace(/\D/g, "");
    const cleanPhone = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "";

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return {
        success: false,
        error: "Please enter a valid 10-digit Indian mobile number (starting with 6-9).",
      };
    }

    const admin = createAdminClient();

    // 1. Resolve or create guest
    const { data: existingGuest } = await admin
      .from("guests")
      .select("id")
      .eq("phone", cleanPhone)
      .is("deleted_at", null)
      .maybeSingle();

    let guestId: string;
    if (existingGuest) {
      guestId = existingGuest.id;
      await admin
        .from("guests")
        .update({ fullname: data.guestName })
        .eq("id", guestId);
    } else {
      const { data: newGuest, error: guestErr } = await admin
        .from("guests")
        .insert({
          fullname: data.guestName,
          phone: cleanPhone,
          preferred_language: "mr",
        })
        .select("id")
        .single();

      if (guestErr || !newGuest) {
        throw new Error(guestErr?.message ?? "Failed to save guest record.");
      }
      guestId = newGuest.id;
    }

    // 2. Resolve room type & nightly rate (including seasonal/festival overrides)
    const roomTypeId = ROOM_TYPE_MAP[data.stayType] || "10000000-0000-0000-0000-000000000001";
    const [{ data: rt }, { data: overrides }] = await Promise.all([
      admin
        .from("room_types")
        .select("base_rate")
        .eq("id", roomTypeId)
        .maybeSingle(),
      admin
        .from("rate_overrides")
        .select("start_date, end_date, rate")
        .eq("room_type_id", roomTypeId),
    ]);

    const baseRate = Number(rt?.base_rate ?? 800);
    const quote = quoteStay({
      baseRate,
      overrides: (overrides as RateOverride[]) ?? [],
      checkIn: data.checkIn,
      checkOut: data.checkOut,
    });
    const nights = Math.max(1, quote.nights);
    const totalAmount = quote.subtotal > 0 ? quote.subtotal : baseRate * nights;
    const ratePerNight = Math.round(totalAmount / nights);

    // 3. Atomically allocate race-safe booking reference (BK-YYYY-NNNN)
    const ref = await nextBookingRef(admin);

    // 4. Insert booking
    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .insert({
        guest_id: guestId,
        booking_ref: ref,
        check_in: data.checkIn,
        check_out: data.checkOut,
        total_amount: totalAmount,
        status: "pending",
        source: "website",
        special_requests: data.note || null,
        additional_guests: `Party of ${data.guests} (${data.stayType})`,
      })
      .select("id, booking_ref")
      .single();

    if (bookingErr || !booking) {
      throw new Error(bookingErr?.message ?? "Failed to create booking.");
    }

    // 5. Insert booking room line
    await admin.from("booking_rooms").insert({
      booking_id: booking.id,
      room_type_id: roomTypeId,
      rate_per_night: ratePerNight,
      nights,
    });

    // 6. Send transactional email notification via Resend
    try {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hotelmoryaadmapur@gmail.com";
      await sendEmail({
        to: adminEmail,
        subject: `[New Website Inquiry] ${booking.booking_ref} - ${data.guestName}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #b45309;">New Pilgrimage Booking Request</h2>
            <p>A new reservation inquiry has been received on the Hotel Morya website:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Reference:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #0284c7;">${booking.booking_ref}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Guest:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.guestName} (<a href="tel:+91${cleanPhone}">+91 ${cleanPhone}</a>)</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Stay Window:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.checkIn} to ${data.checkOut} (${nights} night${nights > 1 ? "s" : ""})</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Category:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.stayType} (${data.guests} guests)</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Estimated Total:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">₹${totalAmount.toLocaleString("en-IN")}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Notes / Requests:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.note || "None"}</td></tr>
            </table>
            <p style="margin-top: 20px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/bookings" style="background-color: #b45309; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Open Admin Dashboard
              </a>
            </p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn("[Booking Notification Email Warning]", mailErr);
    }

    return { success: true, reference: booking.booking_ref };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message || "Invalid input." };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Your request could not be sent. Please try again.",
    };
  }
}
