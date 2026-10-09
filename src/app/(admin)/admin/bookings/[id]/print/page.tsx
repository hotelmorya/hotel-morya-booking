import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  formatCurrency,
  formatDateIST,
  formatDateTimeIST,
  formatDayUseHours,
} from '@/lib/format'
import { PrintButton } from '@/components/shared/print-button'
import { VEHICLE_TYPE_LABELS } from '@/schemas/booking'
import type { VehicleType } from '@/schemas/booking'
import type { Json, PaymentMethod, PaymentStatus } from '@/types/database'

export const metadata: Metadata = { title: 'Booking Receipt' }

// ---------------------------------------------------------------------------
// Manual types for the joined query result (Supabase omits generic <Database>
// per CLAUDE.md — never add it; cast instead).
// ---------------------------------------------------------------------------

type BookingRoom = {
  id: string
  nights: number
  rate_per_night: number
  subtotal: number | null
  room_id: string | null
  room_types: { name: Json } | null
  rooms: { room_number: string } | null
}

type Payment = {
  id: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  paid_at: string | null
  created_at: string | null
  deleted_at: string | null
  reference_note: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** room_types.name is a Json column with shape { en, mr, hi }. */
function localName(name: Json): string {
  if (typeof name === 'string') return name
  if (name && typeof name === 'object' && !Array.isArray(name)) {
    const n = name as Record<string, Json>
    if (typeof n.en === 'string') return n.en
    // fall back to first truthy string value
    for (const v of Object.values(n)) {
      if (typeof v === 'string' && v) return v
    }
  }
  return 'Room'
}

/** Status label map — keep print-friendly (ASCII, no emojis). */
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  not_arrived: 'Not Arrived',
}

