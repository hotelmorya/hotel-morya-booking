'use client'

import React, { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { formatCurrency, formatDateRange, formatNights } from '@/lib/format'
import type { AvailabilityRoomType } from '@/hooks/use-availability'

type Props = {
  checkIn: string
  checkOut: string
  quantities: Record<string, number>
  roomTypes: AvailabilityRoomType[]
  gst: { enabled: boolean; rate: number } | null
  visible: boolean
}

function getRoomName(name: AvailabilityRoomType['name'], locale = 'en'): string {
  if (typeof name === 'string') return name
  const n = name as Record<string, string>
  return n[locale] ?? n['en'] ?? 'Room'
}

export function StickySummary({
  checkIn,
  checkOut,
  quantities,
  roomTypes,
  gst,
  visible,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!visible || !checkIn || !checkOut) return null

  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000,
    ),
  )

  const selectedRooms = roomTypes.filter((rt) => (quantities[rt.id] ?? 0) > 0)
  const subtotal = roomTypes.reduce((sum, rt) => {
    const qty = quantities[rt.id] ?? 0
    return sum + qty * rt.pricing.subtotal
  }, 0)

  const gstAmount =
    gst?.enabled ? Math.round(subtotal * gst.rate) / 100 : 0
  const grandTotal = subtotal + gstAmount

  const roomSummary = selectedRooms
    .map((rt) => `${quantities[rt.id]}× ${getRoomName(rt.name)}`)
    .join(', ')

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-xl lg:hidden">
      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between"
        aria-expanded={expanded}
      >
        <div className="text-left">
          <p className="text-xs font-semibold text-muted-foreground">
            {formatDateRange(checkIn, checkOut)} · {formatNights(nights)}
          </p>
          {roomSummary && (
            <p className="text-xs font-medium text-foreground truncate max-w-[60vw]">
              {roomSummary}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-foreground">
            {formatCurrency(grandTotal)}
          </span>
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          {selectedRooms.map((rt) => {
            const qty = quantities[rt.id] ?? 0
            if (qty === 0) return null
            return (
              <div key={rt.id} className="flex justify-between text-xs text-foreground">
                <span>
                  {qty}× {getRoomName(rt.name)} ({formatNights(nights)})
                </span>
                <span className="font-mono font-semibold">
                  {formatCurrency(qty * rt.pricing.subtotal)}
                </span>
              </div>
            )
          })}
          {gst?.enabled && gstAmount > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>GST ({gst.rate}%)</span>
              <span className="font-mono">{formatCurrency(gstAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-1 font-bold text-foreground">
            <span className="text-xs">Total</span>
            <span className="font-mono text-sm text-primary font-bold">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
