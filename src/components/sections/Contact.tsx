"use client";

import { useState, useEffect, useTransition } from "react";
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
  Sparkles,
} from "lucide-react";
import { Reveal, SplitHeading } from "@/components/motion/primitives";
import { MagneticLink } from "@/components/motion/magnetic-link";
import { Link } from "@/lib/navigation";
import { submitBookingAction } from "@/lib/booking.actions";
import { HOTEL, telHref, waHref, directionsHref, mapEmbedSrc } from "@/lib/site";
import { useTranslations, useLocale } from "next-intl";

import type { BackendRoomType } from "@/components/sections/Accommodations";

interface ContactProps {
  selectedRoom?: string;
  selectedRoomId?: string;
  initialRoomTypes?: BackendRoomType[];
  hotelSettings?: {
    phone?: string | null;
    phone_alt?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    check_in_time?: string | null;
    check_out_time?: string | null;
    address?: string | null;
  } | null;
}

export function Contact({
  selectedRoom,
  selectedRoomId,
  initialRoomTypes,
  hotelSettings,
}: ContactProps) {
  const t = useTranslations("contact");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isMr = locale === "mr";

  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    success: boolean;
    message: string;
    bookingRef?: string;
  } | null>(null);

  const roomOptions =
    initialRoomTypes && initialRoomTypes.length > 0
      ? initialRoomTypes.map((rt) => {
          const roomTitle = isMr ? (rt.name.mr || rt.name.en) : rt.name.en;
          const isDorm =
            rt.max_guests > 5 ||
            (rt.name.en || "").toLowerCase().includes("dormitory");
          const perText = isDorm
            ? (isMr ? "ग्रुप / रात्र" : "group / night")
            : (isMr ? "रात्र" : "night");
          return {
            id: rt.id,
            title: roomTitle,
            rate: rt.base_rate,
            isDorm,
            label: `${roomTitle} (₹${Number(rt.base_rate).toLocaleString("en-IN")} / ${perText})`,
          };
        })
      : [
          {
            id: "10000000-0000-0000-0000-000000000002",
            title: isMr ? "डिलक्स AC रूम" : "Deluxe AC Rooms",
            rate: 1500,
            isDorm: false,
            label: `${isMr ? "डिलक्स AC रूम" : "Deluxe AC Rooms"} (₹1,500 / ${isMr ? "रात्र" : "night"})`,
          },
          {
            id: "10000000-0000-0000-0000-000000000001",
            title: isMr ? "नॉन-AC रूम" : "Comfortable Non-AC Rooms",
            rate: 800,
            isDorm: false,
            label: `${isMr ? "नॉन-AC रूम" : "Comfortable Non-AC Rooms"} (₹800 / ${isMr ? "रात्र" : "night"})`,
          },
          {
            id: "10000000-0000-0000-0000-000000000003",
            title: isMr ? "मोठा ग्रुप हॉल" : "Pilgrim Group Dormitory",
            rate: 2200,
            isDorm: true,
            label: `${isMr ? "मोठा ग्रुप हॉल" : "Pilgrim Group Dormitory"} (₹2,200 / ${isMr ? "रात्र" : "night"})`,
          },
        ];

  const [checkIn, setCheckIn] = useState<string>(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  );
  const [checkOut, setCheckOut] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  });

  const [selectedId, setSelectedId] = useState<string>(() => {
    if (selectedRoomId) return selectedRoomId;
    if (selectedRoom) {
      const match = roomOptions.find(
        (o) =>
          o.title.toLowerCase().includes(selectedRoom.toLowerCase()) ||
          selectedRoom.toLowerCase().includes(o.title.toLowerCase())
      );
      if (match) return match.id;
    }
    return roomOptions[0]?.id || "10000000-0000-0000-0000-000000000002";
  });

  const [guestCount, setGuestCount] = useState<number>(2);
  const [availability, setAvailability] = useState<{
    loading: boolean;
    rooms?: Array<{
      id: string;
      name: { en: string; mr?: string };
      available_count: number;
      pricing: {
        base_rate: number;
        nights: number;
        subtotal: number;
        has_override?: boolean;
        breakdown?: Array<{ date: string; rate: number }>;
      };
    }>;
  }>({ loading: false });

  useEffect(() => {
    if (selectedRoomId) {
      setSelectedId(selectedRoomId);
    } else if (selectedRoom) {
      const match = roomOptions.find(
        (o) =>
          o.title.toLowerCase().includes(selectedRoom.toLowerCase()) ||
          selectedRoom.toLowerCase().includes(o.title.toLowerCase())
      );
      if (match) setSelectedId(match.id);
    }
  }, [selectedRoomId, selectedRoom, roomOptions]);

  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    let active = true;
    setAvailability((prev) => ({ ...prev, loading: true }));
    fetch(`/api/availability?check_in=${checkIn}&check_out=${checkOut}&guests=${guestCount}`)
      .then((res) => res.json())
      .then((json) => {
        if (active && json?.data?.room_types) {
          setAvailability({ loading: false, rooms: json.data.room_types });
        }
      })
      .catch(() => {
        if (active) setAvailability({ loading: false });
      });
    return () => {
      active = false;
    };
  }, [checkIn, checkOut, guestCount]);

  const currentRoomData =
    availability.rooms?.find((r) => r.id === selectedId) ||
    availability.rooms?.find((r) => {
      const activeOpt = roomOptions.find((o) => o.id === selectedId);
      return (
        activeOpt &&
        r.name.en.toLowerCase() === activeOpt.title.toLowerCase()
      );
    });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formElement = event.currentTarget;

    const activeOpt = roomOptions.find((o) => o.id === selectedId);

    const payload = {
      guestName: String(formData.get("guestName") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      checkIn: String(formData.get("checkIn") || ""),
      checkOut: String(formData.get("checkOut") || ""),
      guests: Number(formData.get("guestCount")) || 2,
      roomTypeId: selectedId,
      stayType: activeOpt?.title || "AC room",
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
              {t("eyebrow")}
            </p>
          </Reveal>
          <SplitHeading
            text={t("title")}
            className="mt-4 font-display text-[clamp(2rem,4.2vw,3.15rem)] font-light leading-[1.08] text-foreground"
          />
          <Reveal delay={0.1}>
            <p className="mt-4 text-base text-muted-foreground">
              {t("subtitle")}
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          {/* Booking form */}
          <div id="book" className="scroll-mt-24">
            <Reveal className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-lg">
              <h3 className="font-display text-2xl font-normal text-foreground">
                {t("formTitle")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("formDesc")}
              </p>

              {/* Instant Online Booking Prompt */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-semibold text-foreground">
                    {t("instantOnlineBookingPrompt")}
                  </span>
                </div>
                <Link
                  href="/book"
                  className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:underline shrink-0"
                >
                  <span>{t("bookOnlineLink")}</span>
                </Link>
              </div>

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
                      {t("fullName")} *
                    </label>
                    <input
                      id="guestName"
                      name="guestName"
                      type="text"
                      required
                      placeholder={isMr ? "उदा. रमेश पाटील" : "e.g. Ramesh Patil"}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground focus:outline-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {t("mobileNumber")} *
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      placeholder={isMr ? "१० अंकी मोबाईल नंबर" : "10-digit mobile number"}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground focus:outline-primary"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="checkIn" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {t("checkInDate")} *
                    </label>
                    <input
                      id="checkIn"
                      name="checkIn"
                      type="date"
                      required
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground focus:outline-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="checkOut" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {t("checkOutDate")} *
                    </label>
                    <input
                      id="checkOut"
                      name="checkOut"
                      type="date"
                      required
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground focus:outline-primary"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="roomType" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {t("roomType")} *
                    </label>
                    <select
                      id="roomType"
                      name="roomType"
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground focus:outline-primary"
                    >
                      {roomOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="guestCount" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {t("numGuests")} *
                    </label>
                    <input
                      id="guestCount"
                      name="guestCount"
                      type="number"
                      min="1"
                      max="100"
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value) || 1)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground focus:outline-primary"
                    />
                  </div>
                </div>

                {/* Live Database Sync — Availability & Rate Calculation */}
                {currentRoomData && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {currentRoomData.available_count > 0 ? (
                          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="size-4 shrink-0" />
                            {currentRoomData.available_count}{" "}
                            {isMr
                              ? "खोल्या उपलब्ध आहेत"
                              : `${currentRoomData.available_count === 1 ? "room" : "rooms"} available for these dates`}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                            <AlertCircle className="size-4 shrink-0" />
                            {isMr
                              ? "ऑनलाइन आरक्षण पूर्ण भरले. मदतीसाठी रिसेप्शनला कॉल करा."
                              : "Fully booked online. Front desk may assist with manual allotment."}
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground font-mono font-medium">
                        {currentRoomData.pricing.nights}{" "}
                        {isMr
                          ? "रात्री"
                          : currentRoomData.pricing.nights === 1
                          ? "night"
                          : "nights"}
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between border-t border-primary/10 pt-2.5">
                      <span className="text-muted-foreground text-xs">
                        {isMr ? "अंदाजे एकूण रक्कम:" : "Estimated Stay Total:"}
                      </span>
                      <span className="font-display text-lg font-bold text-foreground">
                        ₹{currentRoomData.pricing.subtotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="notes" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {t("specialMessage")}
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    placeholder={
                      isMr
                        ? "उदा. पोहोचण्याची वेळ, ज्येष्ठ नागरिकांसाठी तळमजला..."
                        : "Expected arrival time, senior citizen assistance, extra beds..."
                    }
                    className="w-full rounded-xl border border-input bg-background p-3 text-base sm:text-sm text-foreground focus:outline-primary resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-md transition hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  <CalendarDays className="size-4" />
                  <span>{isPending ? t("sending") : t("submitInquiry")}</span>
                </button>
              </form>
            </Reveal>
          </div>

          {/* Direct contact details */}
          <Reveal delay={0.1} className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm">
            <div>
              <h3 className="font-display text-2xl font-normal text-foreground">
                {t("locationAddress")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {isMr ? "मंदिराच्या अगदी जवळ. कधीही कॉल किंवा मेसेज करा." : "We are right by the temple. Call or message us 24/7."}
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Phone className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t("directHelpline")}
                    </p>
                    <div className="mt-1 flex flex-col gap-1">
                      {Array.from(
                        new Set(
                          (hotelSettings?.phone
                            ? [hotelSettings.phone, hotelSettings.phone_alt].filter(Boolean)
                            : HOTEL.phones) as string[]
                        )
                      ).map((phone, idx) => {
                        const digits = phone.replace(/\D/g, "");
                        const displayPhone =
                          digits.length === 10
                            ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
                            : phone.startsWith("+")
                              ? phone
                              : `+91 ${phone}`;

                        return (
                          <a
                            key={`${phone}-${idx}`}
                            href={telHref(phone)}
                            className="font-sans text-lg sm:text-xl font-bold tracking-tight tabular-nums text-foreground hover:text-primary transition"
                          >
                            {displayPhone}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {isMr ? "पत्ता (मंदिरापासून २०० मीटर)" : "Address (200m from Temple)"}
                    </p>
                    <address className="not-italic mt-1 text-sm text-foreground leading-relaxed">
                      {isMr
                        ? "श्री बाळूमामा मंदिर गेटजवळ, आदमापूर, ता. भुदरगड, जि. कोल्हापूर, महाराष्ट्र ४१६२०८"
                        : (hotelSettings?.address || `${HOTEL.address.street}, ${HOTEL.address.village}, Tal. ${HOTEL.address.taluka}, Dist. ${HOTEL.address.district}, ${HOTEL.address.state} - ${HOTEL.address.postalCode}`)}
                    </address>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border pt-6">
                  <div className="flex items-center gap-3">
                    <LogIn className="size-5 text-primary shrink-0" />
                    <div>
                      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                        {isMr ? "चेक-इन" : "Check-in"}
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {hotelSettings?.check_in_time ? hotelSettings.check_in_time.slice(0, 5) : HOTEL.checkIn}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="size-5 text-primary shrink-0" />
                    <div>
                      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                        {isMr ? "चेक-आउट" : "Check-out"}
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {hotelSettings?.check_out_time ? hotelSettings.check_out_time.slice(0, 5) : HOTEL.checkOut}
                      </p>
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
                <span>{tCommon("whatsappUs")}</span>
              </MagneticLink>

              <MagneticLink href={directionsHref} variant="outline" external>
                <Navigation className="size-4" />
                <span>{t("getDirections")}</span>
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
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-[22rem] sm:h-[28rem] w-full border-0"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-background to-transparent" />
      </div>
    </section>
  );
}
