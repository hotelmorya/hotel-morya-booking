'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { useState, useTransition } from 'react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createRateOverride,
  updateRateOverride,
  deleteRateOverride,
} from '@/lib/actions/rates'
import { rateOverrideSchema, type RateOverrideInput, type RateOverrideFormValues } from '@/schemas/rate-override'
import type { Tables } from '@/types/database'

type RateOverride = Tables<'rate_overrides'>
type RoomType = Tables<'room_types'>

function parseName(raw: unknown): string {
  if (!raw) return 'Unnamed'
  if (typeof raw === 'string') return raw
  const r = raw as Record<string, string>
  return r.en ?? 'Unnamed'
}

function formatDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Overlap checker (non-blocking, client-side only)
// ─────────────────────────────────────────────────────────────────────────────

function hasOverlap(
  overrides: RateOverride[],
  roomTypeId: string,
  startDate: string,
  endDate: string,
  excludeId?: string
): boolean {
  return overrides.some((o) => {
    if (o.room_type_id !== roomTypeId) return false
    if (excludeId && o.id === excludeId) return false
    // Overlap: existing.start <= new.end AND existing.end >= new.start
    return o.start_date <= endDate && o.end_date >= startDate
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Override form — extracted so it can be used inside Dialog
// ─────────────────────────────────────────────────────────────────────────────

function OverrideForm({
  roomTypes,
  allOverrides,
  initial,
  onClose,
  onSuccess,
}: {
  roomTypes: RoomType[]
  allOverrides: RateOverride[]
  initial?: RateOverride
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!initial
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RateOverrideFormValues, unknown, RateOverrideInput>({
    resolver: zodResolver(rateOverrideSchema),
    defaultValues: initial
      ? {
          room_type_id: initial.room_type_id,
          start_date: initial.start_date,
          end_date: initial.end_date,
          rate: initial.rate,
          label: initial.label ?? '',
        }
      : {
          room_type_id: roomTypes[0]?.id ?? '',
          start_date: '',
          end_date: '',
          rate: 0,
          label: '',
        },
  })

  const watchedRoomType = watch('room_type_id')
  const watchedStart = watch('start_date')
  const watchedEnd = watch('end_date')

  const showOverlapWarning =
    watchedStart &&
    watchedEnd &&
    watchedRoomType &&
    hasOverlap(allOverrides, watchedRoomType, watchedStart, watchedEnd, initial?.id)

  const onSubmit: SubmitHandler<RateOverrideInput> = async (data) => {
    setServerError(null)
    const result = isEdit
      ? await updateRateOverride(initial.id, data)
      : await createRateOverride(data)

    if (result.success) {
      onSuccess()
    } else {
      setServerError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Room type — Base UI Select via Controller */}
      <div>
        <label className="mb-1.5 block text-small font-medium text-text-secondary">
          Room type <span className="text-danger">*</span>
        </label>
        <Controller
          control={control}
          name="room_type_id"
          render={({ field }) => (
            <Select
              // Base UI shows the raw value in the trigger unless given an
              // items map of value→label — without this it renders the UUID.
              items={Object.fromEntries(roomTypes.map((rt) => [rt.id, parseName(rt.name)]))}
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select room type" />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {parseName(rt.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.room_type_id && (
          <p className="mt-1 text-small text-danger">{errors.room_type_id.message}</p>
        )}
      </div>

      {/* Label */}
      <div>
        <label className="mb-1.5 block text-small font-medium text-text-secondary">
          Label (optional)
        </label>
        <Input
          type="text"
          {...register('label')}
          placeholder="e.g. Balumama Yatra"
        />
        {errors.label && (
          <p className="mt-1 text-small text-danger">{errors.label.message}</p>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-small font-medium text-text-secondary">
            From <span className="text-danger">*</span>
          </label>
          <Input type="date" {...register('start_date')} />
          {errors.start_date && (
            <p className="mt-1 text-small text-danger">{errors.start_date.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-small font-medium text-text-secondary">
            To <span className="text-danger">*</span>
          </label>
          <Input type="date" {...register('end_date')} />
          {errors.end_date && (
            <p className="mt-1 text-small text-danger">{errors.end_date.message}</p>
          )}
        </div>
      </div>

      {/* Rate */}
      <div>
        <label className="mb-1.5 block text-small font-medium text-text-secondary">
          Override rate (₹ / night) <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-body text-text-tertiary">
            ₹
          </span>
          <Input
            type="number"
            {...register('rate')}
            min={0}
            step={1}
            placeholder="0"
            className="pl-7 text-tabular"
          />
        </div>
        {errors.rate && (
          <p className="mt-1 text-small text-danger">{errors.rate.message}</p>
        )}
      </div>

      {/* Overlap warning */}
      {showOverlapWarning && (
        <div className="flex items-start gap-2 rounded border border-warning/40 bg-warning/5 px-3 py-2.5">
          <IconAlertTriangle size={15} className="shrink-0 mt-0.5 text-warning" />
          <p className="text-small text-[#92400e] dark:text-warning">
            These dates overlap with an existing override for this room type. Both will apply — the later override created takes precedence.
          </p>
        </div>
      )}

      {serverError && (
        <div className="flex items-start gap-2 rounded border border-danger/40 bg-danger/5 px-4 py-3 text-small text-danger">
          <IconX size={14} className="shrink-0 mt-0.5" />
          {serverError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-accent-500 hover:bg-accent-700"
        >
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add override'}
        </Button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main section
// ─────────────────────────────────────────────────────────────────────────────

interface RateOverridesSectionProps {
  overrides: RateOverride[]
  roomTypes: RoomType[]
}

export function RateOverridesSection({
  overrides,
  roomTypes,
}: RateOverridesSectionProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [editingOverride, setEditingOverride] = useState<RateOverride | null>(null)
  const [deletingOverride, setDeletingOverride] = useState<RateOverride | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Local state for optimistic UX (page reload via window.location on success)
  function handleSuccess() {
    window.location.reload()
  }

  function handleDelete(id: string) {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteRateOverride(id)
      if (result.success) {
        window.location.reload()
      } else {
        setDeleteError(result.error)
        setDeletingOverride(null)
      }
    })
  }

  const roomTypeMap = Object.fromEntries(roomTypes.map((rt) => [rt.id, rt]))

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-small text-text-secondary">
            {overrides.length} override{overrides.length !== 1 ? 's' : ''}
          </p>
          <Button
            type="button"
            onClick={() => {
              setEditingOverride(null)
              setShowDialog(true)
            }}
            className="bg-accent-500 hover:bg-accent-700"
          >
            <IconPlus size={16} />
            Add override
          </Button>
        </div>

        {deleteError && (
          <div className="flex items-start gap-2 rounded border border-danger/40 bg-danger/5 px-4 py-3 text-small text-danger">
            <IconX size={14} className="shrink-0 mt-0.5" />
            {deleteError}
          </div>
        )}

        {overrides.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded border border-border bg-surface-1 py-12 text-center">
            <IconCalendarEvent size={32} className="text-text-disabled" stroke={1.5} />
            <div>
              <p className="text-body text-text-secondary">No festival overrides yet.</p>
              <p className="text-small text-text-tertiary mt-0.5">
                Add overrides for festivals, long weekends, or peak seasons.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowDialog(true)}
              className="bg-accent-500 hover:bg-accent-700"
            >
              <IconPlus size={16} />
              Add first override
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {overrides.map((override) => (
              <div
                key={override.id}
                className="rounded border border-border bg-surface-1 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {override.label && (
                      <p className="text-body font-medium text-text-primary">
                        {override.label}
                      </p>
                    )}
                    <p className="text-small text-text-secondary">
                      {parseName(roomTypeMap[override.room_type_id]?.name)}
                    </p>
                    <p className="text-small text-text-tertiary">
                      {formatDate(override.start_date)} — {formatDate(override.end_date)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-body font-medium text-tabular text-text-primary">
                      ₹{Number(override.rate).toLocaleString('en-IN')}
                      <span className="text-small text-text-tertiary font-normal"> /night</span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => {
                        setEditingOverride(override)
                        setShowDialog(true)
                      }}
                      title="Edit"
                    >
                      <IconPencil size={13} />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => setDeletingOverride(override)}
                      title="Delete"
                    >
                      <IconTrash size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Override create/edit dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open)
          if (!open) setEditingOverride(null)
        }}
      >
        <DialogContent className="w-full max-w-[480px]" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {editingOverride ? 'Edit override' : 'Add rate override'}
            </DialogTitle>
          </DialogHeader>
          <OverrideForm
            roomTypes={roomTypes}
            allOverrides={overrides}
            initial={editingOverride ?? undefined}
            onClose={() => {
              setShowDialog(false)
              setEditingOverride(null)
            }}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm — AlertDialog */}
      <AlertDialog
        open={!!deletingOverride}
        onOpenChange={(open) => {
          if (!open) setDeletingOverride(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{deletingOverride?.label ? ` "${deletingOverride.label}"` : ' this override'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Existing bookings are unaffected — rates are snapshotted at booking time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() => {
                if (deletingOverride) handleDelete(deletingOverride.id)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
