'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { waHref } from '@/lib/site'
import type { AvailabilityRoomType } from '@/hooks/use-availability'

type Props = {
  roomTypes: AvailabilityRoomType[]
  gst: { enabled: boolean; rate: number }
  quantities: Record<string, number>
  locale: string
  isPlacingHold: boolean
  holdReattemptFailed?: boolean
  contact?: { phone: string; whatsapp: string }
  onQuantityChange: (roomTypeId: string, qty: number) => void
  onContinue: () => void
}

function getRoomName(name: AvailabilityRoomType['name'], locale: string): string {
  if (typeof name === 'string') return name
  const n = name as Record<string, string>
  return n[locale] ?? n['en'] ?? 'Room'
}

export function RoomPickerPanel({
  roomTypes,
  gst,
  quantities,
  locale,
  isPlacingHold,
  holdReattemptFailed = false,
  contact,
  onQuantityChange,
  onContinue,
}: Props) {
  const t = useTranslations('booking')

  const subtotal = roomTypes.reduce((sum, rt) => {
    const qty = quantities[rt.id] ?? 0
    return sum + qty * rt.pricing.subtotal
  }, 0)

  const gstAmount = gst.enabled ? Math.round(subtotal * gst.rate) / 100 : 0
  const grandTotal = subtotal + gstAmount
  const hasSelection = Object.values(quantities).some((q) => q > 0)

  return (
    <div className="space-y-4">
      {holdReattemptFailed && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          {t('holdReattemptFailed')}
        </div>
      )}

      {roomTypes.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs font-medium text-muted-foreground">
          {t('noRoomsAvailable')}
        </p>
      )}

      {roomTypes.map((rt) => {
        const qty = quantities[rt.id] ?? 0
        const isSoldOut = rt.available_count === 0
        const mayFreeUp = isSoldOut && !!rt.day_use_freeing

        return (
          <div
            key={rt.id}
            className={cn(
              'relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-200',
              qty > 0
                ? 'border-amber-400 shadow-[0_4px_20px_rgba(245,184,0,0.2)] ring-1 ring-amber-400/30'
                : 'border-border hover:border-border/90',
            )}
          >
            {/* Accent rail when selected */}
            {qty > 0 && (
              <span className="absolute inset-y-0 left-0 w-1 bg-amber-400" aria-hidden="true" />
            )}

            <div className="flex items-start justify-between gap-3">
              {/* Name & Badges */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {getRoomName(rt.name, locale)}
                  </h3>
                  {rt.pricing.override_label && (
                    <Badge className="border-transparent bg-amber-400/15 text-amber-600 font-bold">
                      {rt.pricing.override_label}
                    </Badge>
                  )}
                  {mayFreeUp ? (
                    <Badge className="border-transparent bg-amber-100 text-amber-800">
                      {t('limited')}
                    </Badge>
                  ) : isSoldOut ? (
                    <Badge className="border-transparent bg-destructive/15 text-destructive font-bold">
                      {t('soldOut')}
                    </Badge>
                  ) : (
                    <Badge className="border-transparent bg-emerald-100 text-emerald-800 font-bold">
                      {t('available', { count: rt.available_count })}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('upToGuests', { count: rt.max_guests })}
                </p>
              </div>

              {/* Price */}
              <div className="shrink-0 text-right">
                <p className="font-mono text-lg font-bold text-foreground">
                  {formatCurrency(rt.pricing.subtotal)}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {t('perNight')}
                </p>
              </div>
            </div>

            {/* Stepper buttons */}
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('selectQuantity')}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Decrease ${getRoomName(rt.name, locale)}`}
                  disabled={qty <= 0}
                  onClick={() => onQuantityChange(rt.id, qty - 1)}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-xl border border-border bg-muted/60 text-lg font-bold text-foreground transition hover:bg-muted',
                    qty <= 0 && 'cursor-not-allowed opacity-40 hover:bg-muted/60',
                  )}
                >
                  −
                </button>
                <span className="min-w-[2ch] text-center text-base font-bold tabular-nums text-foreground">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label={`Increase ${getRoomName(rt.name, locale)}`}
                  disabled={qty >= rt.available_count || isSoldOut}
                  onClick={() => onQuantityChange(rt.id, qty + 1)}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-xl border border-border bg-muted/60 text-lg font-bold text-foreground transition hover:bg-muted',
                    (qty >= rt.available_count || isSoldOut) &&
                      'cursor-not-allowed opacity-40 hover:bg-muted/60',
                  )}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Subtotal calculation summary */}
      {hasSelection && (
        <div className="space-y-1.5 rounded-2xl border border-border bg-muted/30 p-5">
          <div className="flex justify-between text-xs text-foreground font-medium">
            <span>{t('subtotal')}</span>
            <span className="font-mono font-bold">{formatCurrency(subtotal)}</span>
          </div>
          {gst.enabled && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('gst')}</span>
              <span className="font-mono">{formatCurrency(gstAmount)}</span>
            </div>
          )}
          <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2 text-foreground font-bold">
            <span className="text-sm">{t('grandTotal')}</span>
            <span className="font-mono text-lg text-primary font-bold">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      )}

      {/* Continue CTA */}
      <button
        type="button"
        onClick={onContinue}
        disabled={!hasSelection || isPlacingHold}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-amber-400 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-md transition-all hover:bg-amber-300 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
      >
        {isPlacingHold ? t('placingHold') : t('continue')}
      </button>
    </div>
  )
}
