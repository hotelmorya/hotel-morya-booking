"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useScroll } from "motion/react";
import { Menu, Phone, X, Calendar } from "lucide-react";
import { HOTEL, telHref } from "@/lib/site";
import { MagneticLink } from "@/components/motion/magnetic-link";

const navLinks = [
  { id: "about", label: "About" },
  { id: "temple", label: "Balumama Temple (200m)" },
  { id: "accommodations", label: "Rooms & Dormitory" },
  { id: "amenities", label: "Amenities" },
  { id: "gallery", label: "Gallery" },
  { id: "contact", label: "Contact & Location" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("about");
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scrollspy observer to highlight active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.2, 0.5] }
    );

    navLinks.forEach((link) => {
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Escape key closes mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`transition-all duration-300 ${
          scrolled
            ? "bg-white/95 dark:bg-zinc-950/95 text-zinc-900 dark:text-white shadow-md backdrop-blur-xl border-b border-zinc-200/90 dark:border-white/10"
            : "bg-white/90 dark:bg-zinc-950/90 text-zinc-900 dark:text-white shadow-xs backdrop-blur-xl border-b border-zinc-200/70 dark:border-white/10"
        }`}
      >
        <nav
          aria-label="Main Navigation"
          className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8"
        >
          {/* Logo with natural contrast */}
          <a href="#" className="flex shrink-0 items-center group py-1" aria-label="Hotel Morya Lodging">
            <div className="relative h-10 w-32 sm:h-12 sm:w-40 transition-transform duration-300 group-hover:scale-103">
              <Image
                src="/images/morya-logo.png"
                alt="Hotel Morya Lodging"
                fill
                priority
                className="object-contain object-left drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] filter brightness-105"
              />
            </div>
          </a>

          {/* Desktop navigation links in high-contrast charcoal */}
          <ul className="hidden items-center gap-1 lg:flex text-xs font-semibold uppercase tracking-wider">
            {navLinks.map((link) => {
              const isActive = activeId === link.id;
              return (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    aria-current={isActive ? "true" : undefined}
                    className={`relative rounded-full px-3.5 py-2 transition-colors ${
                      isActive
                        ? "text-primary dark:text-amber-400 font-bold"
                        : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-primary dark:bg-amber-400"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* Right Action buttons */}
          <div className="hidden items-center gap-3 sm:flex">
            <a
              href={telHref(HOTEL.phones[0])}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100/90 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-800 transition hover:bg-zinc-200/90 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            >
              <Phone className="size-3.5 text-primary dark:text-amber-400" />
              <span>+91 {HOTEL.phones[0]}</span>
            </a>

            <MagneticLink
              href="#book"
              variant="primary"
              className="!px-4 !py-2 !text-xs font-bold uppercase tracking-wider !bg-primary !text-white shadow-sm"
            >
              <Calendar className="size-3.5" />
              <span>Book Stay</span>
            </MagneticLink>
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="inline-flex size-10 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-zinc-900 transition hover:bg-zinc-200 dark:border-white/20 dark:bg-white/10 dark:text-white lg:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>

        {/* Scroll Progress indicator */}
        <motion.div
          aria-hidden
          className="h-0.5 origin-left bg-gradient-to-r from-primary via-amber-600 to-amber-500"
          style={{
            scaleX: scrollYProgress,
            opacity: scrolled ? 1 : 0,
            transition: "opacity 300ms ease",
          }}
        />
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 top-20 z-40 flex flex-col justify-between bg-white/98 dark:bg-zinc-950/98 p-6 backdrop-blur-2xl lg:hidden border-t border-zinc-200 dark:border-white/10"
          >
            <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-white/10 text-base font-medium">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between py-4 text-zinc-800 dark:text-white/90 hover:text-primary dark:hover:text-amber-400 transition"
                  >
                    <span>{link.label}</span>
                    <span className="text-xs text-primary dark:text-amber-400">→</span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="pt-6 pb-8 flex flex-col gap-3">
              <a
                href={telHref(HOTEL.phones[0])}
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-zinc-100 py-3.5 text-sm font-semibold text-zinc-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
              >
                <Phone className="size-4 text-primary dark:text-amber-400" />
                Call +91 {HOTEL.phones[0]}
              </a>
              <a
                href="#book"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-sm"
              >
                Book Your Stay
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
