"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pause,
  Play,
  Phone,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { HOTEL, telHref, waHref } from "@/lib/site";
import { HeroAvailabilityBar } from "@/components/public/HeroAvailabilityBar";

const SLIDE_DURATION = 6500;

export function Hero() {
  const t = useTranslations("hero");
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reduceMotion = useReducedMotion();

  const slides = [
    {
      image: "/images/hotel-morya-exterior-02.png",
      alt: "Hotel Morya Lodging building exterior in Admapur",
      badge: t("badgeTemple"),
      title: "Hotel Morya",
      italic: "Lodging Admapur",
      description: t("subtitle"),
    },
    {
      image: "/images/hotel-morya-reception-lobby.png",
      alt: "Reception lobby at Hotel Morya Lodging",
      badge: t("badgeLift"),
      title: "Come in.",
      italic: "Feel at ease.",
      description: t("subtitle"),
    },
    {
      image: "/images/hotel-morya-ac-room.png",
      alt: "Deluxe AC room at Hotel Morya Lodging",
      badge: t("badgeRooms"),
      title: "Stay close.",
      italic: "Rest well.",
      description: t("subtitle"),
    },
  ];

  const trustBadges = [
    t("badgeTemple"),
    t("badgeRooms"),
    t("badgeDorm"),
    t("badgeWater"),
    t("badgeParking"),
    t("badgeLift"),
  ];

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (reduceMotion || !playing) return;
    const timer = setInterval(nextSlide, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [nextSlide, playing, reduceMotion]);

  return (
    <section className="relative min-h-[96svh] lg:min-h-screen w-full overflow-hidden bg-zinc-950 text-white flex flex-col justify-between pt-24 sm:pt-28">
      {/* Background slider with photography */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={slides[current].image}
              alt={slides[current].alt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            {/* Scrim gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/40 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent sm:max-w-4xl" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Main Content Body */}
      <div className="relative z-20 mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-12 my-auto flex flex-col gap-8">
        <div className="max-w-3xl">
          {/* Eyebrow & Proximity Pill */}
          <motion.div
            key={`badge-${current}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-black/50 px-4 py-1.5 text-xs font-bold tracking-wider text-amber-300 uppercase backdrop-blur-md shadow-xs"
          >
            <MapPin className="size-3.5 text-amber-400" />
            <span>{slides[current].badge}</span>
          </motion.div>

          {/* Heading with Serif / Cormorant Accent */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-4 font-display text-[clamp(2.4rem,6vw,4.5rem)] font-light leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.8)]"
          >
            {t("titleLine1")}{" "}
            <span className="block font-normal italic text-amber-300">
              {t("titleAccent")}
            </span>
          </motion.h1>

          {/* Subtitle Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-zinc-200 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]"
          >
            {t("subtitle")}
          </motion.p>

          {/* Direct CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4"
          >
            <Link
              href="/book"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-950 shadow-[0_4px_20px_rgba(245,184,0,0.4)] transition hover:bg-amber-300 hover:scale-[1.02] active:scale-[0.99]"
            >
              <span>{t("ctaBook")}</span>
              <ArrowRight className="size-4" />
            </Link>

            <a
              href={waHref("Namaskar, I am planning a visit to Admapur and would like to book a room at Hotel Morya.")}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-black/40 px-5 py-3.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition hover:border-[#25D366] hover:bg-[#25D366]/20 hover:text-white"
            >
              <svg className="size-4 fill-current text-[#25D366]" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
              </svg>
              <span>{t("ctaWhatsapp")}</span>
            </a>

            <a
              href={telHref(HOTEL.phones[0])}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3.5 text-xs sm:text-sm font-semibold text-white/90 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
            >
              <Phone className="size-4 text-amber-400" />
              <span>{t("ctaCall")}</span>
            </a>
          </motion.div>
        </div>

        {/* Floating Availability Bar */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="w-full pt-2"
        >
          <HeroAvailabilityBar />
        </motion.div>

        {/* Trust Badges Strip */}
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-zinc-300"
        >
          {trustBadges.map((badge, idx) => (
            <li key={idx} className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-amber-400" />
              <span>{badge}</span>
            </li>
          ))}
        </motion.ul>
      </div>

      {/* Bottom Slider Control Bar */}
      <div className="relative z-20 w-full border-t border-white/10 bg-zinc-950/60 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Slide Indicators & Progress */}
          <div className="flex items-center gap-2.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="group py-1.5"
              >
                <span
                  className="relative block h-1 rounded-full bg-white/30 transition-all duration-300 group-hover:bg-white/50"
                  style={{ width: i === current ? 44 : 18 }}
                >
                  {i === current && (
                    <span className="absolute inset-0 rounded-full bg-amber-400" />
                  )}
                </span>
              </button>
            ))}

            {!reduceMotion && (
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause slideshow" : "Play slideshow"}
                className="ml-2 inline-flex size-6 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-amber-400 hover:text-white"
              >
                {playing ? <Pause className="size-2.5" /> : <Play className="size-2.5" />}
              </button>
            )}
          </div>

          {/* Current Counter & Nav Arrows */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tracking-wider text-white/80">
              <strong className="text-sm text-amber-300 font-display">
                {String(current + 1).padStart(2, "0")}
              </strong>{" "}
              / {String(slides.length).padStart(2, "0")}
            </span>
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous slide"
                className="inline-flex size-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/25"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next slide"
                className="inline-flex size-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/25"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
