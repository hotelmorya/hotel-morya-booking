import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export interface ActivityEntry {
  id: number
  action: string
  entity_type: string
  entity_id: string | null
  created_at: string
  user_fullname: string | null
  metadata?: Record<string, unknown> | null
}

// Booking status_changed → friendly verb, keyed by the new status (metadata.to)
const BOOKING_STATUS_VERB: Record<string, string> = {
  confirmed: 'confirmed the booking',
  cancelled: 'cancelled the booking',
  checked_in: 'checked in the guest',
  checked_out: 'checked out the guest',
  not_arrived: 'marked as not arrived',
  pending: 'set the booking to pending',
}

const ROOM_STATUS_LABEL: Record<string, string> = {
  available: 'available',
  occupied: 'occupied',
  cleaning: 'cleaning',
  maintenance: 'maintenance',
}

/**
 * Turn a raw activity_log action into a human-readable phrase that includes the
 * affected noun. status_changed uses metadata.to so generic DB-trigger rows still
 * read specifically (e.g. "checked in the guest", "set a room to cleaning").
 */
function humanizeAction(
  action: string,
  entityType: string,
  metadata?: Record<string, unknown> | null
): string {
  const to = typeof metadata?.to === 'string' ? metadata.to : null
  switch (action) {
    case 'created':
      return entityType === 'booking'
        ? 'created a booking'
        : `created a ${entityType.replace(/_/g, ' ')}`
    case 'status_changed':
      if (entityType === 'room')
        return `set a room to ${to ? (ROOM_STATUS_LABEL[to] ?? to) : 'a new status'}`
      return to
        ? (BOOKING_STATUS_VERB[to] ?? `changed the booking status to ${to}`)
        : 'changed the booking status'
    case 'deleted_soft':
      return `deleted a ${entityType.replace(/_/g, ' ')}`
    case 'recorded':
      return 'recorded a payment'
    case 'booking.cancelled':
      return 'cancelled the booking'
    case 'booking.discount_applied':
      return 'applied a discount'
    case 'payment.voided':
      return 'voided a payment'
    case 'payment.refunded':
      return 'refunded a payment'
    case 'payment.captured':
      return 'captured a payment'
    case 'room.reassigned':
      return 'reassigned a room'
    case 'cleaning.started':
      return 'started cleaning a room'
    case 'cleaning.completed':
      return 'finished cleaning a room'
    case 'maintenance_block.created':
      return 'reported a maintenance issue'
    case 'guest.created':
      return 'added a guest'
    case 'guest.updated':
      return 'updated a guest'
    case 'guest.deleted':
      return 'removed a guest'
    case 'guest.merged':
      return 'merged guests'
    case 'guest.id_proof_uploaded':
      return 'uploaded an ID proof'
    case 'gallery_media.created':
      return 'added gallery media'
    case 'gallery_media.updated':
      return 'updated gallery media'
    case 'gallery_media.deleted':
      return 'removed gallery media'
    default:
      return action.replace(/[._]/g, ' ')
  }
}

/** Returns a human-readable relative time string, e.g. "2 h ago", "just now". */
function relativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then

  if (diffMs < 60_000) return 'just now'
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'yesterday'
  return `${diffDay} d ago`
}

function actionDotColor(action: string, to: string | null): string {
  // status_changed carries the specific transition in metadata.to
  if (action === 'status_changed' && to) {
    if (to === 'cancelled' || to === 'not_arrived') return 'bg-[var(--danger)]'
    if (to === 'checked_in') return 'bg-booking-checkedin-text'
    if (to === 'checked_out') return 'bg-text-tertiary'
    if (to === 'confirmed') return 'bg-[var(--success)]'
  }
  if (action.includes('created') || action.includes('confirmed')) return 'bg-[var(--success)]'
  if (action.includes('cancelled') || action.includes('deleted') || action.includes('voided'))
    return 'bg-[var(--danger)]'
  if (
    action.includes('payment') ||
    action.includes('paid') ||
    action === 'recorded' ||
    action.includes('refunded') ||
    action.includes('captured')
  )
    return 'bg-accent-500'
  if (action.includes('check_in') || action.includes('checked_in'))
    return 'bg-booking-checkedin-text'
  if (action.includes('check_out') || action.includes('checked_out')) return 'bg-text-tertiary'
  return 'bg-text-disabled'
}

/** Compute 1-2 letter initials */
function getInitials(fullname: string): string {
  const parts = fullname.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
}

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card className="rounded border-hairline border-border bg-surface-1 gap-0 py-0">
      {/* Header — matches panel visual grammar */}
      <CardHeader className="flex flex-row items-center justify-between border-b-hairline border-border px-[14px] py-3 rounded-t-xl gap-0">
        <CardTitle className="text-[13px] font-medium text-text-primary">
          Recent activity
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {entries.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[13px] text-text-tertiary">No recent activity</p>
          </div>
        ) : (
          <div>
            {entries.map((entry) => {
              const name = entry.user_fullname ?? 'System'
              const ini = getInitials(name)
              const metaTo =
                typeof entry.metadata?.to === 'string' ? entry.metadata.to : null
              const phrase = humanizeAction(
                entry.action,
                entry.entity_type,
                entry.metadata
              )
              const entityHref =
                entry.entity_type === 'booking' && entry.entity_id
                  ? `/admin/bookings/${entry.entity_id}`
                  : null

              const row = (
                <div className="flex items-start gap-2.5 border-b-hairline border-border px-[14px] py-[10px] last:border-b-0">
                  {/* Initials avatar with action dot overlay */}
                  <div className="relative mt-0.5 flex-shrink-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-1 text-[10px] font-medium text-text-secondary">
                      {ini}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-bg ${actionDotColor(entry.action, metaTo)}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-primary">
                      <span className="font-medium">{name}</span>{' '}
                      <span className="text-text-secondary">{phrase}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-tertiary">
                      {relativeTime(entry.created_at)}
                    </p>
                  </div>
                </div>
              )

              return entityHref ? (
                <Link
                  key={entry.id}
                  href={entityHref}
                  className="block transition-colors hover:bg-surface-1"
                >
                  {row}
                </Link>
              ) : (
                <div key={entry.id}>{row}</div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
