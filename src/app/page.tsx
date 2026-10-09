"use client";

import { useState } from "react";
import { SiteNav } from "@/components/sections/SiteNav";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Temple } from "@/components/sections/Temple";
import { Accommodations } from "@/components/sections/Accommodations";
import { WhyUs } from "@/components/sections/WhyUs";
import { Gallery } from "@/components/sections/Gallery";
import { Testimonials } from "@/components/sections/Testimonials";
import { Contact } from "@/components/sections/Contact";
import { SiteFooter } from "@/components/sections/SiteFooter";
import { FloatingWhatsApp } from "@/components/sections/FloatingWhatsApp";

export default function HomePage() {
  const [selectedRoom, setSelectedRoom] = useState<string>("Deluxe AC Rooms");

  const handleSelectRoom = (roomTitle: string) => {
    setSelectedRoom(roomTitle);
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

      {/* 4. Accommodations: AC, Non-AC & Dormitory */}
      <Accommodations onSelectRoom={handleSelectRoom} />

      {/* 5. Why Choose Us / Pilgrimage Amenities */}
      <WhyUs />

      {/* 6. Interactive Masonry Gallery & Lightbox */}
      <Gallery />

      {/* 7. Pilgrim Testimonials & Google Rating Badge */}
      <Testimonials />

      {/* 8. Booking Form & Location Map */}
      <Contact selectedRoom={selectedRoom} />

      {/* 9. Site Footer with Developer Credit */}
      <SiteFooter />

      {/* 10. Floating WhatsApp Quick Help */}
      <FloatingWhatsApp />
    </div>
  );
}
