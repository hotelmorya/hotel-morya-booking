"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Check, MessageSquare, ArrowUpRight } from "lucide-react";
import { Reveal, RevealGroup, SplitHeading, fadeUp } from "@/components/motion/primitives";
import { HOTEL, waHref } from "@/lib/site";
import { buildCloudinaryUrl } from "@/lib/cloudinary";

export interface BackendRoomType {
  id: string;
  name: { en: string; mr?: string };
  description: { en: string; mr?: string };
  base_rate: number;
  max_guests: number;
  amenities: string[];
  sort_order: number;
  room_photos?: Array<{
    id: string;
    url?: string | null;
    public_id: string;
    is_primary?: boolean | null;
    caption?: string | null;
  }>;
}

interface AccommodationsProps {
  initialRoomTypes?: BackendRoomType[];
  onSelectRoom?: (roomTypeId: string, roomTitle: string) => void;
}

export function Accommodations({ initialRoomTypes, onSelectRoom }: AccommodationsProps) {
  const stays =
    initialRoomTypes && initialRoomTypes.length > 0
      ? initialRoomTypes.map((rt) => {
          const primaryPhoto =
            rt.room_photos?.find((p) => p.is_primary) || rt.room_photos?.[0];
          let imageSrc =
            primaryPhoto?.url ||
            (primaryPhoto?.public_id
              ? buildCloudinaryUrl(primaryPhoto.public_id, { width: 800 })
              : "");

          if (!imageSrc) {
            const lower = (rt.name.en || "").toLowerCase();
            if (lower.includes("dormitory"))
              imageSrc = "/images/hotel-morya-dormitory.png";
            else if (lower.includes("non-ac"))
              imageSrc = "/images/hotel-morya-non-ac-room.png";
            else imageSrc = "/images/hotel-morya-ac-room.png";
          }

          const isDorm =
            rt.max_guests > 5 ||
            (rt.name.en || "").toLowerCase().includes("dormitory");
          const tagline = isDorm
            ? "Spacious Accommodations"
            : (rt.name.en || "").toLowerCase().includes("non-ac")
            ? "Clean, Economical & Homely"
            : "Cool & Peaceful Comfort";

          return {
            id: rt.id,
            title: rt.name.en,
            tagline,
            image: imageSrc,
            capacity: isDorm
              ? `Up to ${rt.max_guests} Devotees`
              : `2-${rt.max_guests} Guests`,
            description:
              rt.description.en ||
              "Pristine, hygienic, and peaceful room for your pilgrimage stay.",
            price: `₹${Number(rt.base_rate).toLocaleString("en-IN")}`,
            priceNote: isDorm ? "group / night" : "night",
            features:
              rt.amenities && rt.amenities.length > 0
                ? rt.amenities
                : ["Attached Bath", "24/7 Hot Water", "Clean Linens"],
          };
        })
      : HOTEL.stays;
  return (
    <section id="accommodations" className="relative overflow-hidden bg-background py-20 sm:py-28 lg:py-32">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <Reveal>
            <p className="eyebrow text-primary">
              <span className="eyebrow-line" />
              Rest & Accommodations
            </p>
          </Reveal>
          <SplitHeading
            text="Clean, comfortable rooms thoughtfully prepared for your pilgrimage."
            className="mt-4 font-display text-[clamp(2rem,4.2vw,3.15rem)] font-light leading-[1.08] text-foreground"
          />
          <Reveal delay={0.1}>
            <p className="mt-4 text-base text-muted-foreground">
              Whether you are travelling as a couple, bringing children and grandparents, or arriving with a group of devotees, Hotel Morya Lodging offers pristine and economical stays.
            </p>
          </Reveal>
        </div>

        <RevealGroup
          as="div"
          className="mt-12 grid gap-8 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto"
        >
          {stays.map((stay) => (
            <motion.div
              key={stay.id}
              variants={fadeUp}
              className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5"
            >
              {/* Image banner */}
              <div>
                <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                  <Image
                    src={stay.image}
                    alt={stay.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                  />
                  <div className="absolute top-3 left-3 rounded-full bg-zinc-950/80 px-3 py-1 text-[0.65rem] font-bold tracking-wider uppercase text-white backdrop-blur-md">
                    {stay.capacity}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {stay.tagline}
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-normal text-foreground">
                    {stay.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {stay.description}
                  </p>

                  {/* Pricing */}
                  <div className="mt-4 flex items-baseline gap-1.5 border-t border-border/60 pt-4">
                    <span className="font-display text-2xl font-bold text-foreground">
                      {stay.price}
                    </span>
                    <span className="text-xs text-muted-foreground">/ {stay.priceNote}</span>
                  </div>

                  {/* Feature list */}
                  <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                    {stay.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="size-3.5 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 pt-0 flex flex-col gap-2">
                <a
                  href={`#book`}
                  onClick={() => onSelectRoom?.(stay.id, stay.title)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-xs transition hover:opacity-95"
                >
                  <span>Book This Room</span>
                  <ArrowUpRight className="size-3.5" />
                </a>

                <a
                  href={waHref(`Namaskar, I want to inquire about availability for ${stay.title} at Hotel Morya Lodging Admapur.`)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-xs font-semibold text-muted-foreground transition hover:border-[#25D366] hover:text-[#25D366]"
                >
                  <MessageSquare className="size-3.5" />
                  <span>Inquire on WhatsApp</span>
                </a>
              </div>
            </motion.div>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
