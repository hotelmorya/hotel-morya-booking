'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconLoader, IconX } from '@tabler/icons-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateRange } from '@/lib/format'

export interface ActiveHold {
  id: string
  /** Every booking_holds row id in this (type + dates) group — released together. */
  ids: string[]
  room_type_name: string
  check_in: string
  check_out: string
  expires_at: string
  quantity: number
}

/** "4:58" mm:ss remaining, or null once expired. */
function remaining(expiresAt: string, nowMs: number): string | null {
  const ms = new Date(expiresAt).getTime() - nowMs
  if (ms <= 0) return null
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ActiveHoldsPanel({ holds }: { holds: ActiveHold[] }) {
  const router = useRouter()
  // Live tick so the countdown updates and expired holds drop off without a
  // page refresh (lazy expiry — the row may still exist in the DB briefly).
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Hold groups the staff has released this session — hidden immediately so the
  // panel feels responsive while router.refresh() re-fetches the server data.
  const [releasing, setReleasing] = useState<Set<string>>(new Set())
  const [released, setReleased] = useState<Set<string>>(new Set())

  async function handleRelease(h: ActiveHold) {
    setReleasing((s) => new Set(s).add(h.id))
    try {
      const res = await fetch('/api/admin/holds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: h.ids }),
      })
      if (!res.ok) throw new Error('release failed')
      setReleased((s) => new Set(s).add(h.id))
      toast.success('Hold released')
      router.refresh()
    } catch {
      toast.error('Could not release the hold. Please try again.')
    } finally {
      setReleasing((s) => {
        const next = new Set(s)
        next.delete(h.id)
        return next
      })
    }
  }

  const live = holds
    .map((h) => ({ h, left: remaining(h.expires_at, nowMs) }))
    .filter((x): x is { h: ActiveHold; left: string } => x.left !== null)
    .filter((x) => !released.has(x.h.id))

  if (live.length === 0) return null

  return (
    <Card id="active-holds" className="scroll-mt-20 rounded border-hairline border-border bg-surface-1 gap-0 py-0">
      <CardHeader className="flex flex-row items-center gap-2 border-b-hairline border-border px-[14px] py-3 rounded-t-xl">
        <IconLoader size={15} className="text-booking-hold-text" stroke={1.75} />
        <CardTitle className="text-[13px] font-medium text-text-primary">
          Active holds
        </CardTitle>
        <span className="text-[11px] text-text-tertiary">{live.length}</span>
      </CardHeader>
      <CardContent className="p-0">
        {live.map(({ h, left }) => (
          <div
            key={h.id}
            className="flex items-center justify-between gap-2 border-b-hairline border-border px-[14px] py-[10px] last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-text-primary">
                {h.quantity > 1 ? `${h.quantity}× ` : ''}
                {h.room_type_name}
              </p>
              <p className="mt-0.5 text-[11px] text-text-tertiary">
                {formatDateRange(h.check_in, h.check_out)} · online booking in progress
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded bg-booking-hold-bg px-1.5 py-0.5 font-mono text-[11px] font-medium text-booking-hold-text">
                {left}
              </span>
              <button
                type="button"
                onClick={() => handleRelease(h)}
                disabled={releasing.has(h.id)}
                aria-label={`Release ${h.room_type_name} hold`}
                title="Release this hold"
                className="flex size-6 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-room-repair-bg hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {releasing.has(h.id) ? (
                  <IconLoader size={14} className="animate-spin" />
                ) : (
                  <IconX size={14} />
                )}
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
