"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  LogIn,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
} from "lucide-react";
import { Reveal, SplitHeading } from "@/components/motion/primitives";
import { MagneticLink } from "@/components/motion/magnetic-link";
import { submitBookingAction } from "@/lib/booking.actions";
import { HOTEL, telHref, waHref, directionsHref, mapEmbedSrc } from "@/lib/site";

interface ContactProps {
  selectedRoom?: string;
}

export function Contact({ selectedRoom }: ContactProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    success: boolean;
    message: string;
    bookingRef?: string;
  } | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formElement = event.currentTarget;

    const rawRoom = String(formData.get("roomType") || "AC room");
    let stayType: "AC room" | "Non-AC room" | "Non-AC dormitory" | "Mini hall" = "AC room";
    if (rawRoom.includes("Non-AC") && rawRoom.includes("dormitory")) {
      stayType = "Non-AC dormitory";
    } else if (rawRoom.includes("Non-AC")) {
      stayType = "Non-AC room";
    }

    const payload = {
      guestName: String(formData.get("guestName") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      checkIn: String(formData.get("checkIn") || ""),
      checkOut: String(formData.get("checkOut") || ""),
      guests: Number(formData.get("guestCount")) || 2,
      stayType,
      note: String(formData.get("notes") || "").trim() || undefined,
      website: String(formData.get("website") || "") || undefined,
    };

    startTransition(async () => {
      try {
        const result = await submitBookingAction(payload);
        if (result.success) {
          setStatus({
            success: true,
            message: "Thank you! Your booking inquiry has been recorded. Our front desk will call you shortly to confirm your room.",
            bookingRef: result.reference,
          });
          formElement.reset();
        } else {
          setStatus({
            success: false,
            message: result.error,
          });
        }
      } catch (err: unknown) {
        setStatus({
          success: false,
          message:
            err instanceof Error
              ? err.message
              : "A network error occurred. Please contact the front desk directly.",
        });
      }
    });
  };

  return (
    <section id="contact" className="relative overflow-hidden bg-background pt-20 sm:pt-28 lg:pt-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <Reveal>
            <p className="eyebrow text-primary">
              <span className="eyebrow-line" />
              Reservations & Location
            </p>
          </Reveal>
          <SplitHeading
            text="Plan your stay in Admapur."
            className="mt-4 font-display text-[clamp(2rem,4.2vw,3.15rem)] font-light leading-[1.08] text-foreground"
          />
          <Reveal delay={0.1}>
            <p className="mt-4 text-base text-muted-foreground">
              Submit your dates for an online inquiry or reach our front desk directly on WhatsApp and phone for immediate room allotment.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          {/* Booking form */}
          <div id="book" className="scroll-mt-24">
            <Reveal className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-lg">
              <h3 className="font-display text-2xl font-normal text-foreground">
                Book Your Pilgrimage Stay
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                No advance credit card required. Our front desk will confirm your room instantly.
              </p>

              {status && (
                <div
                  className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
                    status.success
                      ? "border-emerald-600/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "border-red-600/30 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200"
                  }`}
                >
                  {status.success ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="size-5 shrink-0 text-red-600" />
                  )}
                  <div>
                    <p className="font-semibold">{status.message}</p>
                    {status.bookingRef && (
                      <p className="mt-1 text-xs font-mono">
                        Reservation Ref: <strong>{status.bookingRef}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {/* Bot Honeypot */}
                <input
                  type="text"
                  name="website"
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="guestName" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Your Name *
                    </label>
                    <input
                      id="guestName"
                      name="guestName"
                      type="text"
                      required
                      placeholder="Full Name"
                      className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground focus:outline-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Mobile Phone *
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground focus:outline-primary"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="checkIn" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Check-in Date *
                    </label>
                    <input
                      id="checkIn"
                      name="checkIn"
                      type="date"
                      required
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground focus:outline-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="checkOut" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Check-out Date *
                    </label>
                    <input
                      id="checkOut"
                      name="checkOut"
                      type="date"
                      required
                      defaultValue={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground focus:outline-primary"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="roomType" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Room Choice *
                    </label>
                    <select
                      id="roomType"
                      name="roomType"
                      defaultValue={selectedRoom || "Deluxe AC Rooms"}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground focus:outline-primary"
                    >
                      <option value="Deluxe AC Rooms">Deluxe AC Rooms (₹1,500)</option>
                      <option value="Comfort Non-AC Rooms">Comfort Non-AC Rooms (₹1,000)</option>
                      <option value="Spacious Group Dormitory">Group Dormitory (50+ Capacity)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="guestCount" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Number of Guests *
                    </label>
                    <input
                      id="guestCount"
                      name="guestCount"
                      type="number"
                      min="1"
                      max="100"
                      defaultValue="2"
                      className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground focus:outline-primary"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Special Notes / Arrival Time (Optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    placeholder="Expected arrival time, senior citizen assistance, extra beds..."
                    className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground focus:outline-primary resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-md transition hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  <CalendarDays className="size-4" />
                  <span>{isPending ? "Submitting Inquiry..." : "Confirm Booking Request"}</span>
                </button>
              </form>
            </Reveal>
          </div>

          {/* Direct contact details */}
          <Reveal delay={0.1} className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm">
            <div>
              <h3 className="font-display text-2xl font-normal text-foreground">
                Front Desk & Location
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                We are right by the temple. Call or message us 24/7.
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Phone className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Booking Helpline
                    </p>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {HOTEL.phones.map((phone) => (
                        <a
                          key={phone}
                          href={telHref(phone)}
                          className="font-display text-xl font-semibold text-foreground hover:text-primary transition"
                        >
                          +91 {phone}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Address (200m from Temple)
                    </p>
                    <p className="mt-1 text-sm text-foreground leading-relaxed">
                      {HOTEL.address.street}, {HOTEL.address.village}, Tal. {HOTEL.address.taluka}, Dist. {HOTEL.address.district}, {HOTEL.address.state} - {HOTEL.address.postalCode}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border pt-6">
                  <div className="flex items-center gap-3">
                    <LogIn className="size-5 text-primary shrink-0" />
                    <div>
                      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                        Check-in
                      </p>
                      <p className="text-sm font-semibold text-foreground">{HOTEL.checkIn}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="size-5 text-primary shrink-0" />
                    <div>
                      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                        Check-out
                      </p>
                      <p className="text-sm font-semibold text-foreground">{HOTEL.checkOut}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <MagneticLink
                href={waHref("Namaskar, I want to book a room at Hotel Morya Lodging Admapur.")}
                variant="whatsapp"
                external
              >
                <MessageSquare className="size-4" />
                <span>Message on WhatsApp</span>
              </MagneticLink>

              <MagneticLink href={directionsHref} variant="outline" external>
                <Navigation className="size-4" />
                <span>Get Directions</span>
              </MagneticLink>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Embedded Google Map */}
      <div className="mt-16 w-full relative">
        <iframe
          title="Hotel Morya Lodging Location Map Admapur"
          src={mapEmbedSrc}
          loading="lazy"
          className="h-[22rem] sm:h-[28rem] w-full border-0"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-background to-transparent" />
      </div>
    </section>
  );
}
