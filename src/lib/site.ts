/**
 * Single source of truth for Hotel Morya Lodging business facts.
 */

export const HOTEL = {
  name: "Hotel Morya Lodging",
  slug: "hotel-morya",
  tagline: "Just 200m from Shri Sant Balumama Temple, Admapur",
  phones: ["7709995261", "9421114161"],
  whatsapp: "7709995261",
  email: "hotelmoryaadmapur@gmail.com",
  checkIn: "12:00 PM",
  checkOut: "11:00 AM",
  address: {
    street: "Near Shri Balumama Temple Gate",
    village: "Admapur",
    taluka: "Bhudarghad",
    district: "Kolhapur",
    state: "Maharashtra",
    postalCode: "416208",
    country: "IN",
  },
  geo: {
    lat: 16.4062602,
    lng: 74.1569327,
  },
  reviews: {
    rating: "4.8",
    count: "250",
  },
  stays: [
    {
      id: "ac-rooms",
      title: "Deluxe AC Rooms",
      tagline: "Cool & Peaceful Comfort",
      image: "/images/hotel-morya-ac-room.png",
      capacity: "2-4 Guests",
      description: "Air-conditioned private sanctuary with hot water, LED TV, and peaceful ambiance.",
      price: "₹1,500",
      priceNote: "night",
      features: ["Air Conditioning", "Attached Modern Bath", "24/7 Hot Water", "Clean Linens & Towels"],
    },
    {
      id: "non-ac-rooms",
      title: "Comfortable Non-AC Rooms",
      tagline: "Clean, Economical & Homely",
      image: "/images/hotel-morya-non-ac-room.png",
      capacity: "2-3 Guests",
      description: "Natural airflow, pristine hygiene, and tranquil surroundings for restful darshan visits.",
      price: "₹800",
      priceNote: "night",
      features: ["Ceiling Fan", "Attached Bathroom", "Continuous Geyser Water", "Room Service Support"],
    },
    {
      id: "dormitory",
      title: "Pilgrim Group Dormitory",
      tagline: "Spacious Accommodations",
      image: "/images/hotel-morya-dormitory.png",
      capacity: "10-25 Devotees",
      description: "Ample room for joint families and pilgrim groups visiting Shri Balumama Temple together.",
      price: "₹2,200",
      priceNote: "group / night",
      features: ["Individual Beds & Mattresses", "Multiple Attached Washrooms", "Separate Group Luggage Area", "Secure Gated Compound"],
    },
  ],
} as const;

export const CREDIT = {
  name: "Pravin Bagde",
  email: "pravin.b.0009@gmail.com",
} as const;

export const siteUrl = (
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const hotelName = process.env.NEXT_PUBLIC_HOTEL_NAME ?? HOTEL.name;

export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `tel:+91${digits.slice(-10)}`;
}

export function waHref(message?: string): string {
  const base = `https://wa.me/91${HOTEL.whatsapp}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}

export const directionsHref =
  "https://www.google.com/maps/search/?api=1&query=Hotel+Morya+Lodging+Admapur+Kolhapur+Maharashtra";

export const mapEmbedSrc =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3826.684157546684!2d74.15435777591632!3d16.406260184325785!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc05700778a4639%3A0xe543ef88d55fa242!2sHotel%20Morya%20Lodging!5e0!3m2!1sen!2sin!4v1718000000000!5m2!1sen!2sin";
