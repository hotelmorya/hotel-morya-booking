'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { IconCheck, IconInfoCircle, IconUpload, IconPhoto, IconX } from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveHotelSettings } from '@/lib/actions/hotel-settings'
import { CLOUD_NAME } from '@/lib/cloudinary'
import { policiesSchema, type PoliciesInput } from '@/schemas/hotel-settings'
import type { Tables } from '@/types/database'

type HotelSettings = Tables<'hotel_settings'>

const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ''

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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
      {children}
    </h3>
  )
}

function Field({
  label,
  required,
  error,
  help,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-small font-medium text-text-secondary">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {help && !error && <p className="mt-1 text-small text-text-tertiary">{help}</p>}
      {error && <p className="mt-1 text-small text-danger">{error}</p>}
    </div>
  )
}

interface PoliciesFormProps {
  initialData: HotelSettings | null
}

export function PoliciesForm({ initialData }: PoliciesFormProps) {
  const [saved, setSaved] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [upiUploading, setUpiUploading] = useState(false)
  const [upiUploadError, setUpiUploadError] = useState<string | null>(null)
  const [upiPreview, setUpiPreview] = useState<string | null>(initialData?.upi_qr_url ?? null)
  const qrInputRef = useRef<HTMLInputElement>(null)

  // Build full schema form with only policy + stub required fields
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PoliciesInput>({
    // Validate ONLY the policy fields this tab edits — not the full hotel
    // settings schema (which would silently block submit when unrelated
    // required fields like name/phone are blank on a fresh hotel).
    resolver: zodResolver(policiesSchema),
    defaultValues: {
      advance_percent: initialData?.advance_percent ?? 0,
      auto_cancel_hours_after_booking: initialData?.auto_cancel_hours_after_booking ?? 24,
      min_hours_before_checkin: initialData?.min_hours_before_checkin ?? 6,
      fee_passthrough_enabled: initialData?.fee_passthrough_enabled ?? false,
      fee_passthrough_percent: initialData?.fee_passthrough_percent ?? 3,
      upi_qr_url: initialData?.upi_qr_url ?? '',
      upi_id: initialData?.upi_id ?? '',
    },
  })

  const feePassthrough = watch('fee_passthrough_enabled')
  const autoCancelHours = watch('auto_cancel_hours_after_booking') as number | undefined
  const minHoursCheckin = watch('min_hours_before_checkin') as number | undefined

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

  async function handleQrFile(file: File) {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setUpiUploadError('Cloudinary is not configured')
      return
    }
    setUpiUploading(true)
    setUpiUploadError(null)
    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', UPLOAD_PRESET)
    form.append('folder', 'hotel-qr')
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: form }
      )
      if (!res.ok) throw new Error('Upload failed')
      const json = await res.json() as { secure_url: string }
      setValue('upi_qr_url', json.secure_url)
      setUpiPreview(json.secure_url)
    } catch (err) {
      setUpiUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUpiUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ── Payments ── */}
      <section className="space-y-4">
        <SectionHeading>Payments</SectionHeading>


        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Advance required (%)"
            error={errors.advance_percent?.message}
            help="Suggested advance shown to staff when calling to confirm a pending booking. 0 = no advance required."
          >
            <Input
              type="number"
              {...register('advance_percent')}
              min={0}
              max={100}
              step={5}
            />
          </Field>
        </div>

        <div className="space-y-3">
          <Controller
            control={control}
            name="fee_passthrough_enabled"
            render={({ field }) => (
              <Toggle
                checked={field.value ?? false}
                onChange={field.onChange}
                label="Pass payment gateway fee to guest"
                description="Displayed rates will be increased by the percentage below"
              />
            )}
          />

          {feePassthrough && (
            <div className="ml-12 max-w-[180px]">
              <Field
                label="Fee passthrough (%)"
                error={errors.fee_passthrough_percent?.message}
              >
                <Input
                  type="number"
                  {...register('fee_passthrough_percent')}
                  min={0}
                  max={100}
                  step={0.5}
                />
              </Field>
            </div>
          )}
        </div>

        {/* UPI QR */}
        <div>
          <label className="mb-2 block text-small font-medium text-text-secondary">
            UPI QR code
          </label>
          <p className="mb-3 text-small text-text-tertiary">
            Guests who choose &quot;Scan UPI QR &amp; Call&quot; will see this image.
          </p>
          <div className="flex items-start gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded border border-border bg-surface-1 overflow-hidden">
              {upiPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={upiPreview} alt="UPI QR code" className="h-full w-full object-contain" />
              ) : (
                <IconPhoto size={24} className="text-text-disabled" stroke={1.5} />
              )}
            </div>
            <div className="space-y-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={upiUploading}
                onClick={() => qrInputRef.current?.click()}
              >
                <IconUpload size={14} />
                {upiUploading ? 'Uploading…' : upiPreview ? 'Change QR' : 'Upload QR code'}
              </Button>
              <p className="text-small text-text-tertiary">PNG or JPG — guests scan this</p>
              {upiUploadError && <p className="text-small text-danger">{upiUploadError}</p>}
            </div>
          </div>
          <input
            ref={qrInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleQrFile(file)
            }}
          />
        </div>

        {/* UPI ID (VPA) — powers the mobile "Pay with UPI app" deep link */}
        <div>
          <label className="mb-2 block text-small font-medium text-text-secondary">
            UPI ID
          </label>
          <p className="mb-3 text-small text-text-tertiary">
            e.g. hotelmorya@okaxis — lets mobile guests tap to pay in their UPI app
            (amount prefilled). The QR above is still used on desktop.
          </p>
          <Input placeholder="name@bank" {...register('upi_id')} />
          {errors.upi_id && (
            <p className="mt-1 text-small text-danger">{errors.upi_id.message}</p>
          )}
        </div>
      </section>

      {/* ── Booking timer ── */}
      <section className="space-y-4 border-t border-border pt-6">
        <SectionHeading>Auto-cancel timer</SectionHeading>

        {/* Callout explaining the rule */}
        <div className="flex items-start gap-2 rounded border border-border bg-surface-1 px-4 py-3">
          <IconInfoCircle size={16} className="shrink-0 mt-0.5 text-info" />
          <p className="text-small text-text-secondary">
            Pending bookings auto-cancel at the <strong>earlier</strong> of{' '}
            <strong>{autoCancelHours ?? 24} hours after creation</strong> or{' '}
            <strong>{minHoursCheckin ?? 6} hours before check-in</strong>, but never
            sooner than 1 hour after creation.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Hours after booking creation"
            error={errors.auto_cancel_hours_after_booking?.message}
            help="Default 24h. Minimum 1, maximum 168 (1 week)."
          >
            <Input
              type="number"
              {...register('auto_cancel_hours_after_booking')}
              min={1}
              max={168}
            />
          </Field>

          <Field
            label="Hours before check-in"
            error={errors.min_hours_before_checkin?.message}
            help="Default 6h. Prevents last-minute holds from blocking availability."
          >
            <Input
              type="number"
              {...register('min_hours_before_checkin')}
              min={0}
              max={72}
            />
          </Field>
        </div>
      </section>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-2 rounded border border-danger/40 bg-danger/5 px-4 py-3 text-body text-danger">
          <IconX size={16} className="shrink-0 mt-0.5" />
          {serverError}
        </div>
      )}

      {/* Submit */}
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
