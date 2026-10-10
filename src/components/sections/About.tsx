"use client";

import Image from "next/image";
import { motion } from "motion/react";
import {
  Counter,
  Reveal,
  RevealGroup,
  SplitHeading,
  fadeUp,
  imageReveal,
} from "@/components/motion/primitives";
import { ParallaxAura, ParallaxLayer } from "@/components/motion/parallax";

import { useTranslations } from "next-intl";

export function About() {
  const t = useTranslations("about");

  const stats = [
    { value: 200, suffix: "m", label: t("statTempleLabel") },
    { value: 24, suffix: "/7", label: t("statSupportLabel") },
    { value: 50, suffix: "+", label: t("statPilgrimsLabel") },
    { value: 20, suffix: "+", label: t("statRoomsLabel") },
  ];

  return (
    <section id="about" className="relative overflow-hidden bg-background py-20 sm:py-28 lg:py-32">
      <ParallaxAura className="top-10 -left-32 size-[32rem] bg-primary/5" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
        <div>
          <Reveal>
            <p className="eyebrow text-primary">
              <span className="eyebrow-line" />
              {t("eyebrow")}
            </p>
          </Reveal>

          <SplitHeading
            text={t("title")}
            className="mt-4 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-light leading-[1.08] text-foreground"
          />

          <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
            <Reveal delay={0.05}>
              <p>{t("desc1")}</p>
            </Reveal>
            <Reveal delay={0.1}>
              <p>{t("desc2")}</p>
            </Reveal>
          </div>

          {/* Spring-driven count-up stats row */}
          <RevealGroup
            as="ul"
            className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {stats.map((stat) => (
              <motion.li
                key={stat.label}
                variants={fadeUp}
                className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm"
              >
                <p className="font-display text-2xl sm:text-3xl font-normal text-primary">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
              </motion.li>
            ))}
          </RevealGroup>
        </div>

        {/* Photography with Parallax depth */}
        <ParallaxLayer distance={24} className="relative">
          <Reveal className="relative overflow-hidden rounded-3xl border border-border shadow-xl">
            <motion.div {...imageReveal} className="relative aspect-4/3 w-full sm:aspect-5/4">
              <Image
                src="/images/hotel-morya-exterior-01.png"
                alt={t("altFacade")}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </motion.div>
          </Reveal>

          {/* Overlapping secondary image card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="absolute -bottom-6 -left-4 hidden w-48 sm:w-56 overflow-hidden rounded-2xl border-4 border-background bg-card p-1.5 shadow-2xl sm:block lg:-left-8"
          >
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl">
              <Image
                src="/images/hotel-morya-reception-lobby.png"
                alt={t("altLobby")}
                fill
                sizes="224px"
                className="object-cover"
              />
            </div>
            <p className="py-2 text-center text-xs font-semibold text-muted-foreground">
              {t("captionReception")}
            </p>
          </motion.div>
        </ParallaxLayer>
      </div>
    </section>
  );
}
