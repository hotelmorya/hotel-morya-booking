# Hotel Morya Lodging · Admapur

A modern Next.js web application for **Hotel Morya Lodging**, situated just 200 metres from the sacred **Shri Sant Balumama Temple** in Admapur, Kolhapur, Maharashtra.

Upgraded to **Next.js 16 App Router**, **React 19**, **TypeScript 5**, **Tailwind CSS v4**, and **Framer Motion (`motion`)**.

---

## ✨ Adopted Features & Capabilities (Inspired by `hotel-triveni`)

- **Fluid Motion Engine**:
  - `Reveal` & `RevealGroup` with 6px blur resolution for smooth entrance transitions.
  - `SplitHeading` for dynamic word-by-word reveal on scroll.
  - `Counter` with spring physics for pilgrim statistics (200m to Temple, 24/7 Hot Water, 50+ Dormitory capacity).
  - `MagneticLink` tactile CTA buttons that subtly follow cursor movements on desktop.
  - `ParallaxAura` ambient radial glow wash shifting against scroll direction.
  - Subtle tactile SVG film grain overlay (`grain-overlay`).
- **Single Source of Truth (`src/lib/site.ts`)**:
  - Centralized contact numbers, WhatsApp URLs, GPS coordinates, room tiers, check-in/out policies, and addresses.
- **Dedicated Shri Balumama Temple Section**:
  - Highlighting the 200m (2-minute walk) proximity to the Samadhi Mandir.
  - Aarti and Mahaprasad timings, elderly convenience points, and genuine Admapur temple photography.
- **WhatsApp Direct Booking Engine**:
  - Instant click-to-chat inquiry generator pre-populating dates, room type, and guest count.
  - Floating WhatsApp pilgrim assistance desk button.
- **Fixed Sticky Navigation Bar (`SiteNav`)**:
  - Transparent at the top of the hero; smoothly acquires a blurred glass backdrop (`backdrop-blur-xl bg-zinc-950/90`) on scroll with an integrated scroll progress line and active section scrollspy.
- **Accommodation Showcase with One-Click Booking**:
  - Deluxe AC Rooms (₹1,500/night)
  - Comfort Non-AC Rooms (₹1,000/night)
  - Spacious 50-Person Group Dormitory (for pilgrim sanghas & palkhis)
  - Private Mini Hall (for family rituals, meetings & bhajan gatherings)
  - Clicking "Book This Room" automatically scrolls down and pre-selects the room choice.
- **Pilgrim Testimonials & Google Rating Badge**:
  - Honest 4.8★ rating badge with rotating devotee reviews.
- **Interactive Lightbox Gallery**:
  - Fullscreen photo viewer with keyboard navigation (`Escape`, `ArrowLeft`, `ArrowRight`) and touch controls.
- **Full-Width Interactive Map Embed**:
  - Google Map embed with 1-click GPS directions.
- **Developer Credit**:
  - Footer credit to Pravin Bagde with direct email link.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19
- **Motion & Animations**: `motion` (Framer Motion v12)
- **Styling**: Tailwind CSS v4 with OKLCH theme tokens & custom utilities
- **Icons**: Lucide React
- **Validation**: Zod
- **Backend / Database**: Next.js Server Actions + Supabase (`@supabase/supabase-js`)
- **Package Manager**: `pnpm`

---

## 📁 Project Architecture

```
src/
├── app/
│   ├── globals.css           # Tailwind v4 theme, grain-overlay, marquee keyframes
│   ├── layout.tsx            # Root layout with fonts, SEO & grain overlay
│   └── page.tsx              # Modular landing page orchestration
├── components/
│   ├── motion/
│   │   ├── magnetic-link.tsx # Cursor-following magnetic CTA link
│   │   ├── parallax.tsx      # ParallaxAura & ParallaxLayer
│   │   └── primitives.tsx    # Reveal, RevealGroup, SplitHeading, Counter
│   ├── sections/
│   │   ├── SiteNav.tsx       # Fixed header with scroll-aware glass background
│   │   ├── Hero.tsx          # Fullscreen slider with progress indicators
│   │   ├── About.tsx         # Story with spring count-up counters
│   │   ├── Temple.tsx        # Balumama Temple connection (200m) & authentic photos
│   │   ├── Accommodations.tsx# Room & dormitory cards with prefill triggers
│   │   ├── WhyUs.tsx         # Pilgrim amenities grid
│   │   ├── Gallery.tsx       # Masonry grid & keyboard-friendly lightbox
│   │   ├── Testimonials.tsx  # Google rating badge & rotating review quotes
│   │   ├── Contact.tsx       # Server action booking form & map embed
│   │   ├── SiteFooter.tsx    # Footer with maintained-by credit
│   │   └── FloatingWhatsApp.tsx # Floating instant pilgrim help widget
│   └── ui/                   # Reusable UI primitives
└── lib/
    ├── booking.actions.ts    # Next.js Server Action with Zod validation
    ├── site.ts               # Single source of truth for hotel data & contact
    └── utils.ts              # Classname merger (cn)
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables (Optional)
Create `.env.local`:
```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

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
