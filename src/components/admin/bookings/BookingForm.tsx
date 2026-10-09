'use client'

import { IconCalendar, IconMinus, IconPlus } from '@tabler/icons-react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { GuestPicker } from '@/components/admin/bookings/GuestPicker'
import { useCreateBooking } from '@/hooks/use-bookings'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, currentDateIST } from '@/lib/format'
import { resolveNightlyRate, nightsBetween, type RateOverride } from '@/lib/pricing'
import { uuid } from '@/lib/uuid'
import { bookingSchema, type BookingInput } from '@/schemas/booking'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// z.input gives the form-level type (pre-coercion). Use with useForm so
// number fields typed as z.coerce.number() are valid as strings from inputs.
type FormValues = z.input<typeof bookingSchema>

type RoomTypeLite = {
  id: string
  name: { en: string; mr?: string; hi?: string } | string
  base_rate: number
  max_guests: number
  day_use_rate: number | null
}

type HotelSettings = {
  gst_enabled: boolean | null
  gst_rate: number | null
}

function getRoomTypeName(name: RoomTypeLite['name']): string {
  if (!name) return 'Untitled'
  if (typeof name === 'string') return name
  return (name as { en: string }).en ?? 'Untitled'
}

/** Returns a yyyy-mm-dd date that is exactly 1 calendar day after the input.
 * All math is in UTC — parsing as local time then formatting via toISOString()
 * rolls the date backwards in IST (UTC+5:30), which would make check_out equal
 * check_in and silently fail the day-use validation. */
