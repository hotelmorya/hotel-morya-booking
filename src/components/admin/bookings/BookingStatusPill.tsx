import { cn } from '@/lib/utils'

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'not_arrived'

// Locked booking-status colors (design-system §11/§20). Full literal class
// strings so Tailwind always emits them (also safelisted in globals.css).
const STATUS: Record<BookingStatus, { label: string; cls: string }> = {
  pending: {
    label: 'Pending',
    cls: 'bg-booking-pending-bg text-booking-pending-text border-booking-pending-border',
  },
  confirmed: {
    label: 'Confirmed',
    cls: 'bg-booking-confirmed-bg text-booking-confirmed-text border-booking-confirmed-border',
  },
  checked_in: {
    label: 'Checked in',
    cls: 'bg-booking-checkedin-bg text-booking-checkedin-text border-booking-checkedin-border',
  },
  checked_out: {
    label: 'Checked out',
    cls: 'bg-booking-checkedout-bg text-booking-checkedout-text border-booking-checkedout-border',
  },
  cancelled: {
    label: 'Cancelled',
    cls: 'bg-booking-cancelled-bg text-booking-cancelled-text border-booking-cancelled-border',
  },
  not_arrived: {
    label: 'Not arrived',
    cls: 'bg-booking-checkedout-bg text-booking-checkedout-text border-booking-checkedout-border',
  },
}

export function BookingStatusPill({
  status,
  className,
}: {
  status: BookingStatus
  className?: string
}) {
  const s = STATUS[status] ?? STATUS.pending
  return (
    <span className={cn('pill border', s.cls, className)}>
      <span className="pill-dot bg-current opacity-70" />
      {s.label}
    </span>
  )
}
