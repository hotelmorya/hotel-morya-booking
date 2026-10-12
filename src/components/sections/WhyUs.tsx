"use client";

import { motion } from "motion/react";
import {
  Car,
  Clock,
  Droplets,
  Building2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Reveal, RevealGroup, SplitHeading, fadeUp } from "@/components/motion/primitives";
import { ParallaxAura } from "@/components/motion/parallax";
import { useTranslations } from "next-intl";

export function WhyUs() {
  const t = useTranslations("amenities");

  const amenities = [
    {
      icon: MapPin,
      title: t("templeProximity"),
      body: t("templeProximityDesc"),
    },
    {
      icon: Droplets,
      title: t("hotWater"),
      body: t("hotWaterDesc"),
    },
    {
      icon: Building2,
      title: t("lift"),
      body: t("liftDesc"),
    },
    {
      icon: Zap,
      title: t("backup"),
      body: t("backupDesc"),
    },
    {
      icon: Car,
      title: t("parking"),
      body: t("parkingDesc"),
    },
    {
      icon: Users,
      title: t("dormitory"),
      body: t("dormitoryDesc"),
    },
    {
      icon: Sparkles,
      title: t("cleanliness"),
      body: t("cleanlinessDesc"),
    },
    {
      icon: Clock,
      title: t("reception"),
      body: t("receptionDesc"),
    },
    {
      icon: ShieldCheck,
      title: t("safety"),
      body: t("safetyDesc"),
    },
  ];

  return (
    <section id="amenities" className="relative overflow-hidden bg-muted/40 py-20 sm:py-28 lg:py-32">
      <ParallaxAura className="top-20 -left-36 size-[34rem] bg-primary/5" />
      <ParallaxAura className="bottom-10 -right-36 size-[30rem] bg-amber-500/5" />

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

        <RevealGroup
          as="ul"
          className="mt-12 grid gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3"
        >
          {amenities.map((item) => {
            const Icon = item.icon;
            return (
              <motion.li
                key={item.title}
                variants={fadeUp}
                className="group rounded-2xl border border-border/80 bg-card p-6 shadow-xs transition-all duration-300 hover:border-primary/40 hover:shadow-md"
              >
                <span className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-4 font-display text-xl font-normal text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </motion.li>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
