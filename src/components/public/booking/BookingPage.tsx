'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check, Calendar, Users, BedDouble, ShieldCheck, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uuid } from '@/lib/uuid'
import { useAvailability, type AvailabilityRoomType } from '@/hooks/use-availability'
import { usePlaceHold, useReleaseHolds } from '@/hooks/use-public-booking'
import { DateGuestPanel } from './DateGuestPanel'
import { RoomPickerPanel } from './RoomPickerPanel'
import { GuestDetailsPanel, type GuestFormData } from './GuestDetailsPanel'
import { PaymentPanel, type BookingResult } from './PaymentPanel'
import { StickySummary } from './StickySummary'
import { SuccessScreen } from './SuccessScreen'
import { useBookingFlow, type FlowStep } from '@/store/booking-flow'

const STEP_MAP: Record<FlowStep, number> = {
  dates: 1,
  rooms: 2,
  guest: 3,
  payment: 4,
  success: 5,
}

function StepIndicator({ step }: { step: FlowStep }) {
  const t = useTranslations('booking')
  const STEP_LABELS: Record<number, string> = {
    1: t('stepDates'),
    2: t('stepRooms'),
    3: t('stepDetails'),
    4: t('stepPayment'),
  }
  const activeStep = STEP_MAP[step]

  return (
    <nav aria-label="Booking steps" className="flex items-center justify-center">
      {[1, 2, 3, 4].map((n, idx) => {
        const isDone = activeStep > n
        const isActive = activeStep === n

        return (
          <React.Fragment key={n}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex size-9 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300',
                  isDone && 'border-amber-400 bg-amber-400 text-zinc-950',
                  isActive &&
                    'border-amber-400 bg-amber-400 text-zinc-950 shadow-[0_0_0_4px_rgba(245,184,0,0.2)]',
                  !isDone && !isActive && 'border-border bg-card text-muted-foreground',
                )}
              >
                {isDone ? <Check className="size-4" strokeWidth={2.5} /> : n}
              </div>
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider',
                  isActive || isDone ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {STEP_LABELS[n]}
              </span>
            </div>
            {idx < 3 && (
              <div className="mx-2 mb-5 h-[2px] w-8 sm:w-16 overflow-hidden rounded bg-border">
                <div
                  className={cn(
                    'h-full rounded bg-amber-400 transition-all duration-500',
                    isDone ? 'w-full' : 'w-0',
                  )}
                />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

function StepSection({
  stepNum,
  title,
  isActive,
  isDone,
  doneSummary,
  onEdit,
  children,
}: {
  stepNum: number
  title: string
  isActive: boolean
  isDone: boolean
  doneSummary?: React.ReactNode
  onEdit?: () => void
  children: React.ReactNode
}) {
  const tCommon = useTranslations('booking')
  if (!isActive && !isDone) return null

  return (
    <section
      id={`booking-step-${stepNum}`}
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-2xl border bg-card transition-shadow',
        isActive
          ? 'border-amber-400/50 shadow-[0_12px_36px_-12px_rgba(245,184,0,0.18)]'
          : 'border-border shadow-xs',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-5 py-4 sm:px-6',
          isDone && !isActive && 'bg-muted/40 cursor-pointer transition hover:bg-muted/60',
        )}
        onClick={isDone && !isActive && onEdit ? onEdit : undefined}
        role={isDone && !isActive && onEdit ? 'button' : undefined}
        tabIndex={isDone && !isActive && onEdit ? 0 : undefined}
      >
        <div
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            isDone && !isActive && 'bg-amber-400 text-zinc-950',
            isActive && 'bg-amber-400 text-zinc-950 shadow-xs',
            !isDone && !isActive && 'bg-muted text-muted-foreground',
          )}
        >
          {isDone && !isActive ? <Check className="size-3.5" strokeWidth={2.5} /> : stepNum}
        </div>
        <h2 className="font-display text-base sm:text-lg font-bold text-foreground">{title}</h2>
        {isDone && !isActive && (
          <div className="ml-auto flex items-center gap-3">
            {doneSummary && (
              <span className="hidden text-xs text-muted-foreground sm:inline font-medium">
                {doneSummary}
              </span>
            )}
            {onEdit && (
              <span className="text-xs font-bold uppercase tracking-wider text-primary hover:underline">
                {tCommon('edit')}
              </span>
            )}
          </div>
        )}
      </div>

      {isActive && (
        <div className="border-t border-border px-5 py-5 sm:px-6">{children}</div>
      )}
    </section>
  )
}

type Props = {
  locale: string
  preselectedRoomTypeId?: string
  autoSearch?: boolean
  contactPhone?: string
  contactWhatsapp?: string
}

export function BookingPage({
  locale,
  preselectedRoomTypeId,
  autoSearch,
  contactPhone,
  contactWhatsapp,
}: Props) {
  const t = useTranslations('booking')

  const {
    step,
    setStep,
    checkIn,
    checkOut,
    guests,
    setDates,
    quantities,
    setQuantities,
    sessionId,
    holdExpiry,
    setHoldExpiry,
    guestData,
    setGuestData,
    reset,
  } = useBookingFlow()

  const [availabilityParams, setAvailabilityParams] = useState<{
    check_in: string
    check_out: string
    guests: number
  } | null>(null)

  const [idempotencyKey] = useState(() => uuid())
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null)
  const [holdReattemptFailed, setHoldReattemptFailed] = useState(false)

  const availability = useAvailability(availabilityParams)
  const placeHold = usePlaceHold()
  const releaseHolds = useReleaseHolds()

  const roomTypes = useMemo(
    () => availability.data?.data.room_types ?? [],
    [availability.data],
  )

  const effectiveQuantities = useMemo(() => {
    const result: Record<string, number> = {}
    for (const rt of roomTypes) {
      const raw = quantities[rt.id]
      const base =
        raw === undefined &&
        rt.id === preselectedRoomTypeId &&
        rt.available_count > 0
          ? 1
          : (raw ?? 0)
      result[rt.id] = Math.max(0, Math.min(base, rt.available_count))
    }
    return result
  }, [quantities, roomTypes, preselectedRoomTypeId])

  const gst = availability.data?.data.gst ?? null
  const payment = availability.data?.data.payment ?? null

  const grandTotal = useMemo(() => {
    const subtotal = roomTypes.reduce(
      (sum, rt) => sum + (effectiveQuantities[rt.id] ?? 0) * rt.pricing.subtotal,
      0,
    )
    const gstAmount = gst?.enabled ? Math.round(subtotal * gst.rate) / 100 : 0
    return subtotal + gstAmount
  }, [roomTypes, effectiveQuantities, gst])

  useEffect(() => {
    if (step === 'success' && !bookingResult) {
      reset()
    }
  }, [step, bookingResult, reset])

  const didMountStep = useRef(false)
  useEffect(() => {
    if (!didMountStep.current) {
      didMountStep.current = true
      return
    }
    document
      .getElementById(`booking-step-${STEP_MAP[step]}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  const hasDateSelection = !!checkIn && !!checkOut

  const didInitAvailability = useRef(false)
  useEffect(() => {
    if (didInitAvailability.current) return
    if (!hasDateSelection || availabilityParams) return

    const fromEntryPoint = autoSearch || !!preselectedRoomTypeId
    const resumingPastDates = step !== 'dates'
    if (fromEntryPoint || resumingPastDates) {
      didInitAvailability.current = true
      setAvailabilityParams({ check_in: checkIn, check_out: checkOut, guests })
      if (fromEntryPoint && step === 'dates') setStep('rooms')
    }
  }, [autoSearch, preselectedRoomTypeId, hasDateSelection, availabilityParams, checkIn, checkOut, guests, step, setStep])

  function handleSearch(ci: string, co: string, g: number) {
    setDates(ci, co, g)
    setAvailabilityParams({ check_in: ci, check_out: co, guests: g })
    setStep('rooms')
  }

  function handleQuantityChange(roomTypeId: string, qty: number) {
    setQuantities({ ...quantities, [roomTypeId]: qty })
  }

  async function handlePlaceHolds() {
    const entries = Object.entries(effectiveQuantities).filter(([, q]) => q > 0)
    if (entries.length === 0) return

    try {
      for (const [room_type_id, quantity] of entries) {
        await placeHold.mutateAsync({
          room_type_id,
          check_in: checkIn,
          check_out: checkOut,
          session_id: sessionId,
          quantity,
        })
      }
      setHoldExpiry(Date.now() + 5 * 60 * 1000)
      setStep('payment')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not hold room. Please try again.')
    }
  }

  function handleGuestContinue(data: GuestFormData) {
    setGuestData(data)
    handlePlaceHolds()
  }

  function handleBookingSuccess(result: BookingResult) {
    setBookingResult(result)
    setStep('success')
  }

  async function handleGoBackTo(targetStep: FlowStep) {
    const holdsPlaced = ['guest', 'payment'].includes(step)
    const goingBeforeHolds = ['dates', 'rooms'].includes(targetStep)
    if (holdsPlaced && goingBeforeHolds) {
      try {
        await releaseHolds.mutateAsync(sessionId)
      } catch {
        /* ignore */
      }
      setHoldExpiry(null)
    }
    setStep(targetStep)
  }

  const bookingPayload = useMemo(
    () => ({
      guest: guestData
        ? {
            fullname: guestData.fullname,
            phone: guestData.phone,
            email: guestData.email ?? undefined,
            city: guestData.city ?? undefined,
            preferred_language: guestData.preferred_language,
          }
        : undefined,
      special_requests: guestData?.special_requests ?? undefined,
      check_in: checkIn,
      check_out: checkOut,
      rooms: Object.entries(effectiveQuantities)
        .filter(([, q]) => q > 0)
        .map(([room_type_id, quantity]) => ({ room_type_id, quantity })),
      session_id: sessionId,
      idempotency_key: idempotencyKey,
    }),
    [guestData, checkIn, checkOut, effectiveQuantities, sessionId, idempotencyKey],
  )

  const datesDoneSummary =
    checkIn && checkOut ? `${checkIn} → ${checkOut} · ${guests} ${guests > 1 ? t('guestPlural', { count: guests }) : t('guestSingle')}` : null

  const roomsDoneSummary = roomTypes.length > 0
    ? Object.entries(effectiveQuantities)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => {
          const rt = roomTypes.find((r) => r.id === id)
          if (!rt) return null
          const name = typeof rt.name === 'string' ? rt.name : ((rt.name as Record<string, string>)[locale] ?? (rt.name as Record<string, string>).en ?? 'Room')
          return `${q}× ${name}`
        })
        .filter(Boolean)
        .join(', ') || null
    : null

  const guestDoneSummary = guestData
    ? `${guestData.fullname} · +91 ${guestData.phone.slice(0, 5)}*****`
    : null

  const stepNum = STEP_MAP[step]

  if (step === 'success' && bookingResult) {
    return (
      <SuccessScreen
        bookingRef={bookingResult.booking_ref}
        totalAmount={bookingResult.total_amount}
        gstAmount={bookingResult.gst_amount}
        balanceDue={bookingResult.balance_due}
        paymentPath={bookingResult.payment_path}
        locale={locale}
        contactWhatsapp={contactWhatsapp}
      />
    )
  }

  if (step === 'success') return null

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 pb-32 lg:pb-16">
      {/* Branded Header */}
      <header className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Sparkles className="size-3 text-amber-500" />
          <span>Hotel Morya Lodging</span>
        </span>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-foreground">
          {t('title')}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          {t('subtitle')}
        </p>
      </header>

      {/* Step Indicator */}
      <StepIndicator step={step} />

      <div className="mt-8 space-y-4">
        {/* STEP 1: Dates & Guests */}
        <StepSection
          stepNum={1}
          title={t('datesTitle')}
          isActive={step === 'dates'}
          isDone={stepNum > 1}
          doneSummary={datesDoneSummary}
          onEdit={stepNum > 1 ? () => handleGoBackTo('dates') : undefined}
        >
          <DateGuestPanel
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            isLoading={availability.isFetching}
            onSearch={handleSearch}
          />
        </StepSection>

        {/* STEP 2: Room Selection */}
        {stepNum >= 2 && (
          <StepSection
            stepNum={2}
            title={t('roomsTitle')}
            isActive={step === 'rooms'}
            isDone={stepNum > 2}
            doneSummary={roomsDoneSummary}
            onEdit={stepNum > 2 ? () => handleGoBackTo('rooms') : undefined}
          >
            {availability.isLoading && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40"
                  />
                ))}
              </div>
            )}
            {availability.isError && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
                {availability.error?.message ?? t('errorLoadingRooms')}
              </p>
            )}
            {availability.isSuccess && (
              <RoomPickerPanel
                roomTypes={roomTypes}
                gst={gst ?? { enabled: false, rate: 0 }}
                quantities={effectiveQuantities}
                locale={locale}
                isPlacingHold={placeHold.isPending}
                holdReattemptFailed={holdReattemptFailed}
                onQuantityChange={(id, qty) => {
                  if (holdReattemptFailed) setHoldReattemptFailed(false)
                  handleQuantityChange(id, qty)
                }}
                onContinue={() => setStep('guest')}
              />
            )}
          </StepSection>
        )}

        {/* STEP 3: Devotee Details */}
        {stepNum >= 3 && (
          <StepSection
            stepNum={3}
            title={t('guestDetailsTitle')}
            isActive={step === 'guest'}
            isDone={stepNum > 3}
            doneSummary={guestDoneSummary}
            onEdit={step === 'payment' ? () => handleGoBackTo('guest') : undefined}
          >
            <GuestDetailsPanel locale={locale} onContinue={handleGuestContinue} />
          </StepSection>
        )}

        {/* STEP 4: Confirm & Payment */}
        {step === 'payment' && (
          <StepSection
            stepNum={4}
            title={t('paymentTitle')}
            isActive={true}
            isDone={false}
          >
            <PaymentPanel
              bookingPayload={bookingPayload}
              onSuccess={handleBookingSuccess}
              upiQrUrl={payment?.upi_qr_url ?? null}
              upiId={payment?.upi_id ?? null}
              totalAmount={grandTotal}
              contactPhone={contactPhone}
            />
          </StepSection>
        )}
      </div>

      {/* Sticky Mobile Summary */}
      <StickySummary
        checkIn={checkIn}
        checkOut={checkOut}
        quantities={effectiveQuantities}
        roomTypes={roomTypes}
        gst={gst}
        visible={stepNum >= 2}
      />
    </div>
  )
}
