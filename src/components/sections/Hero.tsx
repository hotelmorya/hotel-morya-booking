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
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { waHref } from "@/lib/site";
import { MagneticLink } from "@/components/motion/magnetic-link";

const SLIDE_DURATION = 6500;

const slides = [
  {
    image: "/images/hotel-morya-exterior-02.png",
    alt: "Hotel Morya Lodging building exterior in Admapur",
    badge: "200m to Shri Balumama Temple",
    title: "Hotel Morya",
    italic: "Lodging Admapur",
    description:
      "A peaceful and welcoming sanctuary just a 2-minute walk from the holy samadhi mandir of Shri Sant Balumama.",
  },
  {
    image: "/images/hotel-morya-reception-lobby.png",
    alt: "Reception lobby at Hotel Morya Lodging",
    badge: "Warm Pilgrimage Hospitality",
    title: "Come in.",
    italic: "Feel at ease.",
    description:
      "Step-free elevator access, 24/7 hot water for holy snan, and dedicated assistance for families and elderly devotees.",
  },
  {
    image: "/images/hotel-morya-ac-room.png",
    alt: "Deluxe AC room at Hotel Morya Lodging",
    badge: "Clean & Restful Accommodation",
    title: "Stay close.",
    italic: "Rest well.",
    description:
      "Choose from comfortable AC rooms, non-AC rooms, or our spacious dormitory for large devotee groups and palkhis.",
  },
];

export function Hero() {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reduceMotion = useReducedMotion();

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (reduceMotion || !playing) return;
    const timer = setInterval(nextSlide, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [nextSlide, playing, reduceMotion]);

  return (
    <section className="relative min-h-[92svh] lg:min-h-screen w-full overflow-hidden bg-zinc-950 text-white flex flex-col justify-between pt-24 sm:pt-28">
      {/* Background slider with lightened, vibrant overlay */}
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
            {/* 
              Significantly reduced dark overlay:
              Allows the genuine facade, lobby, and room photography to shine bright, 
              while keeping a gentle bottom/left gradient for crisp typography.
            */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-black/25 to-black/15" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent sm:max-w-3xl" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Hero Content Body */}
      <div className="relative z-20 mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-16 my-auto">
        <div className="max-w-2xl">
          {/* Temple Proximity Pill */}
          <motion.div
            key={`badge-${current}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-black/40 px-4 py-1.5 text-xs font-semibold tracking-wider text-amber-300 uppercase backdrop-blur-md shadow-sm"
          >
            <MapPin className="size-3.5 text-amber-400" />
            <span>{slides[current].badge}</span>
          </motion.div>

          {/* Heading with Serif Accent */}
          <motion.h1
            key={`title-${current}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-4 font-display text-[clamp(2.5rem,6.5vw,4.75rem)] font-light leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
          >
            {slides[current].title}{" "}
            <span className="block font-normal italic text-amber-200">
              {slides[current].italic}
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            key={`desc-${current}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-zinc-200 drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]"
          >
            {slides[current].description}
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <MagneticLink
              href={waHref("Namaskar, I am planning a visit to Admapur and would like to book a room at Hotel Morya.")}
              variant="whatsapp"
              external
            >
              Inquire via WhatsApp
            </MagneticLink>
            <MagneticLink href="#book" variant="ghost-light">
              <span>Online Booking</span>
              <ArrowRight className="size-4" />
            </MagneticLink>
          </motion.div>
        </div>
      </div>

      {/* Bottom Slider Control Bar */}
      <div className="relative z-20 w-full border-t border-white/10 bg-zinc-950/50 backdrop-blur-md px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Slide Indicators & Progress */}
          <div className="flex items-center gap-3">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="group py-2"
              >
                <span
                  className="relative block h-1 rounded-full bg-white/30 transition-all duration-300 group-hover:bg-white/50"
                  style={{ width: i === current ? 48 : 20 }}
                >
                  {i === current && (
                    <span className="absolute inset-0 rounded-full bg-amber-400" />
                  )}
                </span>
              </button>
            ))}

            {/* Pause / Play Button */}
            {!reduceMotion && (
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause slideshow" : "Play slideshow"}
                className="ml-2 inline-flex size-7 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-amber-400 hover:text-white"
              >
                {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
              </button>
            )}
          </div>

          {/* Current Counter & Nav Arrows */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold tracking-wider text-white/80">
              <strong className="text-base text-amber-300 font-display">
                {String(current + 1).padStart(2, "0")}
              </strong>{" "}
              / {String(slides.length).padStart(2, "0")}
            </span>
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous slide"
                className="inline-flex size-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/25"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next slide"
                className="inline-flex size-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/25"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
