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
import { useTranslations, useLocale } from "next-intl";
import { directionsHref, waHref } from "@/lib/site";

export function Temple() {
  const t = useTranslations("temple");
  const locale = useLocale();

  const templeHighlights = [
    {
      icon: MapPin,
      title: t("hlDistanceTitle"),
      desc: t("hlDistanceDesc"),
    },
    {
      icon: Clock,
      title: t("hlAartiTitle"),
      desc: t("hlAartiDesc"),
    },
    {
      icon: Sparkles,
      title: t("hlPrasadTitle"),
      desc: t("hlPrasadDesc"),
    },
    {
      icon: HeartHandshake,
      title: t("hlEldersTitle"),
      desc: t("hlEldersDesc"),
    },
  ];

  return (
    <section id="temple" className="relative overflow-hidden bg-amber-50/40 dark:bg-zinc-900/60 py-20 sm:py-28 lg:py-32 border-y border-amber-900/10 dark:border-white/10">
      <ParallaxAura className="top-1/4 -right-32 size-[36rem] bg-amber-500/10" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16">
        {/* Left text column */}
        <div>
          <Reveal>
            <p className="eyebrow text-amber-800 dark:text-amber-400">
              <span className="eyebrow-line bg-amber-800 dark:bg-amber-400" />
              {t("eyebrow")}
            </p>
          </Reveal>

          <SplitHeading
            text={t("title")}
            className="mt-4 font-display text-[clamp(2rem,4.2vw,3.15rem)] font-light leading-[1.08] text-foreground"
          />

          <div className="mt-5 space-y-3.5 text-base leading-relaxed text-muted-foreground">
            <Reveal delay={0.05}>
              <p>{t("subtitle")}</p>
            </Reveal>
            <Reveal delay={0.1}>
              <p>{t("haldiDesc")}</p>
            </Reveal>
          </div>

          <RevealGroup as="ul" className="mt-8 space-y-4">
            {templeHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <motion.li
                  key={item.title}
                  variants={fadeUp}
                  className="flex items-start gap-4 rounded-xl border border-amber-900/10 bg-white/80 dark:bg-zinc-800/60 p-4 sm:p-4.5 shadow-xs"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-sans font-bold text-base sm:text-[1.0625rem] text-foreground tracking-tight">
                      {item.title}
                    </h3>
                    <p className="font-sans text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </RevealGroup>

          <Reveal delay={0.15} className="mt-8 flex flex-wrap gap-4">
            <MagneticLink href={directionsHref} variant="primary" external>
              <Navigation className="size-4" />
              <span>{t("mapAndDirections")}</span>
            </MagneticLink>
            <MagneticLink
              href={waHref(t("waEnquiryMessage"))}
              variant="whatsapp"
              external
            >
              {locale === "mr" ? "व्हॉट्सअ‍ॅप" : "WhatsApp"}
            </MagneticLink>
          </Reveal>
        </div>

        {/* Right authentic photography composition */}
        <div className="relative pb-12 sm:pb-16 lg:pb-20">
          <Reveal className="relative h-[18rem] sm:h-[24rem] lg:h-[28rem] overflow-hidden rounded-3xl border border-border shadow-xl">
            <motion.div {...imageReveal} className="absolute inset-0">
              <Image
                src="/images/balumama-temple.png"
                alt={t("altTempleExterior")}
                fill
                sizes="(min-width: 1024px) 300vw, 100vw"
                className="object-cover"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 text-white">
              <p className="text-xs uppercase tracking-wider font-semibold text-amber-300">{t("templeTag")}</p>
              <p className="text-base sm:text-lg font-semibold tracking-tight text-white drop-shadow-sm">{t("locationAdmapur")}</p>
            </div>
          </Reveal>

          {/* Overlapping authentic Murti photograph */}
          <ParallaxLayer distance={20} className="absolute -bottom-4 right-4 sm:-bottom-6 sm:right-8 w-44 sm:w-56">
            <Reveal delay={0.2} className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-2xl ring-4 ring-background border border-amber-900/20">
              <Image
                src="/images/balumama-murti.jpg"
                alt={t("altMurti")}
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
