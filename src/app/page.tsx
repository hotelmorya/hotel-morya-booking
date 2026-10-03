"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Menu,
  Phone,
  Snowflake,
  Users,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitBookingAction } from "@/lib/booking.actions";

const directionsUrl =
  "https://www.google.com/maps/search/?api=1&query=Hotel+Morya+Lodging+Admapur+Kolhapur+Maharashtra";

const heroSlides = [
  {
    image: "/images/hotel-morya-exterior-02.png",
    alt: "Hotel Morya Lodging building exterior in Admapur",
    label: "Arrive in Admapur",
    title: (
      <>
        Hotel Morya
        <br />
        <em className="font-normal italic">Lodging.</em>
      </>
    ),
    description:
      "A welcoming place to pause, just 200 metres from Shri Balumama Temple in Admapur, Kolhapur.",
  },
  {
    image: "/images/hotel-morya-reception-lobby.png",
    alt: "Reception lobby at Hotel Morya Lodging",
    label: "A warm welcome",
    title: (
      <>
        Come in.
        <br />
        <em className="font-normal italic">Feel at ease.</em>
      </>
    ),
    description:
      "Make time to rest between the journey, the sacred darshan, and the precious moments together.",
  },
  {
    image: "/images/hotel-morya-ac-room.png",
    alt: "AC room at Hotel Morya Lodging",
    label: "Room to rest",
    title: (
      <>
        Stay close.
        <br />
        <em className="font-normal italic">Rest well.</em>
      </>
    ),
    description:
      "Choose from comfortable private rooms or a shared dormitory for your family and group visit to Admapur.",
  },
];

const stays = [
  {
    title: "AC Rooms",
    label: "A little extra comfort",
    image: "/images/hotel-morya-ac-room.png",
    icon: Snowflake,
    description:
      "A restful private space with air conditioning for a cool, comfortable stay after a long journey.",
  },
  {
    title: "Non-AC Rooms",
    label: "Simple & restful",
    image: "/images/hotel-morya-non-ac-room.png",
    icon: BedDouble,
    description:
      "An easy, comfortable place to unwind and refresh after a fulfilling day of darshan in Admapur.",
  },
  {
    title: "Non-AC Dormitory",
    label: "Better together",
    image: "/images/hotel-morya-dormitory.png",
    icon: Users,
    description:
      "Spacious shared accommodation tailored for large pilgrim families and groups travelling together.",
  },
];

