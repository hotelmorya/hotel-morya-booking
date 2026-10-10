"use client";

import { useState } from "react";
import { SiteNav } from "@/components/sections/SiteNav";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Temple } from "@/components/sections/Temple";
import {
  Accommodations,
  type BackendRoomType,
} from "@/components/sections/Accommodations";
import { WhyUs } from "@/components/sections/WhyUs";
import {
  Gallery,
  type BackendGalleryItem,
} from "@/components/sections/Gallery";
import { Testimonials } from "@/components/sections/Testimonials";
import { Contact } from "@/components/sections/Contact";
import { SiteFooter } from "@/components/sections/SiteFooter";

interface HomePageClientProps {
  roomTypes: BackendRoomType[];
  galleryMedia: BackendGalleryItem[];
  hotelSettings: {
    phone?: string | null;
    phone_alt?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    check_in_time?: string | null;
    check_out_time?: string | null;
    address?: string | null;
  } | null;
}

export function HomePageClient({
  roomTypes,
  galleryMedia,
  hotelSettings,
}: HomePageClientProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    () => roomTypes[0]?.id || "10000000-0000-0000-0000-000000000002"
  );
  const [selectedRoomTitle, setSelectedRoomTitle] = useState<string>(
    () => roomTypes[0]?.name?.en || "Deluxe AC Rooms"
  );

  const handleSelectRoom = (roomId: string, roomTitle: string) => {
    setSelectedRoomId(roomId);
    setSelectedRoomTitle(roomTitle);
    const element = document.getElementById("book");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="light-scope relative min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <SiteNav />

      {/* 1. Fullscreen Hero Slider & Proximity */}
      <Hero />

      {/* 2. About Morya & Spring-animated Stats */}
      <About />

      {/* 3. Dedicated Shri Balumama Temple Section (200m) */}
      <Temple />

      {/* 4. Accommodations: AC, Non-AC & Dormitory (Live Database & Cloudinary) */}
      <Accommodations
        initialRoomTypes={roomTypes}
        onSelectRoom={handleSelectRoom}
      />

      {/* 5. Why Choose Us / Pilgrimage Amenities */}
      <WhyUs />

      {/* 6. Interactive Masonry Gallery & Lightbox (Live Cloudinary Media) */}
      <Gallery initialMedia={galleryMedia} />

      {/* 7. Pilgrim Testimonials & Google Rating Badge */}
      <Testimonials />

      {/* 8. Booking Form & Location Map (Live Availability & Rates) */}
      <Contact
        initialRoomTypes={roomTypes}
        selectedRoomId={selectedRoomId}
        selectedRoom={selectedRoomTitle}
        hotelSettings={hotelSettings}
      />

      {/* 9. Site Footer with Developer Credit */}
      <SiteFooter />
    </div>
  );
}
