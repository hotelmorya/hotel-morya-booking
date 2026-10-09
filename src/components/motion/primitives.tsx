"use client";

import { motion, useInView, useMotionValue, useSpring, type Variants } from "motion/react";
import { Fragment, useEffect, useRef, type ReactNode } from "react";

const ease = [0.22, 0.61, 0.36, 1] as const;

/**
 * Rise, fade, and resolve out of a soft 6px blur.
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.75, ease },
  },
};

export const stagger = (delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren } },
});

export const imageReveal = {
  initial: { scale: 1.1 },
  whileInView: { scale: 1 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 1.2, ease },
} as const;

type RevealTag = "div" | "section" | "ul" | "ol" | "li" | "span" | "p" | "figure" | "dl";

export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: RevealTag;
  amount?: number;
}) {
  const Comp = (motion[as] || motion.div) as typeof motion.div;
  return (
    <Comp
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount, margin: "0px 0px -60px 0px" }}
      transition={{ delay }}
    >
      {children}
    </Comp>
  );
}

export function RevealGroup({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: RevealTag;
}) {
  const Comp = (motion[as] || motion.div) as typeof motion.div;
  return (
    <Comp
      className={className}
      variants={stagger(delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -40px 0px" }}
    >
      {children}
    </Comp>
  );
}

export function SplitHeading({
  text,
  className,
  as: Tag = "h2",
  id,
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
  id?: string;
}) {
  const Comp = (motion[Tag] || motion.h2) as typeof motion.h2;
  const words = text.split(" ");

  return (
    <Comp
      id={id}
      className={className}
      variants={stagger()}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <motion.span variants={fadeUp} className="inline-block">
            {word}
          </motion.span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Comp>
  );
}

export function Counter({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 20, mass: 0.8 });

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, mv, value]);

  useEffect(() => {
    return spring.on("change", (latest) => {
      if (ref.current) ref.current.textContent = `${Math.round(latest)}${suffix}`;
    });
  }, [spring, suffix]);

  return (
    <span ref={ref} className={className} aria-label={`${value}${suffix}`}>
      {value}
      {suffix}
    </span>
  );
}
