import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://hotel-morya-booking.vercel.app"),
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
    url: "https://hotel-morya-booking.vercel.app",
    siteName: "Hotel Morya Lodging",
    images: [
      {
        url: "/images/hotel-morya-exterior-02.png",
        width: 1200,
        height: 630,
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
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#57161b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${cormorant.variable} ${manrope.variable} scroll-smooth`}>
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
