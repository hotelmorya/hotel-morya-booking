"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Reveal, RevealGroup, SplitHeading, fadeUp } from "@/components/motion/primitives";

const galleryItems = [
  {
    src: "/images/hotel-morya-exterior-02.png",
    caption: "Hotel Morya Lodging facade and building in Admapur",
    category: "Exterior",
    span: "col-span-2 row-span-2 aspect-square sm:aspect-auto",
  },
  {
    src: "/images/hotel-morya-ac-room.png",
    caption: "Air-conditioned deluxe bedroom with comfortable linen",
    category: "Rooms",
    span: "col-span-1 row-span-1 aspect-square",
  },
  {
    src: "/images/hotel-morya-reception-lobby.png",
    caption: "Reception desk, lift lobby, and check-in counter",
    category: "Lobby",
    span: "col-span-1 row-span-1 aspect-square",
  },
  {
    src: "/images/hotel-morya-dormitory.png",
    caption: "Large group dormitory accommodating up to 50 pilgrims",
    category: "Dormitory",
    span: "col-span-1 sm:col-span-2 row-span-1 aspect-[2/1] sm:aspect-auto",
  },
  {
    src: "/images/hotel-morya-non-ac-room.png",
    caption: "Naturally ventilated, spotless non-AC room",
    category: "Rooms",
    span: "col-span-1 row-span-1 aspect-square",
  },
  {
    src: "/images/hotel-morya-washroom.png",
    caption: "Clean, hygienic attached washroom with 24/7 hot water",
    category: "Hygiene",
    span: "col-span-1 row-span-1 aspect-square",
  },
  {
    src: "/images/balumama-temple.jpg",
    caption: "Shri Sant Balumama Temple Admapur (just 200m away)",
    category: "Temple",
    span: "col-span-1 sm:col-span-2 row-span-1 aspect-[2/1] sm:aspect-auto",
  },
];

export function Gallery() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const close = () => setActiveIdx(null);

  const prev = useCallback(() => {
    if (activeIdx === null) return;
    setActiveIdx((prev) => (prev! - 1 + galleryItems.length) % galleryItems.length);
  }, [activeIdx]);

  const next = useCallback(() => {
    if (activeIdx === null) return;
    setActiveIdx((prev) => (prev! + 1) % galleryItems.length);
  }, [activeIdx]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeIdx === null) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIdx, next, prev]);

  return (
    <section id="gallery" className="relative overflow-hidden bg-background py-20 sm:py-28 lg:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <Reveal>
              <p className="eyebrow text-primary">
                <span className="eyebrow-line" />
                Visual Tour
              </p>
            </Reveal>
            <SplitHeading
              text="A closer look inside Hotel Morya Lodging."
              className="mt-4 font-display text-[clamp(2rem,4.2vw,3.15rem)] font-light leading-[1.08] text-foreground"
            />
          </div>
          <Reveal delay={0.1}>
            <p className="text-sm text-muted-foreground sm:text-right">
              Click any photograph to view in full resolution
            </p>
          </Reveal>
        </div>

        {/* Masonry / Grid */}
        <RevealGroup
          as="div"
          className="mt-12 grid grid-cols-2 gap-3 sm:mt-16 sm:grid-cols-4 sm:gap-4 auto-rows-[12rem] sm:auto-rows-[15rem]"
        >
          {galleryItems.map((item, idx) => (
            <motion.div
              key={item.src}
              variants={fadeUp}
              className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-muted ${item.span} cursor-pointer group`}
              onClick={() => setActiveIdx(idx)}
            >
              <Image
                src={item.src}
                alt={item.caption}
                fill
                sizes="(min-width: 1024px) 33vw, 50vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-106"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white opacity-0 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 group-hover:opacity-100">
                <span className="text-xs font-medium line-clamp-1">{item.caption}</span>
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Plus className="size-4" />
                </span>
              </div>
            </motion.div>
          ))}
        </RevealGroup>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 sm:p-8 backdrop-blur-md select-none"
            role="dialog"
            aria-modal="true"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={close}
              aria-label="Close image viewer"
              className="absolute top-5 right-5 z-50 inline-flex size-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            >
              <X className="size-6" />
            </button>

            {/* Prev button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 inline-flex size-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            >
              <ChevronLeft className="size-6" />
            </button>

            {/* Next button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 inline-flex size-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            >
              <ChevronRight className="size-6" />
            </button>

            {/* Main Image in Lightbox */}
            <motion.div
              key={activeIdx}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] max-w-5xl w-full flex flex-col items-center"
            >
              <div className="relative h-[65vh] sm:h-[75vh] w-full">
                <Image
                  src={galleryItems[activeIdx].src}
                  alt={galleryItems[activeIdx].caption}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
              <p className="mt-4 text-center text-sm font-medium text-white/80 max-w-xl">
                {galleryItems[activeIdx].caption}
              </p>
              <p className="mt-1 text-xs text-white/50">
                {activeIdx + 1} of {galleryItems.length}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