const gallery = [
  { src: "/images/hotel-morya-exterior-02.png", title: "Hotel Morya Lodging · Exterior" },
  { src: "/images/hotel-morya-reception-lobby.png", title: "The Reception & Lobby" },
  { src: "/images/hotel-morya-ac-room.png", title: "AC Deluxe Room" },
  { src: "/images/hotel-morya-non-ac-room.png", title: "Non-AC Room" },
  { src: "/images/hotel-morya-dormitory.png", title: "Non-AC Dormitory" },
  { src: "/images/hotel-morya-washroom.png", title: "Clean Modern Washroom" },
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [bookingState, setBookingState] = useState<{
    reference?: string;
    error?: string;
  }>({});

  const selectedImage = activeImage === null ? null : gallery[activeImage];

  // Auto-advance hero slides
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = window.setInterval(
      () => setActiveSlide((slide) => (slide + 1) % heroSlides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, []);

  // Keyboard navigation for photo gallery lightbox
  useEffect(() => {
    if (activeImage === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveImage(null);
      if (event.key === "ArrowRight")
        setActiveImage((val) => (val === null ? null : (val + 1) % gallery.length));
      if (event.key === "ArrowLeft")
        setActiveImage((val) =>
          val === null ? null : (val - 1 + gallery.length) % gallery.length,
        );
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [activeImage]);

  function handleBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);

    const checkIn = String(values.get("checkIn") || "");
    const checkOut = String(values.get("checkOut") || "");
    const today = new Date().toISOString().slice(0, 10);

    if (checkIn < today || checkOut <= checkIn) {
      setBookingState({
        error: "Please choose a future check-in date and a check-out date after check-in.",
      });
      return;
    }

    const payload = {
      guestName: String(values.get("guestName") || ""),
      phone: String(values.get("phone") || ""),
      checkIn,
      checkOut,
      guests: Number(values.get("guests") || 2),
      stayType: String(values.get("stayType")) as
        | "AC room"
        | "Non-AC room"
        | "Non-AC dormitory",
      note: String(values.get("note") || ""),
      website: String(values.get("website") || ""),
    };

    setBookingState({});

    startTransition(async () => {
      const result = await submitBookingAction(payload);
      if (result.success) {
        setBookingState({ reference: result.reference });
        form.reset();
      } else {
        setBookingState({ error: result.error });
      }
    });
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="overflow-x-hidden bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md transition-colors">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between gap-6 px-5 sm:px-10 lg:h-24 lg:px-16">
          <a
            href="#top"
            aria-label="Hotel Morya Lodging home"
            onClick={closeMenu}
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <Image
              src="/images/Morya-Logo-01.png"
              alt="Hotel Morya Lodging"
              width={220}
              height={74}
              priority
              className="h-auto w-36 sm:w-44 lg:w-48"
            />
          </a>

          <nav
            className="hidden items-center gap-9 text-[13px] font-semibold uppercase tracking-[0.12em] lg:flex"
            aria-label="Main navigation"
          >
            <a className="nav-link" href="#about">
              Our Story
            </a>
            <a className="nav-link" href="#stays">
              The Stays
            </a>
            <a className="nav-link" href="#hall">
              Mini Hall
            </a>
            <a className="nav-link" href="#gallery">
              Gallery
            </a>
            <a className="nav-link" href="#location">
              Location
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              asChild
              className="hidden h-11 rounded-none bg-primary px-6 text-[11px] font-bold uppercase tracking-[0.13em] text-primary-foreground shadow-none hover:bg-primary/90 sm:inline-flex"
            >
              <a href="#book">
                Request a stay <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <nav
            className="absolute left-0 right-0 top-full flex flex-col border-b border-border bg-background px-6 py-4 shadow-xl lg:hidden"
            aria-label="Mobile navigation"
          >
            {[
              ["Our Story", "#about"],
              ["The Stays", "#stays"],
              ["Mini Hall", "#hall"],
              ["Gallery", "#gallery"],
              ["Find Us & Directions", "#location"],
              ["Request a Stay", "#book"],
            ].map(([label, href]) => (
              <a
                key={href}
                onClick={closeMenu}
                className="border-b border-border/50 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:text-primary"
                href={href}
              >
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main id="top">
        {/* Hero Section */}
        <section
          className="hero relative isolate flex min-h-[600px] items-end overflow-hidden sm:min-h-[660px] lg:min-h-[min(780px,82vh)]"
          aria-label="Welcome to Hotel Morya Lodging"
        >
          {heroSlides.map((slide, index) => (
            <div
              key={slide.image}
              className={`absolute inset-0 -z-20 transition-opacity duration-1000 ${activeSlide === index ? "opacity-100" : "opacity-0"
                }`}
              aria-hidden={activeSlide !== index}
            >
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                priority={index === 0}
                className="object-cover object-center"
                sizes="100vw"
              />
            </div>
          ))}

          {/* Gradients for text contrast */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-foreground/95 via-foreground/40 to-foreground/10 lg:bg-gradient-to-r lg:from-foreground/90 lg:via-foreground/35 lg:to-transparent" />

          <div className="mx-auto flex w-full max-w-[1500px] flex-col justify-end px-5 pb-14 text-primary-foreground sm:px-10 sm:pb-16 lg:px-16 lg:pb-20">
            <div key={activeSlide} className="animate-enter-up">
              <div className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-hero-accent">
                <span className="h-px w-8 bg-hero-accent" />
                {heroSlides[activeSlide].label} · Admapur
              </div>
              <h1 className="max-w-[880px] font-display text-[clamp(4.25rem,7.3vw,8.8rem)] leading-[0.87] tracking-tight">
                {heroSlides[activeSlide].title}
              </h1>
              <p className="mt-7 max-w-[480px] text-base leading-relaxed text-primary-foreground/90 sm:text-lg">
                {heroSlides[activeSlide].description}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <Button
                  asChild
                  className="h-12 rounded-none bg-hero-accent px-7 text-xs font-bold uppercase tracking-[0.14em] text-hero-accent-foreground shadow-lg hover:bg-hero-accent/90"
                >
                  <a href="#book">
                    Request a Stay <ArrowUpRight className="ml-1 h-4 w-4" />
                  </a>
                </Button>
                <a
                  href="#stays"
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-primary-foreground transition-opacity hover:opacity-75"
                >
                  Explore Stays <ArrowDown className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Slide Indicators */}
            <div className="mt-12 flex items-center gap-2" aria-label="Choose a featured photo">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.label}
                  type="button"
                  aria-label={`Show slide ${index + 1}: ${slide.label}`}
                  aria-current={index === activeSlide ? "true" : undefined}
                  onClick={() => setActiveSlide(index)}
                  className="group h-8 w-12 cursor-pointer p-2 transition-transform hover:scale-105"
                >
                  <span
                    className={`block h-1 w-full transition-all ${index === activeSlide
                      ? "bg-hero-accent shadow-sm"
                      : "bg-primary-foreground/45 group-hover:bg-primary-foreground"
                      }`}
                  />
                </button>
              ))}
              <span className="ml-3 text-xs font-semibold tabular-nums text-primary-foreground/90">
                0{activeSlide + 1} / 0{heroSlides.length}
              </span>
            </div>
          </div>
        </section>

        {/* Booking Request Section */}
        <section
          id="book"
          className="scroll-mt-20 border-b border-border bg-background py-14 sm:py-20"
          aria-labelledby="book-heading"
        >
          <div className="mx-auto max-w-[1500px] px-5 sm:px-10 lg:px-16">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <span className="eyebrow">
                  <span className="eyebrow-line" /> Plan your visit
                </span>
                <h2
                  id="book-heading"
                  className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl"
                >
                  Request your <em className="font-normal italic text-primary">stay.</em>
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Send your preferred dates and our team will contact you directly to confirm
                availability. No advance payment is taken here.
              </p>
            </div>

            <form
              onSubmit={handleBooking}
              className="mt-10 grid gap-4 border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_0.8fr_1fr] lg:items-end"
              aria-label="Booking request form"
            >
              <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Check-in
                <input
                  required
                  name="checkIn"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  className="h-12 min-w-0 border border-input bg-background px-3 text-sm font-medium normal-case text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
              </label>

              <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Check-out
                <input
                  required
                  name="checkOut"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  className="h-12 min-w-0 border border-input bg-background px-3 text-sm font-medium normal-case text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
              </label>

              <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Stay type
                <select
                  name="stayType"
                  className="h-12 min-w-0 border border-input bg-background px-3 text-sm font-medium normal-case text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <option value="AC room">AC room</option>
                  <option value="Non-AC room">Non-AC room</option>
                  <option value="Non-AC dormitory">Non-AC dormitory</option>
                </select>
              </label>

              <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Guests
                <input
                  required
                  name="guests"
                  type="number"
                  min="1"
                  max="30"
                  defaultValue="2"
                  className="h-12 min-w-0 border border-input bg-background px-3 text-sm font-medium normal-case text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
              </label>

              <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Your name
                <input
                  required
                  name="guestName"
                  type="text"
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Full name"
                  className="h-12 min-w-0 border border-input bg-background px-3 text-sm font-medium normal-case text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
              </label>

              <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:col-span-2 lg:col-span-2">
                Mobile number
                <input
                  required
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  pattern="[+0-9 ()-]{10,18}"
                  placeholder="Your contact mobile number"
                  className="h-12 min-w-0 border border-input bg-background px-3 text-sm font-medium normal-case text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
              </label>

              <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:col-span-2 lg:col-span-2">
                Anything we should know?{" "}
                <span className="font-normal lowercase tracking-normal">(optional)</span>
                <input
                  name="note"
                  type="text"
                  maxLength={500}
                  placeholder="Arrival timing, senior citizens, parking, or mini hall inquiries"
                  className="h-12 min-w-0 border border-input bg-background px-3 text-sm font-medium normal-case text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
              </label>

              {/* Honeypot field */}
              <label className="absolute -left-[9999px]" aria-hidden="true">
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>

              <Button
                type="submit"
                disabled={isPending}
                className="h-12 w-full rounded-none bg-primary px-5 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground shadow-none hover:bg-primary/90 sm:col-span-2 lg:col-span-1"
              >
                {isPending ? "Sending…" : "Send Request"}{" "}
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </form>

            {/* Notification / Status message */}
            <div role="status" aria-live="polite" className="mt-5 text-sm font-medium">
              {bookingState.reference ? (
                <div className="flex items-start gap-3 rounded border border-primary/20 bg-primary/5 p-4 text-primary">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">
                      Booking request received — Reference #{bookingState.reference}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Our team will reach out to your mobile number to confirm availability and
                      timings. Your stay is finalized upon direct phone confirmation.
                    </p>
                  </div>
                </div>
              ) : bookingState.error ? (
                <div className="flex items-center gap-2 rounded border border-destructive/20 bg-destructive/5 p-4 text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{bookingState.error}</span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Highlights / At a Glance */}
        <section className="border-b border-border bg-secondary" aria-label="At a glance highlights">
          <div className="mx-auto grid max-w-[1500px] grid-cols-2 divide-x divide-border px-5 sm:px-10 lg:grid-cols-4 lg:px-16">
            <div className="flex min-h-28 flex-col justify-center py-6 pr-4 lg:min-h-32">
              <span className="font-display text-4xl text-primary sm:text-5xl">
                200<span className="ml-1 font-sans text-xl">m</span>
              </span>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                From Shri Balumama Temple
              </span>
            </div>
            <div className="flex min-h-28 flex-col justify-center py-6 pl-5 lg:min-h-32 lg:pl-10">
              <span className="font-display text-4xl text-primary sm:text-5xl">03</span>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Ways to stay (AC, Non-AC, Dorm)
              </span>
            </div>
            <div className="flex min-h-28 flex-col justify-center border-t border-border py-6 pr-4 lg:min-h-32 lg:border-t-0 lg:pl-10">
              <span className="font-display text-4xl text-primary sm:text-5xl">01</span>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Spacious Mini Hall
              </span>
            </div>
            <div className="flex min-h-28 flex-col justify-center border-t border-border py-6 pl-5 lg:min-h-32 lg:border-t-0 lg:pl-10">
              <span className="font-display text-3xl text-primary sm:text-4xl">Admapur</span>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Kolhapur, Maharashtra
              </span>
            </div>
          </div>
        </section>

        {/* Story / About Section */}
        <section id="about" className="scroll-mt-20 py-20 sm:py-28 lg:py-36">
          <div className="mx-auto grid max-w-[1500px] items-center gap-12 px-5 sm:px-10 lg:grid-cols-[1.06fr_0.94fr] lg:gap-20 lg:px-16">
            <div className="relative overflow-hidden rounded shadow-sm">
              <div className="relative aspect-[1.16] w-full">
                <Image
                  src="/images/hotel-morya-reception-lobby.png"
                  alt="The welcoming reception at Hotel Morya Lodging"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute bottom-0 left-0 flex items-center gap-3 bg-primary px-5 py-4 text-primary-foreground sm:px-7">
                <span className="font-display text-3xl">M</span>
                <span className="border-l border-primary-foreground/40 pl-3 text-[10px] font-bold uppercase leading-relaxed tracking-[0.15em]">
                  Welcome to
                  <br />
                  Hotel Morya
                </span>
              </div>
            </div>

            <div className="max-w-xl lg:py-8">
              <span className="eyebrow">
                <span className="eyebrow-line" /> A place to feel at ease
              </span>
              <h2 className="mt-6 font-display text-[clamp(3rem,5vw,5.5rem)] leading-[0.99]">
                Close to what <em className="font-normal italic text-primary">matters.</em>
              </h2>
              <p className="mt-7 max-w-[490px] text-base leading-8 text-muted-foreground">
                A visit to Admapur is more than a journey. It is time with family, a sacred moment
                of reflection, and an opportunity to pause. At Hotel Morya Lodging, you will find a
                warm, peaceful haven to return to, just 200 metres from Shri Balumama Temple.
              </p>
              <div className="mt-9 flex items-center gap-4 border-t border-border pt-7 text-sm font-medium">
                <MapPin className="h-5 w-5 shrink-0 text-primary" />
                <span>Admapur, Kolhapur, Maharashtra (Near Shri Balumama Mandir)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Accommodation Stays Section */}
        <section id="stays" className="scroll-mt-20 bg-secondary py-20 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-[1500px] px-5 sm:px-10 lg:px-16">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <span className="eyebrow">
                  <span className="eyebrow-line" /> Make yourself at home
                </span>
                <h2 className="mt-5 font-display text-[clamp(3.25rem,5.4vw,6rem)] leading-none">
                  Find your <em className="font-normal italic text-primary">space.</em>
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-7 text-muted-foreground">
                Whether you are visiting solo, with your family, or arriving as a devotee group,
                there is a dedicated space prepared for you.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3 lg:mt-16 lg:gap-7">
              {stays.map((stay, index) => (
                <article key={stay.title} className="group min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveImage(index + 2)}
                    className="relative block aspect-[1.12] w-full cursor-zoom-in overflow-hidden rounded-none p-0 text-left shadow-sm md:aspect-[0.9]"
                    aria-label={`View ${stay.title} photo`}
                  >
                    <Image
                      src={stay.image}
                      alt={`${stay.title} at Hotel Morya Lodging`}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <span className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center bg-background text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground shadow">
                      <ArrowUpRight className="h-5 w-5" />
                    </span>
                  </button>
                  <div className="flex items-center gap-2 pt-6 text-[10px] font-bold uppercase tracking-[0.17em] text-primary">
                    <stay.icon className="h-4 w-4" /> 0{index + 1} / {stay.label}
                  </div>
                  <h3 className="mt-3 font-display text-4xl sm:text-[2.65rem]">{stay.title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
                    {stay.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Mini Hall Section */}
        <section
          id="hall"
          className="scroll-mt-20 border-b border-border bg-primary py-20 text-primary-foreground sm:py-28"
        >
          <div className="mx-auto grid max-w-[1500px] gap-10 px-5 sm:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end lg:gap-24 lg:px-16">
            <div>
              <span className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-hero-accent">
                <span className="h-px w-9 bg-hero-accent" /> Beyond the stay
              </span>
              <h2 className="mt-7 font-display text-[clamp(3.5rem,6vw,7rem)] leading-[0.92]">
                A place to <em className="font-normal italic">gather.</em>
              </h2>
            </div>
            <div className="lg:pb-2">
              <div className="mb-5 flex h-12 w-12 items-center justify-center border border-primary-foreground/40">
                <CalendarDays className="h-5 w-5" />
              </div>
              <h3 className="font-display text-3xl">The Mini Hall</h3>
              <p className="mt-4 max-w-lg text-base leading-8 text-primary-foreground/80">
                Some moments are better shared. Our mini hall offers a warm, convenient space to
                bring families and pilgrim groups together during your visit to Admapur. Mention
                the hall in your request and our team will arrange the details with you.
              </p>
              <a
                href="#book"
                className="mt-6 inline-flex items-center gap-2 border-b border-primary-foreground pb-1 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-75"
              >
                Ask about the hall <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Gallery Section */}
        <section id="gallery" className="scroll-mt-20 py-20 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-[1500px] px-5 sm:px-10 lg:px-16">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <span className="eyebrow">
                  <span className="eyebrow-line" /> A closer look
                </span>
                <h2 className="mt-5 font-display text-[clamp(3.25rem,5.4vw,6rem)] leading-none">
                  See it for <em className="font-normal italic text-primary">yourself.</em>
                </h2>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Moments around Morya / 01—06
              </span>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:mt-16 lg:grid-cols-4">
              {gallery.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`group relative block h-auto w-full cursor-zoom-in overflow-hidden rounded-none p-0 text-left shadow-none ${index === 0 || index === 3 ? "lg:col-span-2" : ""
                    }`}
                  aria-label={`View ${item.title}`}
                >
                  <div className="relative aspect-square w-full lg:aspect-[1.35]">
                    <Image
                      src={item.src}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </div>
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-foreground/75 to-transparent px-3 pb-3 pt-12 text-left text-xs font-semibold tracking-[0.03em] text-primary-foreground sm:px-5 sm:pb-5">
                    <span className="whitespace-normal">{item.title}</span>
                    <ArrowUpRight className="ml-2 h-4 w-4 shrink-0" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section id="location" className="scroll-mt-20 grid lg:grid-cols-2">
          <div className="flex flex-col justify-center bg-secondary px-5 py-20 sm:px-10 sm:py-28 lg:px-[max(4rem,calc((100vw-1372px)/2))] lg:py-32">
            <span className="eyebrow">
              <span className="eyebrow-line" /> Right where you need to be
            </span>
            <h2 className="mt-6 max-w-xl font-display text-[clamp(3.3rem,5.3vw,6.2rem)] leading-[0.98]">
              Your visit, <em className="font-normal italic text-primary">made easier.</em>
            </h2>
            <p className="mt-7 max-w-md text-base leading-8 text-muted-foreground">
              Only 200 metres from Shri Balumama Temple, Hotel Morya Lodging keeps you close to the
              heart of Admapur and the purpose of your journey.
            </p>
            <p className="mt-6 flex items-start gap-3 text-sm font-medium">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>Admapur, Kolhapur, Maharashtra, India</span>
            </p>
            <Button
              asChild
              className="mt-9 h-12 w-fit rounded-none bg-primary px-7 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground shadow hover:bg-primary/90"
            >
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                Get Directions <ArrowUpRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="relative min-h-[350px] lg:min-h-[590px]">
            <Image
              src="/images/hotel-morya-exterior-01.png"
              alt="Hotel Morya Lodging building exterior and grounds in Admapur"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <span className="absolute bottom-5 left-5 bg-background px-4 py-3 text-[10px] font-bold uppercase tracking-[0.13em] text-foreground shadow sm:bottom-8 sm:left-8">
              Hotel Morya Lodging · Admapur
            </span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-footer text-footer-foreground">
        <div className="mx-auto grid max-w-[1500px] gap-12 px-5 py-16 sm:px-10 lg:grid-cols-[1.3fr_1fr_1fr] lg:px-16 lg:py-20">
          <div>
            <div className="inline-block bg-background px-3 py-1.5 rounded">
              <Image
                src="/images/Morya-Logo-01.png"
                alt="Hotel Morya Lodging"
                width={190}
                height={64}
                className="h-auto w-44"
              />
            </div>
            <p className="mt-6 max-w-xs text-sm leading-7 text-footer-foreground/70">
              A serene and comfortable place to stay near Shri Balumama Temple in Admapur, Kolhapur.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-hero-accent">
              Explore
            </h3>
            <div className="mt-6 grid gap-3 text-sm text-footer-foreground/80">
              <a className="footer-link" href="#about">
                Our Story
              </a>
              <a className="footer-link" href="#stays">
                Rooms & Dormitory
              </a>
              <a className="footer-link" href="#hall">
                Mini Hall
              </a>
              <a className="footer-link" href="#gallery">
                Gallery
              </a>
              <a className="footer-link" href="#book">
                Booking Inquiry
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-hero-accent">
              Visit Us
            </h3>
            <p className="mt-6 text-sm leading-7 text-footer-foreground/80">
              Admapur, Taluka Bhudargad
              <br />
              Kolhapur, Maharashtra, India
            </p>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-footer-foreground transition-colors hover:text-hero-accent"
            >
              Open in Google Maps <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="border-t border-footer-foreground/15">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-5 py-6 text-xs text-footer-foreground/60 sm:flex-row sm:justify-between sm:px-10 lg:px-16">
            <span>© {new Date().getFullYear()} Hotel Morya Lodging. All rights reserved.</span>
            <span>
              designed, developed &amp; maintained by{" "}
              <a
                href="mailto:pravin.b.0009@gmail.com"
                className="text-footer-foreground underline underline-offset-4 transition-colors hover:text-hero-accent"
              >
                Pravin Bagde
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal */}
      {selectedImage && activeImage !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-lightbox p-4 sm:p-10 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery lightbox"
          onClick={() => setActiveImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground sm:right-7 sm:top-7"
            aria-label="Close gallery"
            onClick={() => setActiveImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground sm:left-6"
            aria-label="Previous photo"
            onClick={(event) => {
              event.stopPropagation();
              setActiveImage((activeImage - 1 + gallery.length) % gallery.length);
            }}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          <figure
            className="relative flex flex-col items-center max-w-[min(1100px,calc(100vw-80px))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative max-h-[75vh] w-full aspect-[16/10] min-w-[300px] sm:min-w-[600px] lg:min-w-[900px]">
              <Image
                src={selectedImage.src}
                alt={selectedImage.title}
                fill
                className="object-contain"
                sizes="90vw"
                priority
              />
            </div>
            <figcaption className="mt-4 flex w-full justify-between gap-6 text-xs font-semibold uppercase tracking-[0.13em] text-primary-foreground/90">
              <span>{selectedImage.title}</span>
              <span>
                {String(activeImage + 1).padStart(2, "0")} /{" "}
                {String(gallery.length).padStart(2, "0")}
              </span>
            </figcaption>
          </figure>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground sm:right-6"
            aria-label="Next photo"
            onClick={(event) => {
              event.stopPropagation();
              setActiveImage((activeImage + 1) % gallery.length);
            }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </div>
      )}
    </div>
  );
}
