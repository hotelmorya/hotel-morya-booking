"use client";

import { motion } from "motion/react";
import {
  Car,
  Clock,
  Droplets,
  Flame,
  Building2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Reveal, RevealGroup, SplitHeading, fadeUp } from "@/components/motion/primitives";
import { ParallaxAura } from "@/components/motion/parallax";

const amenities = [
  {
    icon: MapPin,
    title: "200m from Temple",
    body: "Literally a 2-minute level walk to the main Samadhi Mandir and temple entry gate.",
  },
  {
    icon: Droplets,
    title: "24/7 Hot Water",
    body: "Reliable hot water at any hour of the day or night for pre-darshan morning holy snan.",
  },
  {
    icon: Building2,
    title: "Passenger Lift Access",
    body: "Step-free elevator service to all room floors, deeply appreciated by senior citizens.",
  },
  {
    icon: Zap,
    title: "Power Backup",
    body: "Full inverter and generator power backup ensures lighting and ventilation never halt.",
  },
  {
    icon: Car,
    title: "Safe Vehicle Parking",
    body: "Spacious on-site parking for two-wheelers, cars, traveler vans, and pilgrim buses.",
  },
  {
    icon: Users,
    title: "Dormitory for Groups",
    body: "Massive 50+ person shared accommodation for devotee sanghas, palkhis, and large family yatras.",
  },
  {
    icon: Sparkles,
    title: "Hygienic Bathrooms",
    body: "Sparkling clean Western and Indian toilets with modern plumbing and high hygiene standards.",
  },
  {
    icon: Clock,
    title: "24-Hour Reception Desk",
    body: "Round-the-clock front desk staff ready to welcome late arrivals and assist with local guidance.",
  },
  {
    icon: ShieldCheck,
    title: "Peaceful & Safe Ambience",
    body: "CCTV security and calm surroundings so your family rests with complete peace of mind.",
  },
];

export function WhyUs() {
  return (
    <section id="amenities" className="relative overflow-hidden bg-muted/40 py-20 sm:py-28 lg:py-32">
      <ParallaxAura className="top-20 -left-36 size-[34rem] bg-primary/5" />
      <ParallaxAura className="bottom-10 -right-36 size-[30rem] bg-amber-500/5" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <Reveal>
            <p className="eyebrow text-primary">
              <span className="eyebrow-line" />
              Pilgrimage Comforts
            </p>
          </Reveal>
          <SplitHeading
            text="Every detail considered for a pure, comfortable stay."
            className="mt-4 font-display text-[clamp(2rem,4.2vw,3.15rem)] font-light leading-[1.08] text-foreground"
          />
          <Reveal delay={0.1}>
            <p className="mt-4 text-base text-muted-foreground">
              We understand the needs of yatris arriving after arduous travel. Our facilities are designed to deliver refreshment, cleanliness, and utmost peace.
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
