"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useRef, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost-light" | "whatsapp";

const base =
  "group relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold tracking-wide transition-all duration-300 will-change-transform sm:px-7 select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:opacity-95 hover:-translate-y-0.5",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-accent border border-border/60",
  outline:
    "border-2 border-foreground/75 bg-transparent text-foreground hover:bg-foreground hover:text-background",
  "ghost-light":
    "border border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white hover:text-black",
  whatsapp:
    "bg-[#25D366] text-white shadow-md hover:bg-[#20bd5a] hover:shadow-lg",
};

export function MagneticLink({
  href,
  children,
  variant = "primary",
  className = "",
  external,
  ariaLabel,
  onClick,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
  external?: boolean;
  ariaLabel?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 });
  const sy = useSpring(y, { stiffness: 220, damping: 18 });

  return (
    <motion.a
      ref={ref}
      href={href}
      aria-label={ariaLabel}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
      onClick={onClick}
      style={{ x: sx, y: sy }}
      onPointerMove={(event) => {
        if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set(((event.clientX - rect.left) / rect.width - 0.5) * 12);
        y.set(((event.clientY - rect.top) / rect.height - 0.5) * 8);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={{ scale: 0.96 }}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </motion.a>
  );
}
