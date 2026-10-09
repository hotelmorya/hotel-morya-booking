# Hotel Morya Lodging — CLAUDE.md

> Property Management System (PMS) & Booking Engine
> Single-Tenant · Next.js 16 · Supabase · Cloudinary · Vercel

---

## 1. Project Identity

- **Property**: Hotel Morya Lodging
- **Location**: Near Shri Sant Balumama Temple Gate, Admapur, Kolhapur, Maharashtra 416208 (200m from temple).
- **Type**: Single-tenant lodge booking & administration management system (AC Rooms, Non-AC Rooms, Non-AC Group Dormitory).
- **Owner / Developer**: Pravin Bagde
- **Architecture**: Single-tenant deployment. One Next.js codebase, one isolated Supabase PostgreSQL instance, zero `hotel_id` columns.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Turbopack), TypeScript Strict |
| Database / Auth / Realtime | Supabase (PostgreSQL with RLS & Realtime) |
| Payments | Manual verification flow (Pay at Hotel + Scan UPI-QR). Confirmed by staff after verification call. |
| Media Storage | Cloudinary (Public photos & CDN) + Supabase Storage (Private RLS-protected guest ID proofs) |
| Email Service | Resend (Transactional booking confirmations, daily reminders & weekly backups) |
| UI & Design Tokens | Tailwind CSS v4 + Base UI / shadcn (base-nova). Lucide React + Tabler Icons. |
| Forms & Validation | React Hook Form + Zod v4 (single source of truth) |
| State Management | TanStack Query v5 (server state) + Zustand / React State |
| Reports & Exports | SheetJS (`xlsx`) for Excel reports and backups |

---

## 3. Core Architecture Invariants

1. **Single-Tenant**: Every hotel instance is completely isolated. No multi-tenant queries or `hotel_id` keys.
2. **5 Distinct Roles**:
   - `super_admin`: Developer oversight (filtered out of standard UI lists).
   - `admin`: Hotel owner with full control over settings, staff, finances, and rates.
   - `manager`: Operational management (rates, reports, bookings, rooms); cannot change core settings or users.
   - `receptionist`: Front desk operations (check-ins, check-outs, payments, room status). Revenue metrics and reports hidden.
   - `housekeeping`: Dedicated mobile-first view at `/admin/housekeeping`. Guest PII and financials stripped via RLS.
3. **IST Timezone (`Asia/Kolkata`) Everywhere**: All dates, check-in deadlines, and reporting intervals evaluate against Asia/Kolkata explicitly (`currentDateIST()`, `formatDateIST()`).
4. **Soft-Delete Only**: Rows are never destroyed (`deleted_at` + `deleted_by`).
5. **Activity Log is Canonical**: State mutations trigger append-only audit entries in `activity_log`.
6. **Room Assignment at Check-in**: Bookings reserve room types (`booking_rooms.room_type_id`); physical room numbers (`booking_rooms.room_id`) are assigned during check-in.
7. **5-Minute Soft Holds**: Concurrency protection for simultaneous room reservations via `booking_holds`.
8. **Optimistic Locking**: Mutations verify `updated_at` timestamps to avoid concurrent edits (409 Conflict).

---

## 4. Folder Structure

```
hotel-morya-booking/
├── src/
│   ├── app/
│   │   ├── (admin)/               # Protected Admin PMS routes
│   │   │   ├── layout.tsx         # Sidebar (desktop) + 5-tab bar (mobile) + header
│   │   │   └── admin/
│   │   │       ├── page.tsx       # Role-aware dashboard (KPIs, arrivals, departures, live mini-grid)
│   │   │       ├── bookings/      # List, detail [id], new walk-in, and printable receipt
│   │   │       ├── calendar/      # Interactive tape chart & visual holds lane
│   │   │       ├── rooms/         # Live room status grid & physical room CRUD
│   │   │       ├── room-types/    # Categories, pricing, amenities, photos
│   │   │       ├── rates/         # Base rates & festival date overrides
│   │   │       ├── guests/        # CRM directory, profile [id], ID proofs & merge
│   │   │       ├── reports/       # Revenue, occupancy, ADR, RevPAR, Excel export
│   │   │       ├── settings/      # Hotel info, policies, GST, staff users
│   │   │       ├── gallery/       # Curated gallery media management
│   │   │       └── help/          # Staff guide & documentation
│   │   ├── (hk)/
│   │   │   └── admin/housekeeping # Dedicated mobile cleaning queue & locks
│   │   ├── auth/                  # Staff login, reset password, confirmation
│   │   ├── api/                   # 28 REST route handlers for bookings, guests, reports...
│   │   └── layout.tsx             # Root layout with ThemeProvider and Toaster
│   ├── components/
│   │   ├── admin/                 # Modular admin UI components
│   │   ├── hk/                    # Housekeeping UI components
│   │   ├── shared/                # SideDrawer, SortableHead, PrintButton...
│   │   ├── ui/                    # Base UI / shadcn base-nova primitives
│   │   └── sections/              # Public landing page sections (Hotel Morya)
│   ├── hooks/                     # TanStack Query feature hooks
│   ├── lib/
│   │   ├── supabase/              # client.ts, server.ts, admin.ts, middleware.ts
│   │   ├── format.ts              # IST timezone & ₹ currency formatters
│   │   ├── room-status.ts         # Live derived room status calculation
│   │   ├── pricing.ts             # Seasonal rate resolution engine
│   │   ├── auto-cancel.ts         # Lazy expiration deadline calculation
│   │   └── site.ts                # Hotel Morya business facts
│   ├── schemas/                   # Zod v4 schemas for all entities
│   ├── types/database.ts          # Supabase generated database types
│   └── proxy.ts                   # Next.js 16 auth session & admin gate
├── supabase/
│   ├── bootstrap.sql              # Consolidated database migrations (17 tables, triggers, RLS)
│   └── seed.sql                   # Development / staging seed for Hotel Morya
└── components.json                # shadcn configuration
```

---

## 5. Live Room Statuses

Physical room statuses derive from booking states and cleaning locks:
- `available` (Green): Ready for occupancy.
- `arriving` (Cyan): Confirmed booking scheduled to arrive today.
- `occupied` (Purple): Guest checked in.
- `cleaning` (Amber): Vacated, awaiting or in cleaning.
- `repair` (Slate): Maintenance block active.

---

## 6. Database Setup Runbook

1. Create a fresh project on Supabase (ap-south-1).
2. Run `supabase/bootstrap.sql` in the Supabase SQL Editor.
3. (Optional for dev/staging) Run `supabase/seed.sql` to populate initial rooms and room types.
4. Create an admin user in Supabase Auth (e.g., `hotelmoryaadmapur@gmail.com`).
5. Insert a corresponding row in `public.users` with `role = 'admin'` and your `auth.users(id)`.
6. Add the credentials to `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
