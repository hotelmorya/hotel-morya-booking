'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Printer, Share2, MapPin, Search } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { Link } from '@/lib/navigation'
import { HOTEL, waHref, directionsHref } from '@/lib/site'

type Props = {
  bookingRef: string
  totalAmount: number
  gstAmount: number
  balanceDue: number
  paymentPath: string
  locale: string
  contactWhatsapp?: string
}

export function SuccessScreen({
  bookingRef,
  totalAmount,
  gstAmount,
  balanceDue,
  paymentPath,
  contactWhatsapp = '',
}: Props) {
  const t = useTranslations('booking')

  const waShareText = `Namaskar! I booked a room at Hotel Morya Lodging Admapur. Booking Ref: ${bookingRef}`
  const waShareLink = waHref(waShareText)

  const paymentNote =
    paymentPath === 'hotel'
      ? t('successNoteHotel')
      : t('successNoteUpi')

  return (
    <div className="mx-auto max-w-lg py-8 text-center print-area">
      {/* Radiant Checkmark */}
      <div className="flex justify-center">
        <span className="flex size-18 items-center justify-center rounded-full bg-amber-400 text-zinc-950 shadow-[0_0_0_8px_rgba(245,184,0,0.18)]">
          <CheckCircle2 className="size-10" />
        </span>
      </div>

      {/* Title */}
      <h1 className="mt-5 font-display text-3xl sm:text-4xl font-bold text-foreground">
        {t('successTitle')}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('successBody')}
      </p>

      {/* Booking Reference Box */}
      <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5 shadow-xs">
        <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
          {t('bookingRef')}
        </p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-wider text-foreground">
          {bookingRef}
        </p>
      </div>

      {/* Bill summary */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-left space-y-2.5">
        <div className="flex justify-between text-xs text-foreground font-medium">
          <span>{t('subtotal')}</span>
          <span className="font-mono font-bold">{formatCurrency(totalAmount)}</span>
        </div>
        {gstAmount > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('gst')}</span>
            <span className="font-mono">{formatCurrency(gstAmount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
          <span>{t('balanceDue')}</span>
          <span className="font-mono text-primary font-bold">{formatCurrency(balanceDue)}</span>
        </div>
      </div>

      {/* Payment note */}
      {paymentNote && (
        <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs font-medium text-amber-900 dark:text-amber-200">
          {paymentNote}
        </p>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col gap-2.5 no-print">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-xs font-bold uppercase tracking-wider text-foreground transition hover:bg-muted"
        >
          <Printer className="size-4" />
          <span>{t('downloadVoucher')}</span>
        </button>

        <a
          href={waShareLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 text-xs font-bold uppercase tracking-wider text-[#1e9e4c] transition hover:bg-[#25D366]/20"
        >
          <Share2 className="size-4" />
          <span>{t('shareWhatsApp')}</span>
        </a>

        <a
          href={directionsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 text-xs font-semibold text-muted-foreground transition hover:text-foreground hover:bg-muted"
        >
          <MapPin className="size-4 text-primary" />
          <span>{t('directionsLink')}</span>
        </a>

        <Link
          href={`/track?ref=${encodeURIComponent(bookingRef)}&booked=1`}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-xs transition hover:bg-amber-300"
        >
          <Search className="size-4" />
          <span>{t('trackBooking')}</span>
        </Link>
      </div>
    </div>
  )
}
