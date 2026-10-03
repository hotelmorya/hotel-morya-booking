# Hotel Morya Lodging · Admapur

A Next.js web application for **Hotel Morya Lodging**, situated just 200 metres from the sacred **Shri Balumama Temple** in Admapur, Kolhapur, Maharashtra.

Converted and upgraded from TanStack Start / Vite into Next.js App Router with React 19, TypeScript, and Tailwind CSS v4.

---

## ✨ Features

- **Photo-Led Hero Slider**: Smooth interactive slideshow with custom indicators, auto-rotation with respect for `prefers-reduced-motion`, and temple-inspired branding.
- **Genuine Online Booking Inquiries**: Built using **Next.js Server Actions** (`submitBookingAction`) with Zod validation, bot honeypot protection, date integrity checks, and Supabase integration.
- **Accommodation Showcase**:
  - Deluxe AC Rooms
  - Comfortable Non-AC Rooms
  - Spacious Non-AC Dormitory for pilgrim groups & large families
- **Mini Hall Spotlight**: Dedicated section showcasing the mini hall for private gatherings, meetings, and family ceremonies in Admapur.
- **Interactive Lightbox Gallery**: Fullscreen image modal supporting keyboard navigation (`Escape`, `ArrowLeft`, `ArrowRight`) and touch-friendly controls.
- **Location & Google Maps Integration**: 1-click directions link directly to Hotel Morya Lodging in Admapur, Kolhapur.
- **High-Performance & SEO-Optimized**:
  - Zero-layout-shift Google fonts (`Cormorant Garamond` & `Manrope`) via `next/font/google`.
  - Next.js `<Image>` optimization with responsive srcsets and WebP support.
  - Complete OpenGraph, Twitter card, canonical tags, and Web App manifest.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4 with OKLCH theme tokens & custom utilities
- **Icons**: Lucide React
- **Validation**: Zod
- **Backend / Database**: Next.js Server Actions + Supabase (`@supabase/supabase-js`)
- **Package Manager**: `pnpm`

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables (Optional)

Create a `.env.local` file (or copy `.env.example`):

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

> **Note**: Even without Supabase keys configured, the booking inquiry system gracefully generates human-readable reference codes (e.g. `MORYA-XXXXXX`) so local development, testing, and previews work out of the box.

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
pnpm build
pnpm start
```
