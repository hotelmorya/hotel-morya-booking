'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Phone, Search, AlertCircle, ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDateIST } from '@/lib/format'
import { HOTEL, telHref, waHref } from '@/lib/site'

type Props = {
  locale?: string
  initialRef?: string
  showSuccessBanner?: boolean
  contactPhone?: string
  contactWhatsapp?: string
}

type BookingStatus = {
  booking_ref: string
  status: string
  check_in: string
  check_out: string
  nights: number
  total_amount: number
  gst_amount: number
  advance_paid: number
  balance_due: number
}

export function TrackPage({
  initialRef,
  showSuccessBanner = false,
  contactPhone = HOTEL.phones[0],
  contactWhatsapp = HOTEL.whatsapp,
}: Props) {
  const t = useTranslations('track')
  const [ref, setRef] = useState(initialRef ?? '')
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BookingStatus | null>(null)
  const [notFound, setNotFound] = useState(false)

  const STATUS_LABELS: Record<string, string> = {
    pending: t('statusPending'),
    confirmed: t('statusConfirmed'),
    checked_in: t('statusCheckedIn'),
    checked_out: t('statusCheckedOut'),
    cancelled: t('statusCancelled'),
    not_arrived: t('statusNotArrived'),
  }

  const waLink = waHref(
    `Namaskar, I want to check my reservation status for Booking Ref: ${ref || '—'}`,
    contactWhatsapp,
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setNotFound(false)
    setResult(null)
    if (!ref || phone.length !== 10) return

    setLoading(true)
    try {
      const res = await fetch(
        `/api/public/bookings/${encodeURIComponent(ref.trim().toUpperCase())}?phone=${phone}`
      )
      if (res.ok) {
        const json = await res.json()
        setResult(json.data as BookingStatus)
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-foreground">
          {t('title')}
        </h1>
        <span className="mx-auto mt-2.5 block h-[3px] w-12 rounded-full bg-amber-400" />
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Form */}
      {!submitted && !showSuccessBanner && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="booking-ref" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('bookingRef')}
            </Label>
            <Input
              id="booking-ref"
              value={ref}
              onChange={(e) => setRef(e.target.value.toUpperCase())}
              placeholder="BK-2026-0001"
              required
              className="h-11 border-border bg-background text-foreground font-mono text-sm uppercase placeholder:normal-case font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="track-phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('mobileNumber')}
            </Label>
            <div className="flex">
              <span className="flex h-11 items-center rounded-l-xl border border-r-0 border-border bg-muted/60 px-3 text-sm font-bold text-muted-foreground">
                +91
              </span>
              <Input
                id="track-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                required
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="98765 43210"
                className="h-11 flex-1 rounded-l-none border-border bg-background text-foreground text-sm font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-md transition-all hover:bg-amber-300 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Search className="size-4" />
            <span>{t('check')}</span>
          </button>
        </form>
      )}

      {/* Live Result */}
      {submitted && (
        <div className="mt-6 space-y-4">
          {loading && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-xs font-medium text-muted-foreground animate-pulse">
              {t('checking')}
            </div>
          )}

          {!loading && result && (
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="font-mono text-sm font-bold text-foreground">{result.booking_ref}</span>
                <span className="rounded-full bg-amber-400/20 text-primary border border-amber-400/30 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  {STATUS_LABELS[result.status] ?? result.status}
                </span>
              </div>
              <dl className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t('checkInLabel')}</dt>
                  <dd className="font-semibold text-foreground">{formatDateIST(result.check_in)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t('checkOutLabel')}</dt>
                  <dd className="font-semibold text-foreground">{formatDateIST(result.check_out)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-sm font-bold">
                  <dt className="text-muted-foreground">{t('balanceLabel')}</dt>
                  <dd className="font-mono text-primary font-bold">{formatCurrency(result.balance_due)}</dd>
                </div>
              </dl>
            </div>
          )}

          {!loading && notFound && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center">
              <AlertCircle className="size-6 text-destructive mx-auto mb-2" />
              <p className="text-xs font-semibold text-destructive">{t('notFound')}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setSubmitted(false)
              setResult(null)
              setNotFound(false)
            }}
            className="flex items-center justify-center gap-1.5 w-full text-xs font-bold uppercase tracking-wider text-primary hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            <span>{t('searchAgain')}</span>
          </button>
        </div>
      )}

      {/* Support Box */}
      <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-5 text-center space-y-3">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider">{t('needHelp')}</p>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <a
            href={telHref(contactPhone)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground transition hover:bg-muted"
          >
            <Phone className="size-3.5 text-primary" />
            <span>+91 {contactPhone}</span>
          </a>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#20bd5a]"
          >
            <span>💬</span>
            <span>{t('whatsApp')}</span>
          </a>
        </div>
      </div>
    </div>
  )
}
