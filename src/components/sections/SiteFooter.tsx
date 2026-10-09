import Image from "next/image";
import { MapPin, Phone, MessageSquare } from "lucide-react";
import { HOTEL, telHref, waHref, mailtoHref, CREDIT } from "@/lib/site";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/80 bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand info */}
          <div className="space-y-4">
            <div className="relative h-12 w-40">
              <Image
                src="/images/morya-logo.png"
                alt="Hotel Morya Lodging"
                fill
                className="object-contain object-left drop-shadow brightness-110"
              />
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              A serene and comfortable lodging situated just 200 metres from Shri Sant Balumama Temple in Admapur, Kolhapur.
            </p>
            <div className="pt-2">
              <a
                href={waHref("Namaskar, I want to inquire about staying at Hotel Morya Admapur.")}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#20bd5a]"
              >
                <MessageSquare className="size-3.5" />
                <span>Quick WhatsApp Inquiry</span>
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-2 text-xs text-zinc-400">
              <li>
                <a href="#about" className="hover:text-white transition">
                  About Hotel Morya
                </a>
              </li>
              <li>
                <a href="#temple" className="hover:text-white transition">
                  Shri Balumama Temple (200m)
                </a>
              </li>
              <li>
                <a href="#accommodations" className="hover:text-white transition">
                  AC & Non-AC Rooms
                </a>
              </li>
              <li>
                <a href="#accommodations" className="hover:text-white transition">
                  50+ Person Dormitory
                </a>
              </li>
              <li>
                <a href="#amenities" className="hover:text-white transition">
                  Amenities & Facilities
                </a>
              </li>
              <li>
                <a href="#gallery" className="hover:text-white transition">
                  Photo Gallery
                </a>
              </li>
            </ul>
          </div>

          {/* Temple information */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Temple Proximity
            </h4>
            <ul className="mt-4 space-y-2 text-xs text-zinc-400">
              <li className="flex items-start gap-2">
                <MapPin className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>2-minute walk (200m) to Temple Gate</span>
              </li>
              <li>Kakad Aarti: 5:30 AM</li>
              <li>Mahaprasad: 11:30 AM to 2:30 PM</li>
              <li>Sandhya Aarti: 7:30 PM</li>
              <li>Shej Aarti: 9:30 PM</li>
            </ul>
          </div>

          {/* Direct helpline */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Front Desk Contact
            </h4>
            <div className="mt-4 space-y-3 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 text-amber-400 shrink-0" />
                <div className="flex flex-col">
                  {HOTEL.phones.map((phone) => (
                    <a
                      key={phone}
                      href={telHref(phone)}
                      className="hover:text-white transition font-medium"
                    >
                      +91 {phone}
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {HOTEL.address.street}, {HOTEL.address.village}, Kolhapur, Maharashtra {HOTEL.address.postalCode}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Credits Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-zinc-500 sm:flex-row">
          <p>© {currentYear} Hotel Morya Lodging · All rights reserved.</p>
          <p>
            designed, developed & maintained by{" "}
            <a
              href={mailtoHref(CREDIT.email)}
              className="font-medium text-amber-300 hover:text-amber-200 underline decoration-amber-400/40 underline-offset-4 transition"
            >
              {CREDIT.name}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
