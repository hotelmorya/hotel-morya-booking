"use client";

import React, { useState, type MouseEvent } from "react";
import { Calendar, Users, ArrowRight, Minus, Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { useBookingFlow } from "@/store/booking-flow";
import { currentDateIST } from "@/lib/format";

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function calculateNights(start: string, end: string): number {
  if (!start || !end) return 1;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

export function HeroAvailabilityBar() {
  const t = useTranslations("hero");
  const tb = useTranslations("booking");
  const router = useRouter();
  const setDates = useBookingFlow((s) => s.setDates);

  const today = currentDateIST();
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(addDays(today, 1));
  const [guests, setGuests] = useState(2);

  const nights = calculateNights(checkIn, checkOut);

  function openPicker(e: MouseEvent<HTMLInputElement>) {
    try {
      e.currentTarget.showPicker?.();
    } catch {
      /* showPicker not supported / ignored */
    }
  }

  function handleCheckInChange(val: string) {
    const ci = val || today;
    setCheckIn(ci);
    if (checkOut <= ci) {
      setCheckOut(addDays(ci, 1));
    }
  }

  function handleCheckAvailability() {
    const ci = checkIn || today;
    const co = checkOut > ci ? checkOut : addDays(ci, 1);
    setDates(ci, co, guests);
    router.push("/book?search=1");
  }

  return (
    <div className="w-full max-w-5xl rounded-2xl border border-amber-400/30 bg-zinc-950/85 p-3 sm:p-4 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.85)] backdrop-blur-xl">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12 lg:items-center lg:gap-3">
        {/* Check-In Field */}
        <div className="lg:col-span-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 transition hover:border-amber-400/40 hover:bg-white/8">
            <Calendar className="size-5 shrink-0 text-amber-400" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                {t("stripCheckin")}
              </span>
              <input
                type="date"
                min={today}
                value={checkIn}
                onClick={openPicker}
                onChange={(e) => handleCheckInChange(e.target.value)}
                className="w-full cursor-pointer bg-transparent text-sm font-semibold tabular-nums text-white outline-none [color-scheme:dark]"
              />
            </div>
          </label>
        </div>

        {/* Check-Out Field */}
        <div className="lg:col-span-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 transition hover:border-amber-400/40 hover:bg-white/8">
            <Calendar className="size-5 shrink-0 text-amber-400" />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                  {t("stripCheckout")}
                </span>
                <span className="rounded bg-amber-400/15 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 uppercase">
                  {t("nightsCount", { count: nights })}
                </span>
              </div>
              <input
                type="date"
                min={addDays(checkIn || today, 1)}
                value={checkOut}
                onClick={openPicker}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full cursor-pointer bg-transparent text-sm font-semibold tabular-nums text-white outline-none [color-scheme:dark]"
              />
            </div>
          </label>
        </div>

        {/* Devotees / Guests Field */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 transition hover:border-amber-400/40 hover:bg-white/8">
            <div className="flex items-center gap-2.5">
              <Users className="size-5 shrink-0 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                  {tb("guests")}
                </span>
                <span className="text-xs font-semibold text-white">
                  {guests === 1 ? tb("guestSingle") : tb("guestPlural", { count: guests })}
                </span>
              </div>
            </div>

            {/* Devotee Stepper Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Decrease guests"
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
                disabled={guests <= 1}
                className="flex size-7 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
              >
                <Minus className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Increase guests"
                onClick={() => setGuests((g) => Math.min(50, g + 1))}
                disabled={guests >= 50}
                className="flex size-7 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Submit / Check Availability Button */}
        <div className="lg:col-span-3">
          <button
            type="button"
            onClick={handleCheckAvailability}
            className="group flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-[0_4px_20px_rgba(245,184,0,0.35)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_6px_28px_rgba(245,184,0,0.5)] active:scale-[0.99]"
          >
            <span>{t("stripCta")}</span>
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
