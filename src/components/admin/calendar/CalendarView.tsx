'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Gauge, List, Rows3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { currentDateIST } from '@/lib/format'
import {
  useCalendar,
  type CalendarBooking,
  type CalendarRoomType,
  type CalendarHold,
} from '@/hooks/use-calendar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const DAY_WIDTH = 44 // px per day column
const HEADER_H = 44 // day / "Room" header row
const BAND_H = 32 // room-type band
const HOLDS_H = 28 // holds lane row
const LANE_H = 24 // a single booking bar
const LANE_GAP = 4 // gap between stacked bars
const ROW_VPAD = 8 // top+bottom padding inside a room row
const ROW_MIN = 40 // min height of an empty room row

// ---------------------------------------------------------------------------
// Date helpers (module-level, not exported)
// ---------------------------------------------------------------------------

function getMonthWindow(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function getDaysInWindow(from: string, to: string): string[] {
  const days: string[] = []
  const cur = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')
  while (cur <= end) {
    days.push(cur.toLocaleDateString('en-CA'))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function dayOffset(date: string, from: string): number {
  return Math.round(
    (new Date(date + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86_400_000,
  )
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(
    1,
    Math.round(
      (new Date(checkOut + 'T00:00:00').getTime() - new Date(checkIn + 'T00:00:00').getTime()) /
        86_400_000,
    ),
  )
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

function weekday2(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
}

function isWeekendDay(date: string): boolean {
  const d = new Date(date + 'T00:00:00').getDay()
  return d === 0 || d === 6
}

// Days that fill a month grid: from the Monday on/before the 1st to the Sunday
// on/after the last day (so weeks are whole rows). Leading/trailing days belong
// to adjacent months and render muted.
function buildMonthGridDays(year: number, month: number): string[] {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const startDow = (first.getDay() + 6) % 7 // 0 = Monday
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - startDow)
  const endDow = (last.getDay() + 6) % 7
  const gridEnd = new Date(last)
  gridEnd.setDate(last.getDate() + (6 - endDow))

  const days: string[] = []
  const cur = new Date(gridStart)
  while (cur <= gridEnd) {
    days.push(cur.toLocaleDateString('en-CA'))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function chunkWeeks<T>(days: T[]): T[][] {
  const weeks: T[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-CA')
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ---------------------------------------------------------------------------
// Lane packing — greedy interval scheduling so overlapping bookings on the
// same room stack into separate rows instead of painting on top of each other.
// ---------------------------------------------------------------------------

type Span = { startOff: number; endOff: number }

function packLanes<T extends Span>(items: T[]): { items: Array<T & { lane: number }>; lanes: number } {
  const sorted = [...items].sort((a, b) => a.startOff - b.startOff || a.endOff - b.endOff)
  const laneEnds: number[] = []
  const placed = sorted.map((it) => {
    let lane = laneEnds.findIndex((end) => end <= it.startOff)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(it.endOff)
    } else {
      laneEnds[lane] = it.endOff
    }
    return { ...it, lane }
  })
  return { items: placed, lanes: Math.max(1, laneEnds.length) }
}

// ---------------------------------------------------------------------------
// Status class lookup — static strings only, no dynamic construction
// ---------------------------------------------------------------------------

const BAR_CLASSES: Record<string, string> = {
  pending:
    'bg-booking-pending-bg text-booking-pending-text border border-booking-pending-border',
  confirmed:
    'bg-booking-confirmed-bg text-booking-confirmed-text border border-booking-confirmed-border',
  checked_in:
    'bg-booking-checkedin-bg text-booking-checkedin-text border border-booking-checkedin-border',
  checked_out:
    'bg-booking-checkedout-bg text-booking-checkedout-text border border-booking-checkedout-border',
  cancelled:
    'bg-booking-cancelled-bg text-booking-cancelled-text border border-booking-cancelled-border',
  not_arrived:
    'bg-booking-checkedout-bg text-booking-checkedout-text border border-booking-checkedout-border',
}

// Solid accent (left stripe + legend dot) — the one place color is saturated.
const STATUS_SOLID: Record<string, string> = {
  pending: 'bg-booking-pending',
  confirmed: 'bg-booking-confirmed',
  checked_in: 'bg-booking-checkedin',
  checked_out: 'bg-booking-checkedout',
  cancelled: 'bg-booking-cancelled',
  not_arrived: 'bg-booking-checkedout',
}

const HOLD_BAR_CLASSES =
  'bg-booking-hold-bg text-booking-hold-text border border-dashed border-booking-hold-border'

function statusLabel(status: string): string {
  return status.replace('_', ' ')
}

// ---------------------------------------------------------------------------
// Router prop type
// ---------------------------------------------------------------------------

type RouterProp = { push: (href: string) => void }

// ---------------------------------------------------------------------------
// CalendarNav
// ---------------------------------------------------------------------------

type CalendarNavProps = {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

function CalendarNav({ label, onPrev, onNext, onToday }: CalendarNavProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon-sm" onClick={onPrev} aria-label="Previous month">
        <ChevronLeft className="size-4" />
      </Button>
      <h2 className="text-base font-semibold min-w-36 text-center tabular-nums">{label}</h2>
      <Button variant="outline" size="icon-sm" onClick={onNext} aria-label="Next month">
        <ChevronRight className="size-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={onToday} className="ml-2">
        Today
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

const LEGEND: Array<{ label: string; cls: string }> = [
  { label: 'Confirmed', cls: 'bg-booking-confirmed' },
  { label: 'Checked-in', cls: 'bg-booking-checkedin' },
  { label: 'Pending', cls: 'bg-booking-pending' },
  { label: 'Checked-out', cls: 'bg-booking-checkedout' },
  { label: 'Cancelled', cls: 'bg-booking-cancelled' },
]

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-xs text-muted-foreground">
      {LEGEND.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className={cn('size-2.5 rounded-full', i.cls)} />
          {i.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full border border-dashed border-booking-hold-border bg-booking-hold-bg" />
        Hold
      </span>
      <span className="ml-auto hidden items-center gap-1.5 sm:flex">
        <span className="inline-block h-3 w-1.5 rounded-sm bg-primary/30 ring-1 ring-primary/40" />
        Today
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TapeChart (desktop) — precomputes a section model so the left label column
// and the right grid stay height-aligned even with stacked (lane) rows.
// ---------------------------------------------------------------------------

type TapeChartProps = {
  roomTypes: CalendarRoomType[]
  bookings: CalendarBooking[]
  holds: CalendarHold[]
  days: string[]
  from: string
  today: string
  router: RouterProp
}

function TapeChart({ roomTypes, bookings, holds, days, from, today, router }: TapeChartProps) {
  const totalDays = days.length
  const totalWidth = totalDays * DAY_WIDTH
  const todayOff = dayOffset(today, from)

  // Land on today (with a day of lead-in) instead of day 1 — matters most on
  // mobile, where only a few day columns are visible at once.
  const scrollRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft =
      todayOff >= 0 && todayOff < totalDays ? Math.max(0, (todayOff - 1) * DAY_WIDTH) : 0
  }, [todayOff, totalDays])

  function geom(checkIn: string, checkOut: string) {
    const startOff = Math.max(0, dayOffset(checkIn, from))
    const endOff = Math.min(totalDays, dayOffset(checkOut, from))
    if (startOff >= endOff) return null
    return { startOff, endOff, left: startOff * DAY_WIDTH, width: (endOff - startOff) * DAY_WIDTH }
  }

  // Build the render model once.
  const sections = roomTypes.map((rt) => {
    const heldGeom = holds
      .filter((h) => h.room_type_id === rt.id)
      .map((h) => {
        const g = geom(h.check_in, h.check_out)
        return g ? { ...h, ...g } : null
      })
      .filter((x): x is CalendarHold & Span & { left: number; width: number } => x !== null)
    const holdPack = packLanes(heldGeom)
    const hasHolds = holdPack.items.length > 0
    const holdsHeight = hasHolds ? Math.max(HOLDS_H, holdPack.lanes * 18 + 6) : 0

    const rooms = rt.rooms.map((room) => {
      const bkGeom = bookings
        .filter((b) => b.room_id === room.id)
        .map((b) => {
          const g = geom(b.check_in, b.check_out)
          return g ? { ...b, ...g } : null
        })
        .filter((x): x is CalendarBooking & Span & { left: number; width: number } => x !== null)
      const pack = packLanes(bkGeom)
      const height = Math.max(ROW_MIN, pack.lanes * LANE_H + (pack.lanes - 1) * LANE_GAP + ROW_VPAD)
      return { room, bookings: pack.items, height }
    })

    return { rt, rooms, hasHolds, holds: holdPack.items, holdsHeight }
  })

  return (
    <TooltipProvider>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex max-h-[calc(100vh-13rem)] overflow-y-auto">
          {/* Left: sticky room labels */}
          <div className="sticky left-0 z-20 w-24 min-w-24 flex-shrink-0 border-r bg-card sm:w-36 sm:min-w-36">
            <div
              className="sticky top-0 z-10 flex items-center border-b bg-card px-3 text-xs font-medium text-muted-foreground"
              style={{ height: HEADER_H }}
            >
              Room
            </div>
            {sections.map((s) => (
              <div key={s.rt.id}>
                <div
                  className="flex items-center border-b bg-muted/60 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ height: BAND_H }}
                >
                  <span className="truncate">{s.rt.name}</span>
                </div>
                {s.hasHolds && (
                  <div
                    className="flex items-center border-b px-3 text-[11px] italic text-muted-foreground"
                    style={{ height: s.holdsHeight }}
                  >
                    Holds
                  </div>
                )}
                {s.rooms.map((r) => (
                  <div
                    key={r.room.id}
                    className="flex items-center justify-between gap-1 border-b px-3"
                    style={{ height: r.height }}
                  >
                    <span className="text-sm font-medium tabular-nums">{r.room.room_number}</span>
                    {r.bookings.length > 0 && (
                      <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                        {r.bookings.length}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right: scrollable day grid */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto">
            <div style={{ width: totalWidth }}>
              {/* Day header */}
              <div
                className="sticky top-0 z-10 flex border-b bg-card"
                style={{ height: HEADER_H }}
              >
                {days.map((day) => {
                  const isToday = day === today
                  const weekend = isWeekendDay(day)
                  return (
                    <div
                      key={day}
                      className={cn(
                        'flex flex-col items-center justify-center border-r border-border/60 leading-none last:border-r-0',
                        isToday
                          ? 'bg-primary text-primary-foreground'
                          : weekend
                            ? 'bg-muted/40 text-muted-foreground'
                            : 'text-muted-foreground',
                      )}
                      style={{ width: DAY_WIDTH }}
                    >
                      <span className="text-[10px] uppercase opacity-80">{weekday2(day)}</span>
                      <span className="mt-0.5 text-xs font-semibold tabular-nums">
                        {Number(day.split('-')[2])}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Grid body: a single background column layer + the section rows on top */}
              <div className="relative">
                <div className="absolute inset-0 z-0 flex">
                  {days.map((day) => {
                    const isToday = day === today
                    const weekend = isWeekendDay(day)
                    return (
                      <div
                        key={day}
                        className={cn(
                          'h-full border-r border-border/40 last:border-r-0',
                          isToday ? 'bg-primary/5' : weekend ? 'bg-muted/20' : '',
                        )}
                        style={{ width: DAY_WIDTH }}
                      />
                    )
                  })}
                </div>

                <div className="relative z-10">
                  {sections.map((s) => (
                    <div key={s.rt.id}>
                      {/* type band (opaque — covers the column layer) */}
                      <div className="border-b bg-muted/60" style={{ height: BAND_H }} />

                      {/* holds lane (only when this type has active holds) */}
                      {s.hasHolds && (
                        <div className="relative border-b" style={{ height: s.holdsHeight }}>
                          {s.holds.map((hold) => {
                            const expires = new Date(hold.expires_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                            return (
                              <Tooltip key={hold.id}>
                                <TooltipTrigger
                                  className={cn(
                                    'absolute flex items-center overflow-hidden rounded px-1 text-[11px]',
                                    HOLD_BAR_CLASSES,
                                  )}
                                  style={{
                                    left: hold.left,
                                    width: hold.width,
                                    top: 4 + hold.lane * 18,
                                    height: 14,
                                  }}
                                  render={<div />}
                                >
                                  <span className="truncate">Hold</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-0.5 text-xs">
                                    <div className="font-medium">Active hold</div>
                                    <div>
                                      {hold.check_in} – {hold.check_out}
                                    </div>
                                    <div className="text-muted-foreground">Expires {expires}</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      )}

                      {/* room rows */}
                      {s.rooms.map((r) => (
                        <div
                          key={r.room.id}
                          className="relative border-b"
                          style={{ height: r.height }}
                        >
                          {r.bookings.map((booking) => {
                            const barCls = BAR_CLASSES[booking.status] ?? BAR_CLASSES.confirmed
                            const solidCls = STATUS_SOLID[booking.status] ?? STATUS_SOLID.confirmed
                            const isDayUse = booking.stay_type === 'day_use'
                            const top = ROW_VPAD / 2 + booking.lane * (LANE_H + LANE_GAP)
                            return (
                              <Tooltip key={booking.booking_id + booking.room_id}>
                                <TooltipTrigger
                                  className={cn(
                                    'absolute flex cursor-pointer items-center gap-1 overflow-hidden rounded-md pl-2.5 pr-1.5 text-xs font-medium shadow-sm transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                    barCls,
                                  )}
                                  style={{
                                    left: booking.left,
                                    width: booking.width,
                                    top,
                                    height: LANE_H,
                                  }}
                                  onClick={() => router.push('/admin/bookings/' + booking.booking_id)}
                                >
                                  <span
                                    className={cn('absolute inset-y-0 left-0 w-1', solidCls)}
                                    aria-hidden
                                  />
                                  {isDayUse && <Clock className="size-3 shrink-0" />}
                                  <span className="truncate">{booking.guest_name}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-0.5 text-xs">
                                    <div className="font-semibold">{booking.booking_ref}</div>
                                    <div>{booking.guest_name}</div>
                                    <div>
                                      {booking.check_in} – {booking.check_out}
                                      {!isDayUse && (
                                        <span className="text-muted-foreground">
                                          {' '}
                                          · {nightsBetween(booking.check_in, booking.check_out)}n
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 capitalize">
                                      <span className={cn('size-2 rounded-full', solidCls)} />
                                      {isDayUse ? 'Day use' : statusLabel(booking.status)}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

// ---------------------------------------------------------------------------
// MonthGrid (desktop, Google-Calendar-style month view)
// ---------------------------------------------------------------------------

const MONTH_BAR_H = 18
const MONTH_BAR_GAP = 3
const MONTH_MAX_LANES = 3
const MONTH_DATE_ROW_H = 24
const MONTH_CELL_MIN_H = MONTH_DATE_ROW_H + MONTH_MAX_LANES * (MONTH_BAR_H + MONTH_BAR_GAP) + 20

type UniqueBooking = {
  booking_id: string
  booking_ref: string
  guest_name: string
  check_in: string
  check_out: string
  status: string
  stay_type: string
  rooms: number
}

// Collapse booking-rooms into one entry per booking (a multi-room booking is one bar).
function dedupeBookings(bookings: CalendarBooking[]): UniqueBooking[] {
  const map = new Map<string, UniqueBooking>()
  for (const b of bookings) {
    const e = map.get(b.booking_id)
    if (e) {
      e.rooms += 1
      continue
    }
    map.set(b.booking_id, {
      booking_id: b.booking_id,
      booking_ref: b.booking_ref,
      guest_name: b.guest_name,
      check_in: b.check_in,
      check_out: b.check_out,
      status: b.status,
      stay_type: b.stay_type,
      rooms: 1,
    })
  }
  return [...map.values()]
}

type MonthGridProps = {
  bookings: CalendarBooking[]
  year: number
  month: number
  today: string
  router: RouterProp
}

function MonthGrid({ bookings, year, month, today, router }: MonthGridProps) {
  const unique = dedupeBookings(bookings)
  const weeks = chunkWeeks(buildMonthGridDays(year, month))

  return (
    <TooltipProvider>
      <div className="overflow-hidden rounded-xl border bg-card">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {WEEKDAY_LABELS.map((w) => (
            <div
              key={w}
              className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {w}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weeks.map((week) => {
          const weekStart = week[0]
          const weekEnd = week[6]

          const segments = unique
            .map((b) => {
              const lastNight = addDays(b.check_out, -1) // last in-house day (checkout is departure)
              if (b.check_in > weekEnd || lastNight < weekStart) return null
              const segStart = b.check_in < weekStart ? weekStart : b.check_in
              const segEndDay = lastNight > weekEnd ? weekEnd : lastNight
              const startCol = dayOffset(segStart, weekStart)
              const endCol = dayOffset(segEndDay, weekStart)
              if (startCol > endCol) return null
              return {
                b,
                startOff: startCol,
                endOff: endCol + 1,
                startCol,
                endCol,
                continuesLeft: b.check_in < weekStart,
                continuesRight: lastNight > weekEnd,
              }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)

          const packed = packLanes(segments)
          const overflow = new Array(7).fill(0) as number[]
          for (const it of packed.items) {
            if (it.lane >= MONTH_MAX_LANES) {
              for (let c = it.startCol; c <= it.endCol; c++) overflow[c] += 1
            }
          }
          const visible = packed.items.filter((it) => it.lane < MONTH_MAX_LANES)

          return (
            <div
              key={weekStart}
              className="relative border-b last:border-b-0"
              style={{ minHeight: MONTH_CELL_MIN_H }}
            >
              {/* Background day cells */}
              <div className="grid grid-cols-7">
                {week.map((day) => {
                  const inMonth = Number(day.split('-')[1]) === month
                  const isToday = day === today
                  const weekend = isWeekendDay(day)
                  return (
                    <div
                      key={day}
                      className={cn(
                        'border-r px-1.5 pt-1 last:border-r-0',
                        !inMonth && 'bg-muted/20',
                        weekend && inMonth && 'bg-muted/10',
                      )}
                      style={{ minHeight: MONTH_CELL_MIN_H }}
                    >
                      <span
                        className={cn(
                          'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs tabular-nums',
                          isToday
                            ? 'bg-primary font-semibold text-primary-foreground'
                            : inMonth
                              ? 'text-foreground'
                              : 'text-muted-foreground/50',
                        )}
                      >
                        {Number(day.split('-')[2])}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Events overlay */}
              <div
                className="pointer-events-none absolute inset-x-0"
                style={{ top: MONTH_DATE_ROW_H }}
              >
                {visible.map((it) => {
                  const left = (it.startCol / 7) * 100
                  const width = ((it.endCol - it.startCol + 1) / 7) * 100
                  const top = it.lane * (MONTH_BAR_H + MONTH_BAR_GAP)
                  const barCls = BAR_CLASSES[it.b.status] ?? BAR_CLASSES.confirmed
                  const solidCls = STATUS_SOLID[it.b.status] ?? STATUS_SOLID.confirmed
                  const isDayUse = it.b.stay_type === 'day_use'
                  return (
                    <Tooltip key={it.b.booking_id + weekStart}>
                      <TooltipTrigger
                        className={cn(
                          'pointer-events-auto absolute flex cursor-pointer items-center gap-1 overflow-hidden px-1.5 text-[11px] font-medium transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                          barCls,
                          it.continuesLeft ? 'rounded-l-none border-l-0' : 'rounded-l-md',
                          it.continuesRight ? 'rounded-r-none border-r-0' : 'rounded-r-md',
                        )}
                        style={{
                          left: `calc(${left}% + 3px)`,
                          width: `calc(${width}% - 6px)`,
                          top,
                          height: MONTH_BAR_H,
                        }}
                        onClick={() => router.push('/admin/bookings/' + it.b.booking_id)}
                      >
                        <span className={cn('size-1.5 shrink-0 rounded-full', solidCls)} aria-hidden />
                        {isDayUse && <Clock className="size-3 shrink-0" />}
                        <span className="truncate">{it.b.guest_name}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-0.5 text-xs">
                          <div className="font-semibold">{it.b.booking_ref}</div>
                          <div>{it.b.guest_name}</div>
                          <div>
                            {it.b.check_in} – {it.b.check_out}
                            {!isDayUse && (
                              <span className="text-muted-foreground">
                                {' '}
                                · {nightsBetween(it.b.check_in, it.b.check_out)}n
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 capitalize">
                            <span className={cn('size-2 rounded-full', solidCls)} />
                            {isDayUse ? 'Day use' : statusLabel(it.b.status)}
                            {it.b.rooms > 1 && (
                              <span className="text-muted-foreground">· {it.b.rooms} rooms</span>
                            )}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}

                {/* +N more per day */}
                {overflow.map((n, c) =>
                  n > 0 ? (
                    <span
                      key={'more-' + c}
                      className="absolute whitespace-nowrap text-[11px] font-medium text-muted-foreground"
                      style={{
                        left: `calc(${(c / 7) * 100}% + 6px)`,
                        top: MONTH_MAX_LANES * (MONTH_BAR_H + MONTH_BAR_GAP),
                      }}
                    >
                      +{n}
                      <span className="hidden sm:inline"> more</span>
                    </span>
                  ) : null,
                )}
              </div>
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

// ---------------------------------------------------------------------------
// OccupancyView (desktop) — month heatmap of how full the hotel is each night.
// Counts committed room-nights (one booking-row = one reserved room of its type,
// matching reports occupancy) against total physical rooms.
// ---------------------------------------------------------------------------

const OCC_STATUSES = new Set(['confirmed', 'checked_in', 'checked_out'])

function occBucket(ratio: number): { bg: string; strong: boolean } {
  if (ratio <= 0) return { bg: 'bg-muted/30', strong: false }
  if (ratio < 0.2) return { bg: 'bg-primary/10', strong: false }
  if (ratio < 0.4) return { bg: 'bg-primary/25', strong: false }
  if (ratio < 0.6) return { bg: 'bg-primary/40', strong: false }
  if (ratio < 0.8) return { bg: 'bg-primary/60', strong: true }
  if (ratio < 1) return { bg: 'bg-primary/75', strong: true }
  return { bg: 'bg-primary', strong: true }
}

type OccupancyViewProps = {
  roomTypes: CalendarRoomType[]
  bookings: CalendarBooking[]
  year: number
  month: number
  today: string
}

function OccupancyView({ roomTypes, bookings, year, month, today }: OccupancyViewProps) {
  const totalRooms = roomTypes.reduce((sum, rt) => sum + rt.rooms.length, 0)
  const committed = bookings.filter((b) => OCC_STATUSES.has(b.status))
  const weeks = chunkWeeks(buildMonthGridDays(year, month))

  function occupiedOn(day: string): number {
    let n = 0
    for (const b of committed) if (b.check_in <= day && day < b.check_out) n += 1
    return n
  }

  return (
    <TooltipProvider>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {WEEKDAY_LABELS.map((w) => (
            <div
              key={w}
              className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {w}
            </div>
          ))}
        </div>

        {weeks.map((week) => (
          <div key={week[0]} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map((day) => {
              const inMonth = Number(day.split('-')[1]) === month
              const isToday = day === today
              const occ = inMonth ? occupiedOn(day) : 0
              const ratio = totalRooms > 0 ? Math.min(1, occ / totalRooms) : 0
              const { bg, strong } = inMonth ? occBucket(ratio) : { bg: 'bg-muted/20', strong: false }
              const pct = Math.round((totalRooms > 0 ? occ / totalRooms : 0) * 100)
              return (
                <Tooltip key={day}>
                  <TooltipTrigger
                    className={cn(
                      'flex min-h-20 flex-col items-center border-r px-1 pt-1.5 pb-2 text-center last:border-r-0',
                      bg,
                      strong && 'text-primary-foreground',
                    )}
                    render={<div />}
                  >
                    <span
                      className={cn(
                        'inline-flex h-5 min-w-5 items-center justify-center self-start rounded-full px-1 text-xs tabular-nums',
                        isToday
                          ? 'bg-primary font-semibold text-primary-foreground'
                          : inMonth
                            ? strong
                              ? 'text-primary-foreground'
                              : 'text-foreground'
                            : 'text-muted-foreground/50',
                      )}
                    >
                      {Number(day.split('-')[2])}
                    </span>
                    {inMonth && totalRooms > 0 && (
                      <div className="mt-auto pt-1">
                        <div className="text-base font-semibold tabular-nums leading-none">{pct}%</div>
                        <div
                          className={cn(
                            'mt-0.5 text-[10px] tabular-nums',
                            strong ? 'text-primary-foreground/80' : 'text-muted-foreground',
                          )}
                        >
                          {occ}/{totalRooms}
                        </div>
                      </div>
                    )}
                  </TooltipTrigger>
                  {inMonth && totalRooms > 0 && (
                    <TooltipContent>
                      <div className="space-y-0.5 text-xs">
                        <div className="font-medium">
                          {new Date(day + 'T00:00:00').toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                        <div>
                          {occ} of {totalRooms} rooms booked · {pct}%
                        </div>
                        {occ >= totalRooms && <div className="font-medium text-primary">Full</div>}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  )
}

function HeatLegend() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>Empty</span>
      <span className="size-3 rounded-sm border bg-muted/30" />
      <span className="size-3 rounded-sm bg-primary/25" />
      <span className="size-3 rounded-sm bg-primary/40" />
      <span className="size-3 rounded-sm bg-primary/60" />
      <span className="size-3 rounded-sm bg-primary/75" />
      <span className="size-3 rounded-sm bg-primary" />
      <span>Full</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ViewToggle — segmented Month / Occupancy / Agenda / Rooms switch
// ---------------------------------------------------------------------------

type CalendarViewMode = 'month' | 'occupancy' | 'agenda' | 'tape'

function ViewToggle({
  view,
  onChange,
}: {
  view: CalendarViewMode
  onChange: (v: CalendarViewMode) => void
}) {
  const options: Array<{ value: CalendarViewMode; label: string; Icon: typeof CalendarDays }> = [
    { value: 'month', label: 'Month', Icon: CalendarDays },
    { value: 'occupancy', label: 'Occupancy', Icon: Gauge },
    { value: 'agenda', label: 'Agenda', Icon: List },
    { value: 'tape', label: 'Rooms', Icon: Rows3 },
  ]
  return (
    <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={view === value}
          aria-label={label}
          title={label}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
            view === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-4 sm:size-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MobileCalendar (mobile)
// ---------------------------------------------------------------------------

type MobileCalendarProps = {
  roomTypes: CalendarRoomType[]
  bookings: CalendarBooking[]
  days: string[]
  today: string
  router: RouterProp
}

// One card per booking (not per booking-room) — a multi-room booking collapses
// into a single entry that lists its rooms.
type MobileEntry = {
  booking_id: string
  booking_ref: string
  guest_name: string
  check_in: string
  check_out: string
  status: string
  stay_type: string
  rooms: string[]
  types: Set<string>
}

function roomSummary(e: MobileEntry): string {
  if (e.rooms.length > 0) {
    const sorted = [...e.rooms].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    const shown = sorted.slice(0, 4).join(', ')
    const more = sorted.length > 4 ? ` +${sorted.length - 4}` : ''
    return `${sorted.length === 1 ? 'Room' : `${sorted.length} rooms ·`} ${shown}${more}`
  }
  const types = [...e.types]
  return types.length > 0 ? `${types.join(', ')} · to assign` : 'Room to assign'
}

function MobileCalendar({ roomTypes, bookings, today, router }: MobileCalendarProps) {
  const roomNumById = new Map<string, string>()
  const typeNameById = new Map<string, string>()
  for (const rt of roomTypes) {
    typeNameById.set(rt.id, rt.name)
    for (const r of rt.rooms) roomNumById.set(r.id, r.room_number)
  }

  // Group arrivals by check_in date, then collapse booking-rooms into one entry.
  const byDate = new Map<string, Map<string, MobileEntry>>()
  for (const b of bookings) {
    let dateMap = byDate.get(b.check_in)
    if (!dateMap) {
      dateMap = new Map()
      byDate.set(b.check_in, dateMap)
    }
    let entry = dateMap.get(b.booking_id)
    if (!entry) {
      entry = {
        booking_id: b.booking_id,
        booking_ref: b.booking_ref,
        guest_name: b.guest_name,
        check_in: b.check_in,
        check_out: b.check_out,
        status: b.status,
        stay_type: b.stay_type,
        rooms: [],
        types: new Set(),
      }
      dateMap.set(b.booking_id, entry)
    }
    const roomNum = b.room_id ? roomNumById.get(b.room_id) : undefined
    if (roomNum) entry.rooms.push(roomNum)
    else entry.types.add(typeNameById.get(b.room_type_id) ?? 'Room')
  }
  const sortedDays = [...byDate.keys()].sort()

  if (sortedDays.length === 0) {
    return (
      <div className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">
        No arrivals this month.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {sortedDays.map((day) => {
        const entries = [...byDate.get(day)!.values()]
        return (
          <div key={day}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  'text-sm font-semibold',
                  day === today ? 'text-primary' : 'text-foreground',
                )}
              >
                {new Date(day + 'T00:00:00').toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
                {day === today && ' · Today'}
              </span>
              <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                {entries.length}
              </span>
            </div>
            <div className="space-y-2">
              {entries.map((entry) => {
                const solidCls = STATUS_SOLID[entry.status] ?? STATUS_SOLID.confirmed
                const isDayUse = entry.stay_type === 'day_use'
                const nights = nightsBetween(entry.check_in, entry.check_out)
                return (
                  <button
                    key={entry.booking_id}
                    className="flex w-full items-stretch overflow-hidden rounded-lg border bg-card text-left transition-colors hover:bg-muted/50"
                    onClick={() => router.push('/admin/bookings/' + entry.booking_id)}
                  >
                    <span className={cn('w-1.5 shrink-0', solidCls)} aria-hidden />
                    <div className="flex flex-1 items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          {isDayUse && <Clock className="size-3 shrink-0 text-muted-foreground" />}
                          <span className="truncate">{entry.guest_name}</span>
                        </div>
                        <div className="truncate text-xs font-medium text-foreground/80">
                          {roomSummary(entry)}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {entry.booking_ref} · {entry.check_in} – {entry.check_out}
                          {!isDayUse && ` · ${nights}n`}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-xs capitalize',
                          BAR_CLASSES[entry.status] ?? BAR_CLASSES.confirmed,
                        )}
                      >
                        {isDayUse ? 'Day use' : statusLabel(entry.status)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// View preference — persisted in localStorage, read via useSyncExternalStore so
// it is SSR-safe (server snapshot = 'month') and never setState-in-effect.
// ---------------------------------------------------------------------------

const VIEW_KEY = 'calendar-view'
const VIEW_EVENT = 'calendar-view-change'

function subscribeView(callback: () => void): () => void {
  window.addEventListener(VIEW_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(VIEW_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

function useCalendarView(): [CalendarViewMode, (v: CalendarViewMode) => void] {
  const view = useSyncExternalStore(
    subscribeView,
    () => {
      const v = localStorage.getItem(VIEW_KEY)
      return v === 'tape' || v === 'agenda' || v === 'occupancy' ? v : 'month'
    },
    () => 'month' as CalendarViewMode,
  )
  function changeView(v: CalendarViewMode) {
    localStorage.setItem(VIEW_KEY, v)
    window.dispatchEvent(new Event(VIEW_EVENT))
  }
  return [view, changeView]
}

// ---------------------------------------------------------------------------
// CalendarView (main export)
// ---------------------------------------------------------------------------

export function CalendarView() {
  const router = useRouter()
  const today = currentDateIST()
  const [year, setYear] = useState(() => Number(today.split('-')[0]))
  const [month, setMonth] = useState(() => Number(today.split('-')[1]))
  const [view, changeView] = useCalendarView()

  const { from, to } = getMonthWindow(year, month)
  const days = getDaysInWindow(from, to)
  const { data, isLoading, isError, error, refetch } = useCalendar({ from, to })

  function prevMonth() {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
  }
  function nextMonth() {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth((m) => m + 1)
    }
  }
  function goToday() {
    const t = currentDateIST()
    setYear(Number(t.split('-')[0]))
    setMonth(Number(t.split('-')[1]))
  }

  const calData = data?.data

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <CalendarNav
          label={formatMonthYear(year, month)}
          onPrev={prevMonth}
          onNext={nextMonth}
          onToday={goToday}
        />
        <ViewToggle view={view} onChange={changeView} />
        {!isLoading && !isError && calData && calData.roomTypes.length > 0 && (
          <div className="ml-auto hidden lg:block">
            {view === 'occupancy' ? <HeatLegend /> : <Legend />}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {(error as Error)?.message ?? 'Failed to load calendar'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && calData && (
        <>
          {calData.roomTypes.length === 0 ? (
            <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground">
              <p className="text-base font-medium text-foreground">No rooms configured</p>
              <p className="mt-1 text-sm">Add room types and rooms first.</p>
            </div>
          ) : view === 'tape' ? (
            <TapeChart
              roomTypes={calData.roomTypes}
              bookings={calData.bookings}
              holds={calData.holds}
              days={days}
              from={from}
              today={today}
              router={router}
            />
          ) : view === 'occupancy' ? (
            <OccupancyView
              roomTypes={calData.roomTypes}
              bookings={calData.bookings}
              year={year}
              month={month}
              today={today}
            />
          ) : view === 'agenda' ? (
            <div className="mx-auto max-w-3xl">
              <MobileCalendar
                roomTypes={calData.roomTypes}
                bookings={calData.bookings}
                days={days}
                today={today}
                router={router}
              />
            </div>
          ) : (
            <MonthGrid
              bookings={calData.bookings}
              year={year}
              month={month}
              today={today}
              router={router}
            />
          )}
        </>
      )}
    </div>
  )
}
