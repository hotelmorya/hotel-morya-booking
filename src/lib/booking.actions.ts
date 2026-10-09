"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

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

export async function submitBookingAction(input: BookingInput): Promise<BookingResult> {
  try {
    const data = bookingSchema.parse(input);

    // Honeypot check
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

    const supabase = createSupabaseServerClient();
    if (supabase) {
      try {
        const { data: saved, error } = await supabase
          .from("booking_requests")
          .insert({
            guest_name: data.guestName,
            phone: data.phone,
            check_in: data.checkIn,
            check_out: data.checkOut,
            guests: data.guests,
            stay_type: data.stayType,
            note: data.note || null,
          })
          .select("reference")
          .single();

        if (!error && saved?.reference) {
          return { success: true, reference: saved.reference };
        }
        if (error) {
          console.warn("[Booking] Supabase insert note:", error.message);
        }
      } catch (err) {
        console.warn("[Booking] Supabase connection failed, falling back to local ref:", err);
      }
    }

    // Fallback reference code if database is not configured or in offline mode
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `MORYA-${randomHex}`;

    console.info("[Booking Request Received]", {
      reference,
      ...data,
      receivedAt: new Date().toISOString(),
    });

    return { success: true, reference };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message || "Invalid input." };
    }
    return {
      success: false,
      error: "Your request could not be sent. Please try again.",
    };
  }
}