const METHOD_LABELS: Record<string, string> = {
  upi: 'UPI',
  cash: 'Cash',
  card: 'Card',
  bank: 'Bank Transfer',
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BookingPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const profile = await getCurrentProfile()
  if (!profile) redirect('/auth/login')

  const supabase = await createClient()

  // Fetch booking with nested relations
  const { data: booking } = await supabase
    .from('bookings')
    .select(
      '*, guests(*), booking_rooms(*, room_types(name), rooms(room_number)), payments(*)'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!booking) notFound()

  // Fetch hotel settings
  const { data: hotel } = await supabase
    .from('hotel_settings')
    .select('name, address, city, state, phone, email, gst_enabled, gst_number')
    .maybeSingle()

  const guest = booking.guests as {
    fullname: string
    phone: string
    email: string | null
    city: string | null
  } | null

  // booking_rooms joined data — cast to our typed shape
  const rooms: BookingRoom[] = Array.isArray(booking.booking_rooms)
    ? (booking.booking_rooms as BookingRoom[])
    : []

  // Filter out soft-deleted payments; sort by paid_at ascending
  const payments: Payment[] = (
    Array.isArray(booking.payments) ? (booking.payments as Payment[]) : []
  )
    .filter((p: Payment) => !p.deleted_at)
    .sort((a: Payment, b: Payment) =>
      (a.paid_at ?? a.created_at ?? '').localeCompare(
        b.paid_at ?? b.created_at ?? ''
      )
    )

  // Charge calculations
  const roomSubtotal = rooms.reduce(
    (sum: number, r: BookingRoom) =>
      sum + (typeof r.subtotal === 'number' ? r.subtotal : r.rate_per_night * r.nights),
    0
  )
  const discountAmount = booking.discount_amount ?? 0
  const gstAmount = booking.gst_amount ?? 0
  // What the guest owes: subtotal − discount + GST (not the raw room total).
  const grandTotal = booking.total_amount - discountAmount + gstAmount
  const advancePaid = booking.advance_paid ?? 0
  const balanceDue = booking.balance_due ?? grandTotal - advancePaid

  const isDayUse = booking.stay_type === 'day_use'
  const nights = booking.nights ?? rooms[0]?.nights ?? 0
  const dayUseHours = isDayUse
    ? formatDayUseHours(
        (booking as { actual_check_in?: string | null }).actual_check_in,
        (booking as { actual_check_out?: string | null }).actual_check_out
      )
    : null

  return (
    <>
      {/* ── No-print toolbar ─────────────────────────────────────────────── */}
      <div className="no-print flex items-center gap-3 px-6 py-3 border-b border-border bg-surface-1">
        <Link
          href={`/admin/bookings/${id}`}
          className="inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to booking
        </Link>
        <div className="ml-auto">
          <PrintButton label="Print / Save PDF" />
        </div>
      </div>

      {/* ── Printable area ───────────────────────────────────────────────── */}
      <div className="print-area mx-auto max-w-2xl px-8 py-10 text-[#0a0a0a] text-[13px] leading-relaxed">

        {/* Hotel header */}
        <header className="mb-6 pb-5 border-b border-[#e5e5e5]">
          {hotel ? (
            <>
              <h1 className="text-[22px] font-bold leading-tight mb-1">{hotel.name}</h1>
              <p className="text-[12px] text-[#525252]">
                {hotel.address}
                {hotel.city ? `, ${hotel.city}` : ''}
                {hotel.state ? `, ${hotel.state}` : ''}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[12px] text-[#525252]">
                {hotel.phone && <span>Phone: {hotel.phone}</span>}
                {hotel.email && <span>Email: {hotel.email}</span>}
                {hotel.gst_enabled && hotel.gst_number && (
                  <span>GSTIN: {hotel.gst_number}</span>
                )}
              </div>
            </>
          ) : (
            <h1 className="text-[22px] font-bold">
              {process.env.NEXT_PUBLIC_HOTEL_NAME ?? 'Hotel'}
            </h1>
          )}
        </header>

        {/* Receipt title + booking ref */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-[18px] font-semibold">Booking Receipt</h2>
            {isDayUse && (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#525252] mt-0.5">
                Day Use
              </p>
            )}
            <p className="font-mono text-[12px] text-[#525252] mt-0.5">
              Ref: {booking.booking_ref}
            </p>
          </div>
          <div className="text-right">
            <span
              className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide border"
              style={{ borderColor: '#d4d4d4', background: '#f5f5f5', color: '#525252' }}
            >
              {STATUS_LABELS[booking.status] ?? booking.status}
            </span>
            {booking.created_at && (
              <p className="text-[11px] text-[#737373] mt-1">
                Booked: {formatDateTimeIST(booking.created_at)}
              </p>
            )}
          </div>
        </div>

        {/* Two-column info block */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Guest details */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-2">
              Guest
            </h3>
            {guest ? (
              <div className="space-y-0.5">
                <p className="font-semibold">{guest.fullname}</p>
                <p className="text-[12px] text-[#525252]">{guest.phone}</p>
                {guest.email && (
                  <p className="text-[12px] text-[#525252]">{guest.email}</p>
                )}
                {guest.city && (
                  <p className="text-[12px] text-[#525252]">{guest.city}</p>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-[#737373]">—</p>
            )}
          </section>

          {/* Stay details */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-2">
              Stay
            </h3>
            <div className="space-y-0.5 text-[12px]">
              {isDayUse ? (
                <>
                  <div className="flex gap-2">
                    <span className="text-[#737373] w-20 shrink-0">Date</span>
                    <span className="font-medium">{formatDateIST(booking.check_in)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#737373] w-20 shrink-0">Type</span>
                    <span>Day use{dayUseHours ? ` (${dayUseHours})` : ''}</span>
                  </div>
                  {(booking as { actual_check_in?: string | null }).actual_check_in && (
                    <div className="flex gap-2">
                      <span className="text-[#737373] w-20 shrink-0">Checked in</span>
                      <span>{formatDateTimeIST((booking as { actual_check_in: string }).actual_check_in)}</span>
                    </div>
                  )}
                  {(booking as { actual_check_out?: string | null }).actual_check_out && (
                    <div className="flex gap-2">
                      <span className="text-[#737373] w-20 shrink-0">Checked out</span>
                      <span>{formatDateTimeIST((booking as { actual_check_out: string }).actual_check_out)}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <span className="text-[#737373] w-20 shrink-0">Check-in</span>
                    <span className="font-medium">{formatDateIST(booking.check_in)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#737373] w-20 shrink-0">Check-out</span>
                    <span className="font-medium">{formatDateIST(booking.check_out)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#737373] w-20 shrink-0">Duration</span>
                    <span>{nights} {nights === 1 ? 'night' : 'nights'}</span>
                  </div>
                </>
              )}
              {booking.source && (
                <div className="flex gap-2">
                  <span className="text-[#737373] w-20 shrink-0">Source</span>
                  <span className="capitalize">{booking.source}</span>
                </div>
              )}
              {booking.vehicle_type && booking.vehicle_type !== 'none' && (
                <div className="flex gap-2">
                  <span className="text-[#737373] w-20 shrink-0">Vehicle</span>
                  <span>
                    {VEHICLE_TYPE_LABELS[booking.vehicle_type as VehicleType]}
                    {booking.vehicle_number ? ` · ${booking.vehicle_number}` : ''}
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Rooms table */}
        {rooms.length > 0 && (
          <section className="mb-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-2">
              Rooms
            </h3>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-y border-[#e5e5e5]">
                  <th className="text-left py-1.5 pr-3 font-semibold text-[#525252]">
                    Room Type
                  </th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-[#525252]">
                    Room No.
                  </th>
                  {isDayUse ? (
                    <th className="text-right py-1.5 pr-3 font-semibold text-[#525252] font-mono tabular-nums">
                      Day-use Charge
                    </th>
                  ) : (
                    <>
                      <th className="text-right py-1.5 pr-3 font-semibold text-[#525252] font-mono tabular-nums">
                        Rate/Night
                      </th>
                      <th className="text-right py-1.5 pr-3 font-semibold text-[#525252]">
                        Nights
                      </th>
                    </>
                  )}
                  <th className="text-right py-1.5 font-semibold text-[#525252] font-mono tabular-nums">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r: BookingRoom) => {
                  const sub =
                    typeof r.subtotal === 'number'
                      ? r.subtotal
                      : r.rate_per_night * r.nights
                  return (
                    <tr key={r.id} className="border-b border-[#f0f0f0]">
                      <td className="py-2 pr-3">
                        {r.room_types ? localName(r.room_types.name) : '—'}
                      </td>
                      <td className="py-2 pr-3 text-[#525252]">
                        {r.rooms?.room_number ?? '—'}
                      </td>
                      {isDayUse ? (
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">
                          {formatCurrency(r.rate_per_night)}
                        </td>
                      ) : (
                        <>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums">
                            {formatCurrency(r.rate_per_night)}
                          </td>
                          <td className="py-2 pr-3 text-right">{r.nights}</td>
                        </>
                      )}
                      <td className="py-2 text-right font-mono tabular-nums">
                        {formatCurrency(sub)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* Charges summary */}
        <section className="mb-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-2">
            Charges
          </h3>
          <div className="ml-auto max-w-xs space-y-1 text-[12px]">
            <div className="flex justify-between">
              <span className="text-[#525252]">{isDayUse ? 'Day-use charge' : 'Room total'}</span>
              <span className="font-mono tabular-nums">{formatCurrency(roomSubtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-[#dc2626]">
                <span>
                  Discount
                  {booking.discount_reason ? (
                    <span className="text-[#737373] text-[11px] ml-1 not-italic">
                      ({booking.discount_reason})
                    </span>
                  ) : null}
                </span>
                <span className="font-mono tabular-nums">
                  − {formatCurrency(discountAmount)}
                </span>
              </div>
            )}

            {gstAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-[#525252]">
                  GST
                  {hotel?.gst_number ? (
                    <span className="text-[#737373] text-[11px] ml-1">
                      ({hotel.gst_number})
                    </span>
                  ) : null}
                </span>
                <span className="font-mono tabular-nums">{formatCurrency(gstAmount)}</span>
              </div>
            )}

            <div className="flex justify-between border-t border-[#e5e5e5] pt-1.5 font-semibold text-[13px]">
              <span>Grand Total</span>
              <span className="font-mono tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="flex justify-between text-[#525252]">
              <span>Advance Paid</span>
              <span className="font-mono tabular-nums">{formatCurrency(advancePaid)}</span>
            </div>

            <div
              className={`flex justify-between border-t border-[#e5e5e5] pt-1.5 font-semibold text-[13px] ${
                balanceDue > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'
              }`}
            >
              <span>{balanceDue < 0 ? 'Refund Due' : 'Balance Due'}</span>
              <span className="font-mono tabular-nums">{formatCurrency(Math.abs(balanceDue))}</span>
            </div>
          </div>
        </section>

        {/* Payments table */}
        {payments.length > 0 && (
          <section className="mb-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-2">
              Payment History
            </h3>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-y border-[#e5e5e5]">
                  <th className="text-left py-1.5 pr-3 font-semibold text-[#525252]">
                    Date
                  </th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-[#525252]">
                    Method
                  </th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-[#525252]">
                    Reference
                  </th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-[#525252]">
                    Status
                  </th>
                  <th className="text-right py-1.5 font-semibold text-[#525252] font-mono">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: Payment) => (
                  <tr key={p.id} className="border-b border-[#f0f0f0]">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {p.paid_at
                        ? formatDateTimeIST(p.paid_at)
                        : p.created_at
                        ? formatDateTimeIST(p.created_at)
                        : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      {METHOD_LABELS[p.method] ?? p.method}
                    </td>
                    <td className="py-2 pr-3 text-[#525252] font-mono text-[11px] break-all">
                      {p.reference_note ?? '—'}
                    </td>
                    <td className="py-2 pr-3 capitalize text-[#525252]">
                      {p.status}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Special requests */}
        {booking.special_requests && (
          <section className="mb-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-1">
              Special Requests
            </h3>
            <p className="text-[12px] text-[#525252]">{booking.special_requests}</p>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-[#e5e5e5] text-center text-[11px] text-[#737373] space-y-0.5">
          <p>
            Thank you for choosing{' '}
            {hotel?.name ?? process.env.NEXT_PUBLIC_HOTEL_NAME ?? 'our hotel'}. We
            look forward to welcoming you.
          </p>
          <p>This is a computer-generated receipt and does not require a signature.</p>
        </footer>
      </div>
    </>
  )
}
