import type { Metadata, Viewport } from "next";
import { getLocale } from "next-intl/server";
import {
  Cormorant_Garamond,
  Manrope,
  Noto_Sans_Devanagari,
  Noto_Serif_Devanagari,
  JetBrains_Mono,
} from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-devanagari-serif",
  display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-devanagari-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-var",
  display: "swap",
});

const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://hotel-morya-booking.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl),
  title: "Hotel Morya Lodging | Stay Near Shri Balumama Temple, Admapur",
  description:
    "Stay at Hotel Morya Lodging in Admapur, Kolhapur, just 200 metres from Shri Balumama Temple. Explore AC rooms, non-AC rooms, and spacious dormitory stays.",
  keywords: [
    "Hotel Morya",
    "Hotel Morya Lodging",
    "Admapur Hotel",
    "Shri Balumama Temple Hotel",
    "Admapur Lodging",
    "Kolhapur Hotel",
    "Dormitory in Admapur",
    "Rooms near Balumama Temple",
  ],
  authors: [{ name: "Hotel Morya Lodging" }],
  openGraph: {
    title: "Hotel Morya Lodging | Admapur, Kolhapur",
    description:
      "A comfortable stay 200 metres from Shri Balumama Temple. Explore AC rooms, non-AC rooms, and group dormitory accommodation in Admapur.",
    url: appBaseUrl,
    siteName: "Hotel Morya Lodging",
    images: [
      {
        url: "/images/hotel-morya-exterior-02.png",
        width: 1672,
        height: 941,
        alt: "Hotel Morya Lodging Building in Admapur",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hotel Morya Lodging | Admapur, Kolhapur",
    description:
      "A comfortable stay 200 metres from Shri Balumama Temple. Explore AC rooms, non-AC rooms, and dormitory in Admapur.",
    images: ["/images/hotel-morya-exterior-02.png"],
  },

};

export const viewport: Viewport = {
  themeColor: "#57161b",
  width: "device-width",
  initialScale: 1,
};

const fontVars = [
  cormorant.variable,
  manrope.variable,
  notoSerifDevanagari.variable,
  notoSansDevanagari.variable,
  jetbrainsMono.variable,
].join(" ");

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning className={`${fontVars} scroll-smooth`}>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-hero-accent selection:text-hero-accent-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
