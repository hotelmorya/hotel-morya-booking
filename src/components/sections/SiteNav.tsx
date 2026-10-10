"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useScroll } from "motion/react";
import { Menu, Phone, X, Calendar, MapPin, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { HOTEL, telHref } from "@/lib/site";
import { LocaleSwitcher } from "@/components/public/LocaleSwitcher";

export function SiteNav() {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("about");
  const { scrollYProgress } = useScroll();

  const navLinks = [
    { id: "about", label: t("about") },
    { id: "temple", label: t("temple") },
    { id: "accommodations", label: t("rooms") },
    { id: "amenities", label: t("amenities") },
    { id: "gallery", label: t("gallery") },
    { id: "contact", label: t("contact") },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
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
  }, [navLinks]);

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
      {/* ── Top Pilgrim Utility Bar ────────────────────────────────────────── */}
      <div className="border-b border-amber-400/20 bg-zinc-950/90 text-white backdrop-blur-md transition-all duration-300">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-[11px] sm:px-8">
          {/* Temple proximity indicator */}
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-medium text-amber-300/90 truncate max-w-[220px] sm:max-w-none">
              {t("templeDistance")}
            </span>
          </div>

          {/* Right helper links: Helpline + Track Booking + LocaleSwitcher */}
          <div className="flex items-center gap-3 sm:gap-5">
            <a
              href={telHref(HOTEL.phones[0])}
              className="hidden md:flex items-center gap-1.5 text-zinc-300 hover:text-amber-300 transition"
            >
              <Phone className="size-3 text-amber-400" />
              <span>+91 {HOTEL.phones[0]}</span>
            </a>

            <Link
              href="/track"
              className="flex items-center gap-1 text-zinc-300 hover:text-amber-300 transition font-medium"
            >
              <Search className="size-3 text-amber-400" />
              <span>{t("trackBooking")}</span>
            </Link>

            <div className="pl-1 border-l border-white/20">
              <LocaleSwitcher onDark={true} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Sticky Navigation Bar ────────────────────────────────────── */}
      <div
        className={`transition-all duration-300 ${
          scrolled
            ? "bg-white/95 dark:bg-zinc-950/95 text-zinc-900 dark:text-white shadow-md backdrop-blur-xl border-b border-zinc-200/90 dark:border-white/10"
            : "bg-white/90 dark:bg-zinc-950/90 text-zinc-900 dark:text-white shadow-xs backdrop-blur-xl border-b border-zinc-200/70 dark:border-white/10"
        }`}
      >
        <nav
          aria-label="Main Navigation"
          className="mx-auto flex h-16 sm:h-18 max-w-7xl items-center justify-between px-4 sm:px-8"
        >
          {/* Logo with natural contrast */}
          <Link href="/" className="flex shrink-0 items-center group py-1" aria-label="Hotel Morya Lodging">
            <div className="relative h-10 w-32 sm:h-12 sm:w-40 transition-transform duration-300 group-hover:scale-102">
              <Image
                src="/images/morya-logo.png"
                alt="Hotel Morya Lodging"
                fill
                priority
                className="object-contain object-left drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] filter brightness-105"
              />
            </div>
          </Link>

          {/* Desktop navigation links */}
          <ul className="hidden items-center gap-1 lg:flex text-xs font-bold uppercase tracking-wider">
            {navLinks.map((link) => {
              const isActive = activeId === link.id;
              return (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    aria-current={isActive ? "true" : undefined}
                    className={`relative rounded-full px-3 py-2 transition-colors ${
                      isActive
                        ? "text-primary dark:text-amber-400 font-bold"
                        : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary dark:bg-amber-400"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <a
              href={telHref(HOTEL.phones[0])}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-zinc-300/80 bg-zinc-100/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-800 transition hover:bg-zinc-200/90 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            >
              <Phone className="size-3.5 text-primary dark:text-amber-400" />
              <span>+91 {HOTEL.phones[0]}</span>
            </a>

            <Link
              href="/book"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 sm:px-5 sm:py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-[0_2px_12px_rgba(245,184,0,0.35)] transition-all duration-200 hover:bg-amber-300 hover:scale-[1.02] active:scale-[0.99]"
            >
              <Calendar className="size-3.5" />
              <span>{t("bookNow")}</span>
            </Link>

            {/* Mobile hamburger button */}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="inline-flex size-9 sm:size-10 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-100 text-zinc-900 transition hover:bg-zinc-200 dark:border-white/20 dark:bg-white/10 dark:text-white lg:hidden"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {/* Scroll Progress indicator */}
        <motion.div
          aria-hidden
          className="h-0.5 origin-left bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600"
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
            className="fixed inset-0 top-[100px] z-40 flex flex-col justify-between bg-white/98 dark:bg-zinc-950/98 p-6 backdrop-blur-2xl lg:hidden border-t border-zinc-200 dark:border-white/10 overflow-y-auto"
          >
            {/* Language Switcher in Mobile Drawer */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Language / भाषा
              </span>
              <LocaleSwitcher onDark={false} />
            </div>

            <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-white/10 text-base font-semibold">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between py-3.5 text-zinc-800 dark:text-white/90 hover:text-amber-500 transition"
                  >
                    <span>{link.label}</span>
                    <span className="text-xs text-amber-500">→</span>
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/track"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between py-3.5 text-zinc-800 dark:text-white/90 hover:text-amber-500 transition"
                >
                  <span className="flex items-center gap-2">
                    <Search className="size-4 text-amber-500" />
                    <span>{t("trackBooking")}</span>
                  </span>
                  <span className="text-xs text-amber-500">→</span>
                </Link>
              </li>
            </ul>

            <div className="pt-6 pb-6 flex flex-col gap-3">
              <a
                href={telHref(HOTEL.phones[0])}
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-zinc-100 py-3 text-sm font-semibold text-zinc-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
              >
                <Phone className="size-4 text-amber-500" />
                Call +91 {HOTEL.phones[0]}
              </a>
              <Link
                href="/book"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 py-3.5 text-sm font-bold uppercase tracking-wider text-zinc-950 shadow-sm"
              >
                <Calendar className="size-4" />
                {t("bookNow")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