function addOneDayISO(date: string): string {
  if (!date) return ''
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// ─────────────────────────────────────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────────────────────────────────────

async function fetchFormData() {
  const supabase = createClient()

  const [
    { data: roomTypes, error: rtErr },
    { data: overrides, error: ovErr },
    { data: settings, error: stErr },
  ] = await Promise.all([
    supabase
      .from('room_types')
      .select('id,name,base_rate,max_guests,day_use_rate')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order')
      .order('created_at'),
    supabase.from('rate_overrides').select('room_type_id,start_date,end_date,rate'),
    supabase.from('hotel_settings').select('gst_enabled,gst_rate').maybeSingle(),
  ])

  if (rtErr) throw rtErr
  if (ovErr) throw ovErr
  if (stErr) throw stErr

  return {
    roomTypes: (roomTypes ?? []) as RoomTypeLite[],
    overrides: (overrides ?? []) as (RateOverride & { room_type_id: string })[],
    settings: settings as HotelSettings | null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Availability fetching
// ─────────────────────────────────────────────────────────────────────────────

type AvailabilityRoomType = {
  id: string
  available_count: number
  max_guests: number
}

async function fetchAvailability(
  checkIn: string,
  checkOut: string
): Promise<Map<string, number>> {
  const res = await fetch(
    `/api/availability?check_in=${checkIn}&check_out=${checkOut}`
  )
  if (!res.ok) throw new Error('Failed to fetch availability')
  const json = (await res.json()) as {
    data: { room_types: AvailabilityRoomType[] }
  }
  const map = new Map<string, number>()
  for (const rt of json.data.room_types ?? []) {
    map.set(rt.id, rt.available_count)
  }
  return map
}

// ─────────────────────────────────────────────────────────────────────────────
// Quantity stepper
// ─────────────────────────────────────────────────────────────────────────────

function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 10,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Decrease"
      >
        <IconMinus size={12} />
      </button>
      <span className="w-6 text-center text-sm font-medium text-text-primary tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Increase"
      >
        <IconPlus size={12} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sticky summary panel
// ─────────────────────────────────────────────────────────────────────────────

type SummaryLine = {
  roomTypeId: string
  roomTypeName: string
  qty: number
  rate: number
  nights: number
}

function SummaryPanel({
  checkIn,
  checkOut,
  nights,
  lines,
  discountAmount,
  gstAmount,
  gstEnabled,
  gstRate,
  isDayUse,
}: {
  checkIn: string
  checkOut: string
  nights: number
  lines: SummaryLine[]
  discountAmount: number
  gstAmount: number
  gstEnabled: boolean
  gstRate: number
  isDayUse: boolean
}) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.rate * l.nights, 0)
  const grandTotal = subtotal - (discountAmount || 0) + (gstEnabled ? gstAmount : 0)

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4 text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        Booking summary
      </p>

      {/* Date / stay label */}
      {isDayUse ? (
        checkIn ? (
          <div className="mb-2 flex items-center gap-1.5 text-text-secondary">
            <IconCalendar size={13} />
            <span>Day use · {checkIn}</span>
          </div>
        ) : null
      ) : (
        checkIn && checkOut && nights > 0 ? (
          <div className="mb-2 flex items-center gap-1.5 text-text-secondary">
            <IconCalendar size={13} />
            <span>
              {checkIn} → {checkOut} · {nights} {nights === 1 ? 'night' : 'nights'}
            </span>
          </div>
        ) : null
      )}

      {/* Room lines */}
      {lines.length > 0 ? (
        <ul className="space-y-1 border-t border-border pt-2">
          {lines.map((l) => (
            <li key={l.roomTypeId} className="flex justify-between gap-2">
              <span className="text-text-secondary">
                {isDayUse
                  ? `${l.qty}× ${l.roomTypeName}`
                  : `${l.qty}× ${l.roomTypeName} × ${l.nights}n`}
              </span>
              <span className="font-mono tabular-nums text-text-primary">
                {formatCurrency(l.qty * l.rate * l.nights)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-text-tertiary">No rooms selected yet</p>
      )}

      {/* Totals */}
      {lines.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-border pt-2">
          <div className="flex justify-between text-text-secondary">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
          </div>

          {(discountAmount || 0) > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Discount</span>
              <span className="font-mono tabular-nums">−{formatCurrency(discountAmount)}</span>
            </div>
          )}

          {gstEnabled && (
            <div className="flex justify-between text-text-secondary">
              <span>GST ({gstRate}%)</span>
              <span className="font-mono tabular-nums">+{formatCurrency(gstAmount)}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-text-primary">
            <span>Grand total</span>
            <span className="font-mono tabular-nums">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BookingForm — main component
// ─────────────────────────────────────────────────────────────────────────────

export function BookingForm() {
  const router = useRouter()
  const createBooking = useCreateBooking()

  // Stable idempotency key for this form mount (state initializer is render-safe)
  const [idempotencyKey] = useState(() => uuid())

  // Per room-type quantity state (drives derived rooms[] on submit)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  // Guest state — managed outside RHF since GuestPicker is a custom component
  const [guestId, setGuestId] = useState<string>('')
  const [guestError, setGuestError] = useState<string>('')

  const today = currentDateIST()

  const form = useForm<FormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      guest_id: undefined,
      check_in: today,
      check_out: '',
      stay_type: 'overnight',
      source: 'walkin',
      rooms: [],
      total_amount: 0,
      discount_amount: 0,
      discount_reason: '',
      gst_amount: 0,
      special_requests: '',
      additional_guests: '',
      group_ref: '',
      is_backdated: false,
      backdated_reason: '',
      idempotency_key: idempotencyKey,
      day_use_from: '',
      day_use_to: '',
    },
  })

  const { data, isLoading, error: dataError } = useQuery({
    queryKey: ['booking-form-data'],
    queryFn: fetchFormData,
    staleTime: 60_000,
  })

  const watchCheckIn = useWatch({ control: form.control, name: 'check_in' })
  const watchCheckOut = useWatch({ control: form.control, name: 'check_out' })
  const watchDiscount = useWatch({ control: form.control, name: 'discount_amount' })
  const watchStayType = useWatch({ control: form.control, name: 'stay_type' })

  const isDayUse = watchStayType === 'day_use'

  // Derive isPast from check-in date — auto-set is_backdated (belt-and-suspenders)
  const isPast = !!watchCheckIn && watchCheckIn < currentDateIST()
  const prevIsPastRef = useRef(isPast)
  useEffect(() => {
    if (prevIsPastRef.current !== isPast) {
      prevIsPastRef.current = isPast
      form.setValue('is_backdated', isPast, { shouldValidate: form.formState.isSubmitted })
    }
  }, [isPast, form])

  // Effective check-out for availability queries:
  // day-use: checkIn + 1 day; overnight: watchCheckOut
  const effectiveCheckOut = isDayUse
    ? (watchCheckIn ? addOneDayISO(watchCheckIn) : '')
    : (watchCheckOut ?? '')

  const availabilityEnabled =
    !!watchCheckIn && !!effectiveCheckOut && effectiveCheckOut > watchCheckIn

  const {
    data: availabilityMap,
    isFetching: availabilityFetching,
  } = useQuery({
    queryKey: ['availability', watchCheckIn, effectiveCheckOut],
    queryFn: () => fetchAvailability(watchCheckIn!, effectiveCheckOut),
    enabled: availabilityEnabled,
    staleTime: 30_000,
  })

  const nights = isDayUse ? 1 : nightsBetween(watchCheckIn ?? '', watchCheckOut ?? '')

  const roomTypes = data?.roomTypes ?? []
  const overrides = data?.overrides ?? []
  const settings = data?.settings ?? null
  const gstEnabled = !!(settings?.gst_enabled)
  const gstRate = settings?.gst_rate ?? 0

  // Effective quantity = the user's chosen qty clamped to current availability.
  // Clamping at point-of-use (not via a setState effect) keeps us from ever
  // overbooking when the dates change to a busier window, without cascading
  // renders. availabilityMap == null means "unknown" (no dates / loading) → no clamp.
  function effQty(rtId: string): number {
    const raw = quantities[rtId] ?? 0
    const avail = availabilityMap?.get(rtId)
    return avail == null ? raw : Math.min(raw, avail)
  }
  // A type is shown as "reduced" when the raw pick exceeds what's now available.
  function wasClamped(rtId: string): boolean {
    const avail = availabilityMap?.get(rtId)
    return avail != null && (quantities[rtId] ?? 0) > avail
  }

  function handleQuantityChange(roomTypeId: string, qty: number) {
    setQuantities((prev) => ({ ...prev, [roomTypeId]: qty }))
  }

  // Whether any room type offers a day-use rate
  const anyDayUseAvailable = roomTypes.some((rt) => rt.day_use_rate != null)

  // Build resolved rates per room type (keyed by room_type_id). Plain
  // computation — the React Compiler memoizes; a manual useMemo here trips
  // react-hooks/preserve-manual-memoization.
  const resolvedRates: Record<string, number> = {}
  for (const rt of roomTypes) {
    const rtOverrides = overrides
      .filter((o) => o.room_type_id === rt.id)
      .map((o) => ({ start_date: o.start_date, end_date: o.end_date, rate: o.rate }))
    resolvedRates[rt.id] = resolveNightlyRate(
      rt.base_rate,
      rtOverrides,
      watchCheckIn ?? today
    )
  }

  // True when a festival override is active for the check-in date (overnight only)
  const hasOverride: Record<string, boolean> = {}
  {
    const dateKey = watchCheckIn ?? today
    for (const rt of roomTypes) {
      const rtOverrides = overrides.filter((o) => o.room_type_id === rt.id)
      hasOverride[rt.id] = rtOverrides.some(
        (o) => o.start_date <= dateKey && dateKey <= o.end_date
      )
    }
  }

  // Effective rate per room type for the current mode
  function effectiveRate(rt: RoomTypeLite): number {
    if (isDayUse) return rt.day_use_rate ?? 0
    return resolvedRates[rt.id] ?? rt.base_rate
  }

  // Summary lines for the side panel
  const summaryLines: SummaryLine[] = roomTypes
    .filter((rt) => {
      if (effQty(rt.id) === 0) return false
      if (isDayUse && rt.day_use_rate == null) return false
      return true
    })
    .map((rt) => ({
      roomTypeId: rt.id,
      roomTypeName: getRoomTypeName(rt.name),
      qty: effQty(rt.id),
      rate: effectiveRate(rt),
      nights,
    }))

  const roomSubtotal = summaryLines.reduce((s, l) => s + l.qty * l.rate * l.nights, 0)
  const discountAmount = Number(watchDiscount) || 0
  const computedGst = gstEnabled
    ? Math.round((gstRate / 100) * Math.max(0, roomSubtotal - discountAmount))
    : 0
  const grandTotal = Math.max(0, roomSubtotal - discountAmount + (gstEnabled ? computedGst : 0))

  // When day-use mode is toggled on, auto-sync check_out to check_in + 1 day.
  // Also keep check_out in sync whenever check_in changes while in day-use mode.
  useEffect(() => {
    if (isDayUse && watchCheckIn) {
      form.setValue('check_out', addOneDayISO(watchCheckIn), { shouldValidate: false })
    }
  }, [isDayUse, watchCheckIn, form])

  // `rooms` is derived from the quantity steppers + dates, but the Zod resolver
  // validates it on submit — so keep the RHF field in sync, otherwise it stays
  // [] and "Select at least one room" blocks every booking.
  useEffect(() => {
    const ci = watchCheckIn ?? today
    const built = roomTypes
      .filter((rt) => {
        if (effQty(rt.id) === 0) return false
        if (isDayUse && rt.day_use_rate == null) return false
        return true
      })
      .flatMap((rt) => {
        let rate: number
        let n: number
        if (isDayUse) {
          rate = rt.day_use_rate ?? 0
          n = 1
        } else {
          const ovs = overrides
            .filter((o) => o.room_type_id === rt.id)
            .map((o) => ({ start_date: o.start_date, end_date: o.end_date, rate: o.rate }))
          rate = resolveNightlyRate(rt.base_rate, ovs, ci)
          n = nightsBetween(watchCheckIn ?? '', watchCheckOut ?? '')
        }
        return Array.from({ length: effQty(rt.id) }).map(() => ({
          room_type_id: rt.id,
          rate_per_night: rate,
          nights: n,
        }))
      })
    form.setValue('rooms', built, { shouldValidate: form.formState.isSubmitted })
  }, [quantities, watchCheckIn, watchCheckOut, isDayUse, roomTypes, overrides, today, form])

  // Surface validation failures that land on hidden fields (e.g. check_out in
  // day-use mode) so the Create button never just silently does nothing.
  function onInvalid(errors: typeof form.formState.errors) {
    const first = Object.values(errors)[0]
    const msg =
      (first && 'message' in first ? (first.message as string) : '') ||
      'Please check the highlighted fields'
    toast.error(msg)
  }

  function onSubmit(values: FormValues) {
    // Validate guest
    if (!guestId) {
      setGuestError('Please select or add a guest')
      return
    }
    setGuestError('')

    // Build rooms array from quantity map
    const rooms = roomTypes
      .filter((rt) => {
        if (effQty(rt.id) === 0) return false
        if (isDayUse && rt.day_use_rate == null) return false
        return true
      })
      .flatMap((rt) => {
        const rate = isDayUse
          ? (rt.day_use_rate ?? 0)
          : (resolvedRates[rt.id] ?? rt.base_rate)
        const n = isDayUse ? 1 : nights
        return Array.from({ length: effQty(rt.id) }).map(() => ({
          room_type_id: rt.id,
          rate_per_night: rate,
          nights: n,
        }))
      })

    if (rooms.length === 0) {
      form.setError('rooms', { message: 'Select at least one room' })
      return
    }

    // Cast to BookingInput (z.infer output type) for the API
    const payload: BookingInput = {
      ...(values as unknown as BookingInput),
      guest_id: guestId,
      stay_type: isDayUse ? 'day_use' : 'overnight',
      rooms,
      total_amount: grandTotal,
      gst_amount: computedGst,
      idempotency_key: idempotencyKey,
    }

    createBooking.mutate(payload, {
      onSuccess: (booking: { id: string }) => {
        toast.success('Booking created')
        router.push(`/admin/bookings/${booking.id}`)
      },
      onError: (err: Error) => {
        toast.error(err.message)
      },
    })
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-tertiary">
        <Loader2 className="animate-spin" size={22} />
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        Failed to load form data. Please refresh.
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:px-6"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* ── Left column: form fields ─────────────────────────────────── */}
          <div className="space-y-6">

            {/* ── Section: Guest ────────────────────────────────────────── */}
            <section className="rounded-xl border border-border bg-surface-1 p-4 sm:p-5">
              <h2 className="mb-4 text-sm font-semibold text-text-primary">Guest</h2>
              <GuestPicker
                onSelect={(id) => {
                  setGuestId(id)
                  if (id) setGuestError('')
                }}
                error={guestError}
              />
            </section>

            {/* ── Section: Booking details ──────────────────────────────── */}
            <section className="rounded-xl border border-border bg-surface-1 p-4 sm:p-5">
              <h2 className="mb-4 text-sm font-semibold text-text-primary">Booking details</h2>

              {/* Day-use toggle */}
              <FormField
                control={form.control}
                name="stay_type"
                render={({ field }) => (
                  <FormItem className="mb-4 flex items-start gap-2.5">
                    <FormControl>
                      <Checkbox
                        checked={field.value === 'day_use'}
                        onCheckedChange={(checked) => {
                          field.onChange(checked ? 'day_use' : 'overnight')
                        }}
                        className="mt-0.5"
                        disabled={!anyDayUseAvailable}
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="cursor-pointer text-sm text-text-primary">
                        Day use (few hours)
                      </FormLabel>
                      {anyDayUseAvailable ? (
                        <p className="text-xs text-text-tertiary">
                          Single-day room usage at the day-use rate. Check-out is set automatically.
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          No room types are set up for day use — open Room types and set a day-use rate on a type.
                        </p>
                      )}
                    </div>
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Source */}
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-text-secondary">Source</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="walkin">Walk-in</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="website">Website</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Group ref */}
                <FormField
                  control={form.control}
                  name="group_ref"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-text-secondary">
                        Group reference <span className="text-text-disabled">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          placeholder="e.g. WEDDING-2026"
                          className="h-8"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Check-in */}
                <FormField
                  control={form.control}
                  name="check_in"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-text-secondary">
                        {isDayUse ? 'Date' : 'Check-in'}{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="h-8" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Check-out — hidden in day-use mode */}
                {!isDayUse && (
                  <FormField
                    control={form.control}
                    name="check_out"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-text-secondary">
                          Check-out <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="date"
                            min={watchCheckIn ?? today}
                            className="h-8"
                          />
                        </FormControl>
                        <FormMessage />
                        {nights > 0 && (
                          <p className="text-xs text-text-tertiary">
                            {nights} {nights === 1 ? 'night' : 'nights'}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                )}

                {/* Day-use time window — only shown when day-use is on */}
                {isDayUse && (
                  <>
                    <FormField
                      control={form.control}
                      name="day_use_from"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-text-secondary">
                            Expected from{' '}
                            <span className="text-text-disabled">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              name={field.name}
                              ref={field.ref}
                              onBlur={field.onBlur}
                              onChange={field.onChange}
                              value={(field.value as string | undefined) ?? ''}
                              type="time"
                              className="h-8"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="day_use_to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-text-secondary">
                            Expected to{' '}
                            <span className="text-text-disabled">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              name={field.name}
                              ref={field.ref}
                              onBlur={field.onBlur}
                              onChange={field.onChange}
                              value={(field.value as string | undefined) ?? ''}
                              type="time"
                              className="h-8"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </section>

            {/* ── Section: Room selection ───────────────────────────────── */}
            <section className="rounded-xl border border-border bg-surface-1 p-4 sm:p-5">
              <div className="mb-1 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-text-primary">Rooms</h2>
                {availabilityFetching && (
                  <Loader2 className="size-3.5 animate-spin text-text-tertiary" />
                )}
              </div>
              <p className="mb-4 text-xs text-text-tertiary">
                Select room types and quantities. Specific rooms are assigned at check-in.
              </p>

              {/* Rooms validation error */}
              {form.formState.errors.rooms && (
                <p className="mb-3 text-[0.8rem] font-medium text-destructive">
                  {form.formState.errors.rooms.message ?? 'Select at least one room'}
                </p>
              )}

              {roomTypes.length === 0 ? (
                <p className="text-sm text-text-tertiary">
                  No active room types found. Add room types in Settings first.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {roomTypes.map((rt) => {
                    const qty = effQty(rt.id)
                    const isUnavailableForDayUse = isDayUse && rt.day_use_rate == null
                    const rate = isDayUse
                      ? (rt.day_use_rate ?? 0)
                      : (resolvedRates[rt.id] ?? rt.base_rate)
                    const isFestival = !isDayUse && hasOverride[rt.id]

                    // Availability for this room type
                    const availCount = availabilityMap?.get(rt.id)
                    const isFullyBooked =
                      availabilityMap != null && !isUnavailableForDayUse && availCount === 0
                    // Max for the stepper: if availability is known, cap to it; otherwise 10
                    const stepperMax = isUnavailableForDayUse
                      ? 0
                      : availabilityMap != null
                        ? (availCount ?? 0)
                        : 10

                    const isClamped = wasClamped(rt.id)

                    return (
                      <div
                        key={rt.id}
                        className={`flex items-start gap-4 py-3 first:pt-0 last:pb-0 ${isUnavailableForDayUse ? 'opacity-40' : ''}`}
                      >
                        {/* Room type info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-text-primary">
                              {getRoomTypeName(rt.name)}
                            </span>
                            {isFestival && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                Festival rate
                              </span>
                            )}
                            {isUnavailableForDayUse && (
                              <span className="text-[10px] text-text-disabled italic">
                                Not offered as a day room
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-tertiary">
                            Up to {rt.max_guests} guest{rt.max_guests !== 1 ? 's' : ''}
                          </p>

                          {/* Availability count */}
                          {!isUnavailableForDayUse && (
                            <p
                              className={`mt-0.5 text-[11px] ${
                                isFullyBooked
                                  ? 'font-medium text-destructive'
                                  : availabilityMap != null
                                    ? 'text-text-tertiary'
                                    : 'text-text-disabled'
                              }`}
                            >
                              {availabilityMap == null
                                ? availabilityEnabled
                                  ? '—'
                                  : 'Set dates to see availability'
                                : isFullyBooked
                                  ? 'Fully booked'
                                  : `${availCount} available`}
                            </p>
                          )}

                          {/* Clamp warning */}
                          {isClamped && (
                            <p className="mt-0.5 text-[11px] font-medium text-destructive">
                              Only {availCount} available — reduced
                            </p>
                          )}
                        </div>

                        {/* Rate */}
                        <div className="pt-0.5 text-right">
                          {!isUnavailableForDayUse && (
                            <>
                              <p className="font-mono text-sm font-medium tabular-nums text-text-primary">
                                {formatCurrency(rate)}
                              </p>
                              <p className="text-[10px] text-text-tertiary">
                                {isDayUse ? '/ day use' : '/ night'}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Qty stepper */}
                        <div className="pt-0.5">
                          <QuantityStepper
                            value={qty}
                            onChange={(v) => handleQuantityChange(rt.id, v)}
                            max={stepperMax}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ── Section: Additional details ───────────────────────────── */}
            <section className="rounded-xl border border-border bg-surface-1 p-4 sm:p-5">
              <h2 className="mb-4 text-sm font-semibold text-text-primary">Additional details</h2>

              <div className="space-y-4">
                {/* Special requests */}
                <FormField
                  control={form.control}
                  name="special_requests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-text-secondary">
                        Special requests
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ''}
                          placeholder="e.g. Ground floor room, early check-in…"
                          className="min-h-[80px] text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Additional guests */}
                <FormField
                  control={form.control}
                  name="additional_guests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-text-secondary">
                        Additional guest names{' '}
                        <span className="text-text-disabled">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          placeholder="e.g. Sunita Patil, Raj Patil"
                          className="h-8"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Discount */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="discount_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-text-secondary">
                          Discount amount (₹)
                        </FormLabel>
                        <FormControl>
                          <Input
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            value={field.value as string | number | undefined}
                            type="number"
                            min={0}
                            placeholder="0"
                            className="h-8 font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {discountAmount > 0 && (
                    <FormField
                      control={form.control}
                      name="discount_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-text-secondary">
                            Discount reason <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ''}
                              placeholder="e.g. Repeat guest, staff discount"
                              className="h-8"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Backdated reason — shown automatically when check-in is in the past */}
                {isPast && (
                  <FormField
                    control={form.control}
                    name="backdated_reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-text-secondary">
                          Reason for backdating <span className="text-destructive">*</span>
                        </FormLabel>
                        <p className="mb-1 text-[11px] text-amber-600 dark:text-amber-400">
                          Check-in is in the past — reason required
                        </p>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder="e.g. Guest arrived yesterday, system was offline"
                            className="h-8"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </section>

            {/* Mobile: summary + actions inline (scrolls with the form, so it
                never fights the bottom nav / elevated FAB). No sticky bar. */}
            <div className="space-y-4 lg:hidden">
              <SummaryPanel
                checkIn={watchCheckIn ?? ''}
                checkOut={watchCheckOut ?? ''}
                nights={nights}
                lines={summaryLines}
                discountAmount={discountAmount}
                gstAmount={computedGst}
                gstEnabled={gstEnabled}
                gstRate={gstRate ?? 0}
                isDayUse={isDayUse}
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={createBooking.isPending}
                  size="lg"
                  className="w-full bg-accent-500 text-white hover:bg-accent-700"
                >
                  {createBooking.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                  Create booking
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/admin/bookings')}
                  disabled={createBooking.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>

          {/* ── Right column: sticky summary (desktop) ───────────────────── */}
          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <SummaryPanel
                checkIn={watchCheckIn ?? ''}
                checkOut={watchCheckOut ?? ''}
                nights={nights}
                lines={summaryLines}
                discountAmount={discountAmount}
                gstAmount={computedGst}
                gstEnabled={gstEnabled}
                gstRate={gstRate ?? 0}
                isDayUse={isDayUse}
              />

              {/* Action buttons — desktop */}
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={createBooking.isPending}
                  className="w-full bg-accent-500 text-white hover:bg-accent-700"
                  size="lg"
                >
                  {createBooking.isPending && (
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                  )}
                  Create booking
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/admin/bookings')}
                  disabled={createBooking.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>

      </form>
    </Form>
  )
}
