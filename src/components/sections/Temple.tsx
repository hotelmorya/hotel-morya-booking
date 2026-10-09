"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Clock, MapPin, Sparkles, HeartHandshake, Navigation } from "lucide-react";
import {
  Reveal,
  RevealGroup,
  SplitHeading,
  fadeUp,
  imageReveal,
} from "@/components/motion/primitives";
import { ParallaxAura, ParallaxLayer } from "@/components/motion/parallax";
import { MagneticLink } from "@/components/motion/magnetic-link";
import { directionsHref, waHref } from "@/lib/site";

const templeHighlights = [
  {
    icon: MapPin,
    title: "Just 200 Metres Away",
    desc: "A relaxed 2-minute stroll from our lobby right to the temple mahadwar.",
  },
  {
    icon: Clock,
    title: "Seamless Aarti Timings",
    desc: "Attend early morning Kakad Aarti (5:30 AM) and evening Shej Aarti with zero transit delays.",
  },
  {
    icon: Sparkles,
    title: "Temple Mahaprasad Proximity",
    desc: "Conveniently located near the Sansthan Anna Chhatra (Mahaprasad dining hall).",
  },
  {
    icon: HeartHandshake,
    title: "Elder-Friendly Stay",
    desc: "Seniors can easily return to air-conditioned rooms to rest between rituals and darshan.",
  },
];

export function Temple() {
  return (
    <section id="temple" className="relative overflow-hidden bg-amber-50/40 dark:bg-zinc-900/60 py-20 sm:py-28 lg:py-32 border-y border-amber-900/10 dark:border-white/10">
      <ParallaxAura className="top-1/4 -right-32 size-[36rem] bg-amber-500/10" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16">
        {/* Left text column */}
        <div>
          <Reveal>
            <p className="eyebrow text-amber-800 dark:text-amber-400">
              <span className="eyebrow-line bg-amber-800 dark:bg-amber-400" />
              Sacred Proximity · Admapur Sansthan
            </p>
          </Reveal>

          <SplitHeading
            text="Stay 200 metres from the holy Samadhi Mandir of Shri Sant Balumama."
            className="mt-4 font-display text-[clamp(2rem,4.2vw,3.15rem)] font-light leading-[1.08] text-foreground"
          />

          <div className="mt-5 space-y-3.5 text-base leading-relaxed text-muted-foreground">
            <Reveal delay={0.05}>
              <p>
                Admapur is sanctified by the divine presence of <strong>Sadguru Shri Sant Balumama</strong>, whose miracles and boundless compassion draw millions of devotees from across India.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p>
                Staying at <strong>Hotel Morya Lodging</strong> means you never have to worry about long walks, traffic congestion, or parking hassles. The temple gates are merely two minutes away on foot.
              </p>
            </Reveal>
          </div>

          <RevealGroup as="ul" className="mt-8 space-y-4">
            {templeHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <motion.li
                  key={item.title}
                  variants={fadeUp}
                  className="flex items-start gap-4 rounded-xl border border-amber-900/10 bg-white/70 dark:bg-zinc-800/60 p-3.5 shadow-xs"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </motion.li>
              );
            })}
          </RevealGroup>

          <Reveal delay={0.15} className="mt-8 flex flex-wrap gap-4">
            <MagneticLink href={directionsHref} variant="primary" external>
              <Navigation className="size-4" />
              <span>Map & Directions</span>
            </MagneticLink>
            <MagneticLink
              href={waHref("Namaskar, I am visiting Shri Balumama Temple in Admapur and would like to check room availability.")}
              variant="whatsapp"
              external
            >
              Inquire on WhatsApp
            </MagneticLink>
          </Reveal>
        </div>

        {/* Right authentic photography composition */}
        <div className="relative pb-12 sm:pb-16 lg:pb-20">
          <Reveal className="relative h-[18rem] sm:h-[24rem] lg:h-[28rem] overflow-hidden rounded-3xl border border-border shadow-xl">
            <motion.div {...imageReveal} className="absolute inset-0">
              <Image
                src="/images/balumama-temple.jpg"
                alt="Shri Sant Balumama Temple exterior in Admapur"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 text-white">
              <p className="text-xs uppercase tracking-wider font-semibold text-amber-300">Shri Sant Balumama Temple</p>
              <p className="text-base sm:text-lg font-display">Admapur, Kolhapur</p>
            </div>
          </Reveal>

          {/* Overlapping authentic Murti photograph */}
          <ParallaxLayer distance={20} className="absolute -bottom-4 right-4 sm:-bottom-6 sm:right-8 w-44 sm:w-56">
            <Reveal delay={0.2} className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-2xl ring-4 ring-background border border-amber-900/20">
              <Image
                src="/images/balumama-murti.jpg"
                alt="Divine Darshan of Shri Sant Balumama Maharaj"
                fill
                sizes="224px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <p className="absolute bottom-2 inset-x-2 text-center text-[0.7rem] font-bold text-amber-200">
                || जय बाळूमामा ||
              </p>
            </Reveal>
          </ParallaxLayer>
        </div>
      </div>
    </section>
  );
}
