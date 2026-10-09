import Link from 'next/link'

import type { BookingStatus } from '@/types/database'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export interface ArrivalRow {
  id: string
  booking_ref: string
  status: BookingStatus
  guest_fullname: string
  guest_phone: string
  nights: number | null
  advance_paid: number
  total_amount: number
  check_in: string
  is_day_use?: boolean
  /** Expected day-use window, e.g. "5:00 pm – 8:00 pm" (null if not set) */
  day_use_window?: string | null
}

export interface DepartureRow {
  id: string
  booking_ref: string
  status: BookingStatus
  guest_fullname: string
  guest_phone: string
  nights: number | null
  advance_paid: number
  total_amount: number
  check_out: string
  is_day_use?: boolean
  /** Expected day-use window, e.g. "5:00 pm – 8:00 pm" (null if not set) */
  day_use_window?: string | null
  /** Elapsed time in room for a checked-in day-use, e.g. "~2h" */
  in_room?: string | null
  /** Day-use still checked in past its expected window / day — needs checkout */
  overdue?: boolean
}

/** Compute 1-2 letter initials from a full name */
function getInitials(fullname: string): string {
  const parts = fullname.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
}

/** 6px status dot colour per mockup */
function statusDotClass(status: BookingStatus): string {
  switch (status) {
    case 'confirmed':
      return 'bg-[#2563EB]'
    case 'pending':
      return 'bg-[#F59E0B]'
    case 'checked_in':
      return 'bg-[#7C3AED]'
    default:
      return 'bg-text-disabled'
  }
}

/** Short status label for the sub-line */
function statusShortLabel(status: BookingStatus): string {
  switch (status) {
    case 'confirmed':
      return 'confirmed'
    case 'pending':
      return 'payment pending'
    case 'checked_in':
      return 'checked in'
    default:
      return status.replace('_', ' ')
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-[13px] text-text-tertiary">{message}</p>
    </div>
  )
}

function PanelHeader({
  title,
  count,
  href,
}: {
  title: string
  count: number
  href: string
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between border-b-hairline border-border px-[14px] py-3 rounded-t-xl gap-0">
      <div className="flex items-center gap-1">
        <CardTitle className="text-[13px] font-medium text-text-primary">{title}</CardTitle>
        <span className="ml-1 text-[11px] text-text-tertiary">{count}</span>
      </div>
      <Link
        href={href}
        className="text-[11px] text-accent-500 hover:underline"
      >
        View all →
      </Link>
    </CardHeader>
  )
}

function ArrivalBookingRow({ row }: { row: ArrivalRow }) {
  const ini = getInitials(row.guest_fullname)
  const isPrimary = row.status === 'confirmed'
  const balanceDue = row.total_amount - row.advance_paid

  return (
    <div className="flex items-center gap-2.5 border-b-hairline border-border px-[14px] py-[10px] last:border-b-0">
      {/* 28px initials avatar */}
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-booking-confirmed-bg text-[10px] font-medium text-booking-confirmed-text">
        {ini}
      </div>

      {/* Main: name + sub-line */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-[13px] font-medium text-text-primary">
          {row.guest_fullname}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-text-tertiary">
          <span
            className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${statusDotClass(row.status)}`}
          />
          <span>{row.booking_ref}</span>
          {row.is_day_use ? (
            <span>· day use{row.day_use_window ? ` ${row.day_use_window}` : ''}</span>
          ) : (
            row.nights && (
              <span>· {row.nights} {row.nights === 1 ? 'night' : 'nights'}</span>
            )
          )}
          {row.status === 'pending' && balanceDue > 0 && (
            <span>· {statusShortLabel(row.status)}</span>
          )}
        </p>
      </div>

      {/* Action button */}
      <Link
        href={`/admin/bookings/${row.id}`}
        className={`flex-shrink-0 rounded text-[11px] px-[10px] py-[5px] transition-colors ${
          isPrimary
            ? 'bg-accent-500 text-white hover:bg-accent-700'
            : 'border-hairline border-border bg-surface-1 text-text-primary hover:bg-surface-2'
        }`}
      >
        {isPrimary ? 'Check in' : 'View'}
      </Link>
    </div>
  )
}

function DepartureBookingRow({ row }: { row: DepartureRow }) {
  const ini = getInitials(row.guest_fullname)
  const balanceDue = row.total_amount - row.advance_paid
  const isPrimary = row.status === 'checked_in'

  return (
    <div className="flex items-center gap-2.5 border-b-hairline border-border px-[14px] py-[10px] last:border-b-0">
      {/* 28px initials avatar */}
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-booking-confirmed-bg text-[10px] font-medium text-booking-confirmed-text">
        {ini}
      </div>

      {/* Main: name + sub-line */}
      <div className="flex-1 min-w-0">
        <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-text-primary">
          {row.guest_fullname}
          {row.overdue && (
            <span className="rounded bg-[var(--danger)]/15 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--danger)]">
              Overdue
            </span>
          )}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-text-tertiary">
          <span
            className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${statusDotClass(row.status)}`}
          />
          <span>{row.booking_ref}</span>
          {row.is_day_use && (
            <span>
              · day use
              {row.day_use_window ? ` ${row.day_use_window}` : ''}
              {row.in_room ? ` · in room ${row.in_room}` : ''}
            </span>
          )}
          {balanceDue > 0 ? (
            <span className="text-[var(--danger)]">
              · ₹{balanceDue.toLocaleString('en-IN')} due
            </span>
          ) : (
            <span>· settled</span>
          )}
        </p>
      </div>

      {/* Action button */}
      <Link
        href={`/admin/bookings/${row.id}`}
        className={`flex-shrink-0 rounded text-[11px] px-[10px] py-[5px] transition-colors ${
          isPrimary
            ? 'bg-accent-500 text-white hover:bg-accent-700'
            : 'border-hairline border-border bg-surface-1 text-text-primary hover:bg-surface-2'
        }`}
      >
        {isPrimary ? 'Check out' : 'View'}
      </Link>
    </div>
  )
}

