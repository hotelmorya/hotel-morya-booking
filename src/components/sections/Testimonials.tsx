"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Quote, Star } from "lucide-react";
import { Reveal, SplitHeading } from "@/components/motion/primitives";
import { useTranslations } from "next-intl";
import { HOTEL } from "@/lib/site";

export function Testimonials() {
  const t = useTranslations("reviews");

  const reviews = [
    {
      name: t("review1Name"),
      role: t("review1Role"),
      quote: t("review1Quote"),
    },
    {
      name: t("review2Name"),
      role: t("review2Role"),
      quote: t("review2Quote"),
    },
    {
      name: t("review3Name"),
      role: t("review3Role"),
      quote: t("review3Quote"),
    },
  ];

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % reviews.length);
  }, [reviews.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + reviews.length) % reviews.length);
  }, [reviews.length]);

  useEffect(() => {
    if (reduceMotion || paused) return;
    const timer = setInterval(next, 7000);
    return () => clearInterval(timer);
  }, [next, paused, reduceMotion]);

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="relative overflow-hidden bg-zinc-950 py-20 text-white sm:py-28 lg:py-32"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 bottom-0 size-[36rem] rounded-full bg-amber-500/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
        <Reveal>
          <p className="eyebrow text-amber-300">
            <span className="eyebrow-line bg-amber-300" />
            {t("eyebrow")}
          </p>
        </Reveal>

        <SplitHeading
          id="testimonials-heading"
          text={t("title")}
          className="mt-4 font-display text-[clamp(2rem,4.2vw,3.15rem)] font-light leading-[1.08] text-white"
        />

        {/* Honest Google Rating Banner */}
        <Reveal delay={0.06}>
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs sm:text-sm backdrop-blur-md">
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="size-4 fill-amber-400" />
              <span className="font-bold text-white text-base">{HOTEL.reviews.rating}</span>
              <span className="text-white/60">/ 5.0</span>
            </div>
            <span className="text-white/30">•</span>
            <span className="text-white/80">{t("googleBadge")}</span>
          </div>
        </Reveal>

        {/* Review Quote Cards */}
        <div className="mt-12 min-h-[14rem] sm:min-h-[12rem] flex items-center justify-center">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <Quote className="mx-auto size-8 text-amber-400/80 mb-6" />
            <p className="font-display text-lg sm:text-2xl font-light italic leading-relaxed text-zinc-200">
              &ldquo;{reviews[current].quote}&rdquo;
            </p>
            <div className="mt-6">
              <p className="font-semibold text-white">{reviews[current].name}</p>
              <p className="text-xs uppercase tracking-widest text-amber-300/80 mt-1">
                {reviews[current].role}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Carousel controls */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous testimonial"
            className="inline-flex size-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
          >
            <ArrowLeft className="size-4" />
          </button>

          <div className="flex items-center gap-2">
            {reviews.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Go to review ${i + 1}`}
                className="py-2"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    i === current ? "w-8 bg-amber-400" : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            aria-label="Next testimonial"
            className="inline-flex size-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
