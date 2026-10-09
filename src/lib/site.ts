/**
 * Everything contactable, indexable, and configurable for Hotel Morya Lodging, Admapur.
 * Central single source of truth for the entire web application.
 */

const ORIGIN = "https://hotelmoryaadmapur.in";

export const HOTEL = {
  name: "Hotel Morya Lodging",
  tagline: "Your Sacred & Peaceful Stay in Admapur",
  origin: ORIGIN,

  // Direct contact numbers for booking desk
  phones: ["9822000000", "9422000000"] as const,

  // WhatsApp number (international format without + or spaces)
  whatsapp: "919822000000",

  templeDistance: "200 metres from Shri Balumama Temple",

  address: {
    street: "Near Shri Balumama Temple, Main Road",
    village: "Admapur",
    taluka: "Bhudargad",
    district: "Kolhapur",
    state: "Maharashtra",
    postalCode: "416208",
    country: "IN",
  },

  geo: { lat: 16.4061, lng: 74.1579 },

  checkIn: "10:00 AM",
  checkOut: "10:00 AM",

  // Review aggregate
  reviews: {
    rating: 4.8,
    count: 240,
  },

  amenities: [
    { title: "200m from Temple", desc: "Short 2-minute walk to Shri Sant Balumama Temple & Darshan" },
    { title: "24/7 Hot Water", desc: "Constant warm water for refreshing holy baths & morning snan" },
    { title: "Lift / Elevator", desc: "Smooth step-free access to all room floors for elderly devotees" },
    { title: "Inverter Power Backup", desc: "Uninterrupted lighting and ventilation throughout your stay" },
    { title: "Secure Parking", desc: "Spacious and safe parking space for cars, vans, and pilgrim buses" },
    { title: "24/7 Front Desk", desc: "Round-the-clock warm hospitality, late check-in support & local darshan guidance" },
  ],

  stays: [
    {
      id: "ac-rooms",
      title: "Deluxe AC Rooms",
      tagline: "Cool & Peaceful Retreat",
      price: "₹1,500",
      priceNote: "per night",
      capacity: "2-3 Guests",
      features: ["Split Air Conditioning", "King / Twin Bed", "Attached Bathroom", "24/7 Hot Water", "Daily Housekeeping"],
      image: "/images/hotel-morya-ac-room.png",
      description: "Rest comfortably in a cooled, serene atmosphere with plush bedding and modern hygiene.",
    },
    {
      id: "non-ac-rooms",
      title: "Comfort Non-AC Rooms",
      tagline: "Airy, Clean & Budget-Friendly",
      price: "₹1,000",
      priceNote: "per night",
      capacity: "2-3 Guests",
      features: ["Natural Ventilation & Fan", "Spacious Bedding", "Clean Attached Bath", "24/7 Hot Water", "Quiet Ambience"],
      image: "/images/hotel-morya-non-ac-room.png",
      description: "Well-ventilated and impeccably clean rooms tailored for pilgrims seeking wholesome rest.",
    },
    {
      id: "dormitory",
      title: "Spacious Group Dormitory",
      tagline: "Ideal for Pilgrim Groups & Palkhis",
      price: "₹250",
      priceNote: "per bed / person",
      capacity: "Up to 50 Guests",
      features: ["Clean Mattresses & Bedding", "Multiple Bathrooms", "Safe Luggage Storage", "Group Coordination", "Dedicated Floor"],
      image: "/images/hotel-morya-dormitory.png",
      description: "Economical and comfortable dormitory accommodation designed for family groups and devotee squads.",
    },
  ],
} as const;

export const CREDIT = {
  name: "Pravin Bagde",
  email: "pravin.b.0009@gmail.com",
} as const;

export const telHref = (phone: string) => `tel:+91${phone}`;

export const mailtoHref = (email: string) => `mailto:${email}`;

export const waHref = (message: string) =>
  `https://wa.me/${HOTEL.whatsapp}?text=${encodeURIComponent(message)}`;

export const directionsHref =
  "https://www.google.com/maps/search/?api=1&query=Hotel+Morya+Lodging+Admapur+Kolhapur+Maharashtra";

export const mapEmbedSrc =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15296.88339121966!2d74.148!3d16.406!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc0f9859f71c407%3A0x6a0a2df3d85d774a!2sAdmapur%2C%20Maharashtra%20416208!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin";