function TomorrowArrivalRow({ row }: { row: ArrivalRow }) {
  const ini = getInitials(row.guest_fullname)
  const isPrimary = row.status === 'confirmed'

  return (
    <div className="flex items-center gap-2.5 border-b-hairline border-border px-[14px] py-[10px] last:border-b-0">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-booking-confirmed-bg text-[10px] font-medium text-booking-confirmed-text">
        {ini}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[13px] font-medium text-text-primary">
          {row.guest_fullname}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-text-tertiary">
          <span
            className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${statusDotClass(row.status)}`}
          />
          <span>{row.booking_ref}</span>
          {row.is_day_use ? (
            <span>· day use{row.day_use_window ? ` ${row.day_use_window}` : ''}</span>
          ) : (
            row.nights && (
              <span>· {row.nights} {row.nights === 1 ? 'night' : 'nights'}</span>
            )
          )}
        </p>
      </div>
      <Link
        href={`/admin/bookings/${row.id}`}
        className={`flex-shrink-0 rounded text-[11px] px-[10px] py-[5px] transition-colors ${
          isPrimary
            ? 'bg-accent-500 text-white hover:bg-accent-700'
            : 'border-hairline border-border bg-surface-1 text-text-primary hover:bg-surface-2'
        }`}
      >
        View
      </Link>
    </div>
  )
}

export function ArrivalsDeparturePanels({
  arrivals,
  departures,
}: {
  arrivals: ArrivalRow[]
  departures: DepartureRow[]
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-4">
      {/* Arrivals panel */}
      <Card className="rounded border-hairline border-border bg-surface-1 gap-0 py-0">
        <PanelHeader
          title="Today's arrivals"
          count={arrivals.length}
          href="/admin/bookings?check_in=today"
        />
        <CardContent className="p-0">
          {arrivals.length === 0 ? (
            <EmptyState message="No arrivals today" />
          ) : (
            <div>
              {arrivals.map((row) => (
                <ArrivalBookingRow key={row.id} row={row} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Departures panel */}
      <Card className="rounded border-hairline border-border bg-surface-1 gap-0 py-0">
        <PanelHeader
          title="Today's departures"
          count={departures.length}
          href="/admin/bookings?check_out=today"
        />
        <CardContent className="p-0">
          {departures.length === 0 ? (
            <EmptyState message="No departures today" />
          ) : (
            <div>
              {departures.map((row) => (
                <DepartureBookingRow key={row.id} row={row} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function TomorrowsArrivals({ arrivals }: { arrivals: ArrivalRow[] }) {
  return (
    <Card className="rounded border-hairline border-border bg-surface-1 gap-0 py-0">
      <PanelHeader
        title="Tomorrow's arrivals"
        count={arrivals.length}
        href="/admin/bookings?check_in=tomorrow"
      />
      <CardContent className="p-0">
        {arrivals.length === 0 ? (
          <EmptyState message="No arrivals tomorrow" />
        ) : (
          <div>
            {arrivals.map((row) => (
              <TomorrowArrivalRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
