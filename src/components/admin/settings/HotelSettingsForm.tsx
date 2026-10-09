'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { IconCheck, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveHotelSettings } from '@/lib/actions/hotel-settings'
import { hotelSettingsUpdateSchema } from '@/schemas/hotel-settings'
import type { Tables } from '@/types/database'

type HotelSettings = Tables<'hotel_settings'>

// The public site is non-CMS: branding (logo, hotel name, slug, description,
// map URL, theme color, cancellation policy) is no longer editable here. This
// tab manages only booking/operational data. We use the partial settings schema
// (so the removed required fields aren't demanded) but re-add the GST refine so
// "GST number required when GST is enabled" still validates client-side.
const formSchema = hotelSettingsUpdateSchema.refine(
  (s) => !s.gst_enabled || !!s.gst_number,
  { message: 'GST number is required when GST is enabled', path: ['gst_number'] }
)
type FormValues = z.input<typeof formSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Toggle (kept as custom — no Switch primitive in available ui/)
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 text-left"
    >
      <span
        className={[
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-accent-500' : 'bg-surface-2 border border-border',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
          ].join(' ')}
        />
      </span>
      <span>
        <span className="block text-body text-text-primary">{label}</span>
        {description && (
          <span className="block text-small text-text-secondary">{description}</span>
        )}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section heading
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
      {children}
    </h3>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Field wrapper
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-small font-medium text-text-secondary">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-small text-danger">{error}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface HotelSettingsFormProps {
  initialData: HotelSettings | null
}

export function HotelSettingsForm({ initialData }: HotelSettingsFormProps) {
  const [saved, setSaved] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          address: initialData.address,
          city: initialData.city ?? 'Admapur',
          state: initialData.state ?? 'Maharashtra',
          phone: initialData.phone,
          phone_alt: initialData.phone_alt ?? '',
          whatsapp: initialData.whatsapp ?? '',
          email: initialData.email ?? '',
          check_in_time: initialData.check_in_time ?? '12:00',
          check_out_time: initialData.check_out_time ?? '11:00',
          gst_enabled: initialData.gst_enabled ?? false,
          gst_number: initialData.gst_number ?? '',
          gst_rate: initialData.gst_rate ?? 12,
        }
      : {
          address: '',
          city: 'Admapur',
          state: 'Maharashtra',
          phone: '',
          phone_alt: '',
          whatsapp: '',
          email: '',
          check_in_time: '12:00',
          check_out_time: '11:00',
          gst_enabled: false,
          gst_number: '',
          gst_rate: 12,
        },
  })

  const gstEnabled = watch('gst_enabled')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit: SubmitHandler<any> = async (data) => {
    setServerError(null)
    setSaved(false)
    const result = await saveHotelSettings(data)
    if (result.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setServerError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ── Contact ── */}
      <section className="space-y-4">
        <SectionHeading>Contact</SectionHeading>

        <Field label="Address" required error={errors.address?.message}>
          <Input
            type="text"
            {...register('address')}
            placeholder="Near Balumama Temple, Admapur"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City" error={errors.city?.message}>
            <Input type="text" {...register('city')} />
          </Field>
          <Field label="State" error={errors.state?.message}>
            <Input type="text" {...register('state')} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phone" required error={errors.phone?.message}>
            <Input
              type="tel"
              {...register('phone')}
              placeholder="9876543210"
            />
          </Field>
          <Field label="Alternate phone" error={errors.phone_alt?.message}>
            <Input
              type="tel"
              {...register('phone_alt')}
              placeholder="9876543210"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="WhatsApp number" error={errors.whatsapp?.message}>
            <Input
              type="tel"
              {...register('whatsapp')}
              placeholder="9876543210"
            />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input
              type="email"
              {...register('email')}
              placeholder="bookings@hotelkbpadmapur.in"
            />
          </Field>
        </div>
      </section>

      {/* ── Check-in / Check-out times ── */}
      <section className="space-y-4 border-t border-border pt-6">
        <SectionHeading>Check-in &amp; check-out</SectionHeading>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Check-in time" error={errors.check_in_time?.message}>
            <Input
              type="time"
              {...register('check_in_time')}
            />
          </Field>
          <Field label="Check-out time" error={errors.check_out_time?.message}>
            <Input
              type="time"
              {...register('check_out_time')}
            />
          </Field>
        </div>
      </section>

      {/* ── GST ── */}
      <section className="space-y-4 border-t border-border pt-6">
        <SectionHeading>GST</SectionHeading>

        <Controller
          control={control}
          name="gst_enabled"
          render={({ field }) => (
            <Toggle
              checked={field.value ?? false}
              onChange={field.onChange}
              label="GST applicable"
              description="Rates are pre-tax; GST line is shown separately on the receipt"
            />
          )}
        />

        {gstEnabled && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="GSTIN"
              required
              error={errors.gst_number?.message}
            >
              <Input
                type="text"
                {...register('gst_number')}
                placeholder="27AAACR5055K1ZQ"
              />
            </Field>
            <Field label="GST rate (%)" error={errors.gst_rate?.message}>
              <Input
                type="number"
                {...register('gst_rate')}
                min={0}
                max={28}
                step={0.5}
              />
            </Field>
          </div>
        )}
      </section>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-2 rounded border border-danger/40 bg-danger/5 px-4 py-3 text-body text-danger">
          <IconX size={16} className="shrink-0 mt-0.5" />
          {serverError}
        </div>
      )}

      {/* Submit row */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        {saved ? (
          <span className="inline-flex items-center gap-1.5 text-body text-success">
            <IconCheck size={16} />
            Saved
          </span>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent-500 hover:bg-accent-700"
        >
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
