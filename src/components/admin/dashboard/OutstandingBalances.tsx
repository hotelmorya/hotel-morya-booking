import Link from 'next/link'
import { IconAlertTriangle } from '@tabler/icons-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export interface OutstandingBalanceRow {
  id: string
  booking_ref: string
  guest_fullname: string
  balance_due: number
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Compute 1-2 letter initials from a full name */
function getInitials(fullname: string): string {
  const parts = fullname.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
}

export function OutstandingBalances({
  rows,
}: {
  rows: OutstandingBalanceRow[]
}) {
  return (
    <Card className="rounded border-hairline border-border bg-surface-1 gap-0 py-0">
      {/* Header — same visual grammar as Arrivals/Departures panels */}
      <CardHeader className="flex flex-row items-center justify-between border-b-hairline border-border px-[14px] py-3 rounded-t-xl gap-0">
        <div className="flex items-center gap-2">
          <IconAlertTriangle
            size={14}
            className="text-[#92400e] dark:text-[#fcd34d]"
            stroke={1.75}
          />
          <CardTitle className="text-[13px] font-medium text-text-primary">
            Outstanding balances
          </CardTitle>
          {rows.length > 0 && (
            <span className="text-[11px] text-text-tertiary">{rows.length}</span>
          )}
        </div>
        <Link
          href="/admin/bookings?status=checked_in&balance=outstanding"
          className="text-[11px] text-accent-500 hover:underline"
        >
          View all →
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[13px] text-text-tertiary">No outstanding balances</p>
          </div>
        ) : (
          <div>
            {rows.map((row) => {
              const ini = getInitials(row.guest_fullname)
              return (
                <Link
                  key={row.id}
                  href={`/admin/bookings/${row.id}`}
                  className="flex items-center gap-2.5 border-b-hairline border-border px-[14px] py-[10px] transition-colors last:border-b-0 hover:bg-surface-1"
                >
                  {/* Initials avatar */}
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-booking-confirmed-bg text-[10px] font-medium text-booking-confirmed-text">
                    {ini}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[13px] font-medium text-text-primary">
                      {row.guest_fullname}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-text-tertiary">
                      {row.booking_ref}
                    </p>
                  </div>
                  <p className="flex-shrink-0 text-[13px] font-medium tabular-nums text-[var(--danger)]">
                    {formatInr(row.balance_due)}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
