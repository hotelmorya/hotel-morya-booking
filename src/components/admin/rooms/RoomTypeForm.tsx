'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { IconPlus, IconX } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'

import { PhotoUploader } from '@/components/admin/rooms/PhotoUploader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { roomTypeSchema, BED_TYPES } from '@/schemas/room-type'
import type { Tables } from '@/types/database'
import { z } from 'zod'

// The form holds the schema's input type (before coerce/defaults).
// zodResolver validates against the schema, outputting the output type.
type RoomTypeFormValues = z.input<typeof roomTypeSchema>

type RoomTypeRow = Tables<'room_types'>
type RoomPhoto = Tables<'room_photos'>

// ─────────────────────────────────────────────────────────────────────────────
// Language tab IDs and labels
// ─────────────────────────────────────────────────────────────────────────────

const LOCALES = [
  { id: 'en' as const, label: 'EN' },
  { id: 'mr' as const, label: 'मराठी' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Common amenity quick-add chips
// ─────────────────────────────────────────────────────────────────────────────

const SUGGESTED_AMENITIES = [
  'AC',
  'WiFi',
  'TV',
  'Geyser',
  'Parking',
  'Balcony',
  'Mini fridge',
  'Room service',
]

// ─────────────────────────────────────────────────────────────────────────────
// Multilingual text section (3-tab input for name/description)
// ─────────────────────────────────────────────────────────────────────────────

type MLFieldPath = 'name' | 'description'

function MultilingualField({
  label,
  fieldPath,
  multiline = false,
  register,
  errors,
}: {
  label: string
  fieldPath: MLFieldPath
  multiline?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any
}) {
  const [activeLocale, setActiveLocale] = useState<'en' | 'mr'>('en')

  return (
    <div>
      <label className="mb-1.5 block text-small font-medium text-text-secondary">
        {label}
        {fieldPath === 'name' && <span className="text-danger"> *</span>}
      </label>

      {/* Locale tabs */}
      <div className="flex gap-1 mb-2">
        {LOCALES.map((loc) => (
          <Button
            key={loc.id}
            type="button"
            variant={activeLocale === loc.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveLocale(loc.id)}
            className={
              activeLocale === loc.id
                ? 'bg-accent-500 text-white hover:bg-accent-700'
                : ''
            }
          >
            {loc.label}
          </Button>
        ))}
      </div>

      {LOCALES.map((loc) => (
        <div
          key={loc.id}
          className={activeLocale === loc.id ? 'block' : 'hidden'}
        >
          {multiline ? (
            <Textarea
              {...register(`${fieldPath}.${loc.id}`)}
              rows={3}
              placeholder={
                loc.id === 'en'
                  ? `${label} in English`
                  : loc.id === 'mr'
                    ? `${label} मराठीत`
                    : `${label} हिंदी में`
              }
              className="resize-none"
            />
          ) : (
            <Input
              type="text"
              {...register(`${fieldPath}.${loc.id}`)}
              placeholder={
                loc.id === 'en'
                  ? `${label} in English`
                  : loc.id === 'mr'
                    ? `${label} मराठीत`
                    : `${label} हिंदी में`
              }
            />
          )}
          {fieldPath === 'name' && loc.id === 'en' && errors.name?.en && (
            <p className="mt-1 text-small text-danger">
              {errors.name.en.message}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Amenity chip input
// ─────────────────────────────────────────────────────────────────────────────

function AmenitiesInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [inputVal, setInputVal] = useState('')

  function addChip(chip: string) {
    const trimmed = chip.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setInputVal('')
  }

  function removeChip(chip: string) {
    onChange(value.filter((v) => v !== chip))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addChip(inputVal)
    } else if (e.key === 'Backspace' && inputVal === '' && value.length > 0) {
      removeChip(value[value.length - 1])
    }
  }

  const suggestions = SUGGESTED_AMENITIES.filter((a) => !value.includes(a))

  return (
    <div className="space-y-2">
      {/* Current chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center gap-1 rounded-full border-hairline border-border bg-surface-2 px-2.5 py-0.5 text-small text-text-primary"
            >
              {chip}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => removeChip(chip)}
                className="text-text-tertiary hover:text-text-primary h-auto w-auto p-0"
              >
                <IconX size={11} />
              </Button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type and press Enter to add"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addChip(inputVal)}
          disabled={!inputVal.trim()}
        >
          <IconPlus size={14} />
          Add
        </Button>
      </div>

      {/* Quick-add suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-small text-text-tertiary self-center">Quick add:</span>
          {suggestions.map((s) => (
            <Button
              key={s}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => addChip(s)}
              className="rounded-full hover:bg-accent-50 hover:border-accent-500 hover:text-accent-500"
            >
              + {s}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle (kept as custom — no Switch primitive in available ui/)
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3"
    >
      <span
        className={[
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
          checked ? 'bg-accent-500' : 'bg-surface-2 border-hairline border-border',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
          ].join(' ')}
        />
      </span>
      <span className="text-body text-text-primary">{label}</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main RoomTypeForm
// ─────────────────────────────────────────────────────────────────────────────

interface RoomTypeFormProps {
  /** undefined = create mode */
  initialData?: RoomTypeRow
  /** Only provided in edit mode */
  initialPhotos?: RoomPhoto[]
  /** The current user's internal users.id (for created_by / updated_by) */
  userId: string
}

export function RoomTypeForm({
  initialData,
  initialPhotos = [],
  userId,
}: RoomTypeFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!initialData

  // Parse multilingual jsonb fields.
  function parseMl(raw: unknown): { en: string; mr?: string; hi?: string } {
    if (!raw) return { en: '' }
    if (typeof raw === 'string') return { en: raw }
    const r = raw as Record<string, string>
    return { en: r.en ?? '', mr: r.mr, hi: r.hi }
  }

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RoomTypeFormValues>({
    resolver: zodResolver(roomTypeSchema),
    defaultValues: initialData
      ? {
          name: parseMl(initialData.name),
          description: parseMl(initialData.description),
          base_rate: initialData.base_rate,
          day_use_rate: initialData.day_use_rate ?? '',
          max_guests: initialData.max_guests,
          bed_type: initialData.bed_type ?? '',
          number_of_beds: initialData.number_of_beds ?? '',
          amenities: (initialData.amenities as string[] | null) ?? [],
          is_active: initialData.is_active ?? true,
          sort_order: initialData.sort_order ?? 0,
        }
      : {
          name: { en: '' },
          description: { en: '' },
          amenities: [],
          is_active: true,
          sort_order: 0,
          base_rate: 0,
          day_use_rate: '',
          max_guests: 2,
          bed_type: '',
          number_of_beds: '',
        },
  })

  const isActive = watch('is_active')

  const [serverError, setServerError] = useState<string | null>(null)
  const [cannotDeleteReason, setCannotDeleteReason] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit: SubmitHandler<any> = async (data: z.output<typeof roomTypeSchema>) => {
    setServerError(null)

    if (isEdit && initialData) {
      // Optimistic-locking style update: match on updated_at to detect concurrent edits.
      const { data: updated, error } = await supabase
        .from('room_types')
        .update({
          name: data.name,
          description: data.description,
          base_rate: data.base_rate,
          day_use_rate: data.day_use_rate ?? null,
          max_guests: data.max_guests,
          bed_type: data.bed_type ?? null,
          number_of_beds: data.number_of_beds,
          amenities: data.amenities,
          is_active: data.is_active,
          sort_order: data.sort_order,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', initialData.id)
        .eq('updated_at', initialData.updated_at ?? '')
        .is('deleted_at', null)
        .select('id')

      if (error) {
        setServerError(error.message)
        return
      }

      if (!updated || updated.length === 0) {
        setServerError(
          'Modified by someone else. Refresh the page and try again.'
        )
        return
      }

      router.push('/admin/room-types')
      router.refresh()
    } else {
      // Create.
      const { error } = await supabase.from('room_types').insert({
        name: data.name,
        description: data.description,
        base_rate: data.base_rate,
        day_use_rate: data.day_use_rate ?? null,
        max_guests: data.max_guests,
        bed_type: data.bed_type ?? null,
        number_of_beds: data.number_of_beds,
        amenities: data.amenities,
        is_active: data.is_active,
        sort_order: data.sort_order,
        created_by: userId,
      })

      if (error) {
        setServerError(error.message)
        return
      }

      router.push('/admin/room-types')
      router.refresh()
    }
  }

  async function handleDeactivate() {
    if (!initialData) return
    const { error } = await supabase
      .from('room_types')
      .update({ is_active: false, updated_by: userId })
      .eq('id', initialData.id)

    if (error) {
      setServerError(error.message)
      return
    }
    router.push('/admin/room-types')
    router.refresh()
  }

  async function handleDelete() {
    if (!initialData) return
    setDeleting(true)

    // Check for non-deleted rooms of this type.
    const { count } = await supabase
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .eq('room_type_id', initialData.id)
      .is('deleted_at', null)

    if ((count ?? 0) > 0) {
      setCannotDeleteReason(
        `This room type has ${count} active room${count === 1 ? '' : 's'}. Remove all rooms first.`
      )
      setDeleting(false)
      return
    }

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('room_types')
      .update({ deleted_at: now, deleted_by: userId })
      .eq('id', initialData.id)

    setDeleting(false)
    if (error) {
      setServerError(error.message)
      return
    }

    router.push('/admin/room-types')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-6 pb-10">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name (multilingual) */}
        <MultilingualField
          label="Room type name"
          fieldPath="name"
          register={register}
          errors={errors}
        />

        {/* Description (multilingual) */}
        <MultilingualField
          label="Description"
          fieldPath="description"
          multiline
          register={register}
          errors={errors}
        />

        {/* Base rate + max guests — two col on sm+ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-small font-medium text-text-secondary">
              Base rate (₹ per night) <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-body text-text-tertiary">
                ₹
              </span>
              <Input
                type="number"
                {...register('base_rate')}
                min={0}
                step={1}
                placeholder="0"
                className="pl-7"
              />
            </div>
            {errors.base_rate && (
              <p className="mt-1 text-small text-danger">
                {errors.base_rate.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-small font-medium text-text-secondary">
              Max guests <span className="text-danger">*</span>
            </label>
            <Input
              type="number"
              {...register('max_guests')}
              min={1}
              max={100}
            />
            {errors.max_guests && (
              <p className="mt-1 text-small text-danger">
                {errors.max_guests.message}
              </p>
            )}
          </div>
        </div>

        {/* Bed type + number of beds — two col on sm+ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-small font-medium text-text-secondary">
              Bed type
            </label>
            <select
              {...register('bed_type')}
              className="flex h-9 w-full rounded-md border-hairline border-border bg-surface-1 px-3 py-1 text-body text-text-primary shadow-xs outline-none focus-visible:border-accent-500 focus-visible:ring-[3px] focus-visible:ring-accent-500/30"
            >
              <option value="">Not specified</option>
              {BED_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
            {errors.bed_type && (
              <p className="mt-1 text-small text-danger">
                {String(errors.bed_type.message)}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-small font-medium text-text-secondary">
              Number of beds
            </label>
            <Input
              type="number"
              {...register('number_of_beds')}
              min={1}
              max={100}
              placeholder="Leave blank for halls / no beds"
            />
            {errors.number_of_beds && (
              <p className="mt-1 text-small text-danger">
                {String(errors.number_of_beds.message)}
              </p>
            )}
            <p className="mt-1 text-small text-text-tertiary">
              Optional — leave blank for halls without beds.
            </p>
          </div>
        </div>

        {/* Day-use rate (optional) */}
        <div className="max-w-[260px]">
          <label className="mb-1.5 block text-small font-medium text-text-secondary">
            Day-use rate (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-body text-text-tertiary">
              ₹
            </span>
            <Input
              type="number"
              {...register('day_use_rate')}
              min={0}
              step={1}
              placeholder="Leave blank to disable"
              className="pl-7"
            />
          </div>
          {errors.day_use_rate && (
            <p className="mt-1 text-small text-danger">
              {String(errors.day_use_rate.message)}
            </p>
          )}
          <p className="mt-1 text-small text-text-tertiary">
            Flat charge for a few-hours day stay. Leave blank if this room type
            isn&apos;t offered as a day room.
          </p>
        </div>

        {/* Sort order */}
        <div className="max-w-[180px]">
          <label className="mb-1.5 block text-small font-medium text-text-secondary">
            Sort order
          </label>
          <Input
            type="number"
            {...register('sort_order')}
            min={0}
          />
          <p className="mt-1 text-small text-text-tertiary">
            Lower numbers appear first
          </p>
        </div>

        {/* Amenities */}
        <div>
          <label className="mb-1.5 block text-small font-medium text-text-secondary">
            Amenities
          </label>
          <Controller
            control={control}
            name="amenities"
            render={({ field }) => (
              <AmenitiesInput
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Active toggle */}
        <div>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Toggle
                checked={field.value ?? true}
                onChange={field.onChange}
                label="Show this room type on the booking page"
              />
            )}
          />
        </div>

        {/* Server error */}
        {serverError && (
          <div className="rounded border-hairline border-danger/40 bg-danger/5 px-4 py-3 text-body text-danger">
            {serverError}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/room-types')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-accent-500 hover:bg-accent-700"
          >
            {isSubmitting
              ? isEdit
                ? 'Saving…'
                : 'Creating…'
              : isEdit
                ? 'Save changes'
                : 'Create room type'}
          </Button>
        </div>
      </form>

      {/* Photos section — edit mode only */}
      {isEdit && initialData && (
        <section className="space-y-3 border-t-hairline border-border pt-6">
          <h2 className="text-subsection font-medium text-text-primary">Photos</h2>
          <p className="text-small text-text-secondary">
            Photos are shown on the public booking page. The starred photo is
            shown first.
          </p>
          <PhotoUploader
            roomTypeId={initialData.id}
            initialPhotos={initialPhotos}
          />
        </section>
      )}

      {/* Danger zone — edit mode only */}
      {isEdit && initialData && (
        <section className="space-y-3 border-t-hairline border-border pt-6">
          <h2 className="text-subsection font-medium text-danger">Danger zone</h2>

          {cannotDeleteReason && (
            <div className="rounded border-hairline border-danger/40 bg-danger/5 px-4 py-3 text-small text-danger">
              {cannotDeleteReason}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {isActive && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDeactivate}
              >
                Deactivate (hide from public)
              </Button>
            )}

            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete room type…
            </Button>

            <AlertDialog
              open={showDeleteConfirm}
              onOpenChange={setShowDeleteConfirm}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this room type?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the room type. You cannot delete
                    a room type that has active rooms.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      )}
    </div>
  )
}
