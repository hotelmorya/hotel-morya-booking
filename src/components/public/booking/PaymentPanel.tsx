'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Phone, CheckCircle2 } from 'lucide-react'
import { RadioGroup, RadioCardOption } from '@/components/ui/radio-group'
import { TurnstileWidget } from './TurnstileWidget'
import { useCreatePublicBooking } from '@/hooks/use-public-booking'
import { HOTEL, telHref, waHref } from '@/lib/site'

export type BookingResult = {
  id: string
  booking_ref: string
  status: string
  total_amount: number
  gst_amount: number
  balance_due: number
  payment_path: string
  whatsapp_link?: string | null
}

type Props = {
  bookingPayload: Record<string, unknown>
  onSuccess: (result: BookingResult) => void
  upiQrUrl: string | null
  upiId: string | null
  totalAmount: number
  contactPhone?: string
  contactWhatsapp?: string
}

type PaymentPath = 'hotel' | 'upi'

export function PaymentPanel({
  bookingPayload,
  onSuccess,
  upiQrUrl,
  upiId,
  totalAmount,
  contactPhone,
  contactWhatsapp,
}: Props) {
  const t = useTranslations('booking')
  const upiEnabled = !!upiQrUrl || !!upiId
  const [paymentPath, setPaymentPath] = useState<PaymentPath>(
    upiEnabled ? 'upi' : 'hotel',
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string>('')
  const [qrFailed, setQrFailed] = useState(false)

  const createBooking = useCreatePublicBooking()

  const hotelName = HOTEL.name
  const hotelPhone = contactPhone || HOTEL.phones[0]
  const waNumber = contactWhatsapp || HOTEL.whatsapp

  // UPI deep link for mobile one-tap pay
  const upiLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(hotelName)}${
        totalAmount > 0 ? `&am=${totalAmount.toFixed(2)}` : ''
      }&cu=INR&tn=${encodeURIComponent(`${hotelName} booking`)}`
    : null

  async function handleConfirm() {
    if (isProcessing) return
    if (!turnstileToken) {
      toast.error(t('verifyHuman'))
      return
    }
    setIsProcessing(true)

    try {
      const bookingRes = await createBooking.mutateAsync({
        ...bookingPayload,
        payment_path: paymentPath,
        turnstile_token: turnstileToken,
      })
      const booking: BookingResult = bookingRes.data ?? bookingRes
      onSuccess(booking)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create booking')
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Payment option cards */}
      <RadioGroup
        value={paymentPath}
        onValueChange={(v) => setPaymentPath(v as PaymentPath)}
        className="space-y-3"
      >
        {upiEnabled && (
          <RadioCardOption
            value="upi"
            label={<span className="font-bold text-foreground">{t('payUpi')}</span>}
            description={<span className="text-muted-foreground">{t('payUpiNote')}</span>}
          />
        )}
        <RadioCardOption
          value="hotel"
          label={<span className="font-bold text-foreground">{t('payHotel')}</span>}
          description={<span className="text-muted-foreground">{t('payHotelNote')}</span>}
        />
      </RadioGroup>

      {/* UPI section */}
      {paymentPath === 'upi' && (upiLink || upiQrUrl) && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-400/30 bg-muted/30 p-5">
          {upiLink && (
            <a
              href={upiLink}
              className="inline-flex h-11 w-full max-w-xs items-center justify-center rounded-xl bg-amber-400 font-bold text-xs uppercase tracking-wider text-zinc-950 shadow-md transition hover:bg-amber-300 active:scale-95"
            >
              {t('payUpiApp')}
            </a>
          )}
          {upiQrUrl && !qrFailed && (
            <>
              {upiLink && (
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {t('orScanQr')}
                </span>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={upiQrUrl}
                alt={t('payUpi')}
                onError={() => setQrFailed(true)}
                className="size-48 rounded-xl bg-white object-contain p-2 shadow-xs border border-border"
              />
            </>
          )}
          {(!upiQrUrl || qrFailed) && upiId && (
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                UPI VPA ID
              </p>
              <p className="mt-0.5 select-all font-mono text-sm font-bold text-foreground">
                {upiId}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Human bot verification */}
      <div className="pt-1">
        <TurnstileWidget onToken={(token) => setTurnstileToken(token)} />
      </div>

      {/* Confirm CTA */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isProcessing}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-amber-400 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-md transition-all hover:bg-amber-300 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isProcessing ? t('processing') : t('confirmBooking')}
      </button>

      {/* Help assistance block */}
      <div className="border-t border-border pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          {t('needHelp')}{' '}
          <a
            href={telHref(hotelPhone)}
            className="font-bold text-foreground hover:underline ml-1"
          >
            📞 +91 {hotelPhone}
          </a>
        </p>
      </div>
    </div>
  )
}
