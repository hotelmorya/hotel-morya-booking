import type { MetadataRoute } from "next";
import { HOTEL } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${HOTEL.name} — Admapur, Kolhapur`,
    short_name: "Hotel Morya",
    description:
      "Comfortable AC & Non-AC rooms and spacious group dormitory just 200m from Shri Sant Balumama Temple in Admapur.",
    start_url: "/",
    display: "standalone",
    background_color: "#fcfaf5",
    theme_color: "#57161b",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        src: "/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
