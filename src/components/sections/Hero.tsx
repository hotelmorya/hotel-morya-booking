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
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/lib/navigation";
import { HOTEL, telHref, waHref } from "@/lib/site";

const SLIDE_DURATION = 6500;

export function Hero() {
  const t = useTranslations("hero");
  const locale = useLocale();
  const isMr = locale === "mr";
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  const slides = [
    {
      image: "/images/hotel-morya-exterior-02.png",
      alt: isMr
        ? "आदमापूर येथील हॉटेल मोरया लॉजिंगची इमारत"
        : "Hotel Morya Lodging building exterior in Admapur",
      badge: t("badgeTemple"),
      title: "Hotel Morya",
      italic: "Lodging Admapur",
      description: t("subtitle"),
      position: "hero-slide-exterior",
    },
    {
      image: "/images/hotel-morya-reception-lobby.png",
      alt: isMr
        ? "हॉटेल मोरया लॉजिंगचे स्वागत कक्ष व रिसेप्शन लॉबी"
        : "Reception lobby at Hotel Morya Lodging",
      badge: t("badgeLift"),
      title: "Come in.",
      italic: "Feel at ease.",
      description: t("subtitle"),
      position: "hero-slide-lobby",
    },
    {
      image: "/images/hotel-morya-ac-room.png",
      alt: isMr
        ? "हॉटेल मोरया लॉजिंगमधील डिलक्स AC रूम"
        : "Deluxe AC room at Hotel Morya Lodging",
      badge: t("badgeRooms"),
      title: "Stay close.",
      italic: "Rest well.",
      description: t("subtitle"),
      position: "hero-slide-room",
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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0]?.clientX ?? null);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0]?.clientX ?? null;
    if (touchEndX !== null) {
      const diff = touchStartX - touchEndX;
      if (diff > 45) {
        nextSlide();
      } else if (diff < -45) {
        prevSlide();
      }
    }
    setTouchStartX(null);
  };

  useEffect(() => {
    if (reduceMotion || !playing) return;
    const timer = setInterval(nextSlide, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [nextSlide, playing, reduceMotion]);

  return (
    <section
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-[92svh] sm:min-h-[96svh] lg:min-h-screen w-full overflow-hidden bg-zinc-950 text-white flex flex-col justify-between pt-20 sm:pt-28"
    >
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
              className={`object-cover ${slides[current].position}`}
            />
            {/* Scrim gradients: luminous photography with guaranteed text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/45 to-black/25 sm:via-zinc-950/60 sm:to-black/30" />
            <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent max-w-4xl" />
            <div className="sm:hidden absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/50 pointer-events-none" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Main Content Body */}
      <div className="relative z-20 mx-auto w-full max-w-7xl px-4 py-5 sm:px-8 sm:py-12 my-auto flex flex-col gap-4 sm:gap-8">
        <div className="max-w-3xl">
          {/* Eyebrow & Proximity Pill */}
          <motion.div
            key={`badge-${current}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-black/60 px-4 py-1.5 text-xs font-bold tracking-wider text-amber-300 uppercase backdrop-blur-md shadow-xs"
          >
            <MapPin className="size-3.5 text-amber-400" />
            <span>{slides[current].badge}</span>
          </motion.div>

          {/* Heading with Serif / Cormorant Accent */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-3.5 sm:mt-4 font-display text-[clamp(2.75rem,8.2vw,4.75rem)] font-light leading-[1.04] sm:leading-[1.06] tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)]"
          >
            <span className="block font-sans text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-amber-400 mb-2 drop-shadow-md">
              {t("brandKicker")}
            </span>
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
            className="mt-3.5 sm:mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-zinc-100/95 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]"
          >
            {t("subtitle")}
          </motion.p>

          {/* Direct CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-4"
          >
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-zinc-950 shadow-[0_4px_20px_rgba(245,184,0,0.4)] transition hover:bg-amber-300 hover:scale-[1.02] active:scale-[0.99]"
            >
              <span>{t("ctaBook")}</span>
              <ArrowRight className="size-4" />
            </Link>

            <div className="flex items-center gap-2.5 sm:gap-4">
              <a
                href={waHref("Namaskar, I am planning a visit to Admapur and would like to book a room at Hotel Morya.")}
                target="_blank"
                rel="noreferrer noopener"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-black/50 px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition hover:border-[#25D366] hover:bg-[#25D366]/20 hover:text-white"
              >
                <svg className="size-4 fill-current text-[#25D366]" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                </svg>
                <span>{t("ctaWhatsapp")}</span>
              </a>

              <a
                href={telHref(HOTEL.phones[0])}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-semibold text-white/90 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
              >
                <Phone className="size-4 text-amber-400" />
                <span>{t("ctaCall")}</span>
              </a>
            </div>
          </motion.div>
        </div>

        {/* Trust Badges Strip */}
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 sm:gap-x-5 sm:gap-y-2 text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-zinc-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]"
        >
          {trustBadges.map((badge, idx) => (
            <li key={idx} className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-amber-400 shrink-0" />
              <span>{badge}</span>
            </li>
          ))}
        </motion.ul>
      </div>

      {/* Bottom Slider Control Bar */}
      <div className="relative z-20 w-full border-t border-white/10 bg-zinc-950/70 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 sm:gap-4">
          {/* Slide Indicators & Progress */}
          <div className="flex items-center gap-2 sm:gap-2.5">
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
                className="ml-1 sm:ml-2 inline-flex size-6 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-amber-400 hover:text-white"
              >
                {playing ? <Pause className="size-2.5" /> : <Play className="size-2.5" />}
              </button>
            )}
          </div>

          {/* Current Counter & Nav Arrows */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-semibold tracking-wider text-white/80">
              <strong className="text-sm text-amber-300 font-display">
                {String(current + 1).padStart(2, "0")}
              </strong>{" "}
              / {String(slides.length).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous slide"
                className="inline-flex size-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/25 active:scale-95"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next slide"
                className="inline-flex size-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/25 active:scale-95"
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
