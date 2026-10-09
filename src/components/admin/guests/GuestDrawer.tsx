'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { useCreateGuest, useUpdateGuest } from '@/hooks/use-guests'
import type { GuestRow } from '@/hooks/use-guests'
import type { GuestInput } from '@/schemas/guest'
import { useExtractIdProof } from '@/hooks/use-id-proof-extract'
import { IdProofUpload } from '@/components/admin/guests/IdProofUpload'
import { SideDrawer } from '@/components/shared/side-drawer'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GuestRowExtended = GuestRow & {
  notes?: string | null
  address?: string | null
  preferred_language?: string
  id_type?: string | null
  id_number?: string | null
  id_proof_url?: string | null
  updated_at?: string
}

interface GuestDrawerProps {
  open: boolean
  onClose: (open: boolean) => void
  existing?: GuestRowExtended
}

// ---------------------------------------------------------------------------
// Form schema — standalone object; tags is a comma-string for the form input.
// We deliberately don't extend guestSchema here to keep RHF generics clean.
// On submit, the tags string is split → string[] before calling the mutation.
// ---------------------------------------------------------------------------

const formSchema = z.object({
  fullname: z.string().trim().min(2, 'Name is too short').max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9][0-9]{9}$/, 'Enter a 10-digit mobile number starting with 6-9'),
  email: z.string().trim().email('Enter a valid email').max(255).optional().or(z.literal('')),
  city: z.string().trim().max(50).optional(),
  address: z.string().trim().max(255).optional(),
  id_type: z
    .enum(['aadhaar', 'pan', 'passport', 'driving_license'])
    .optional(),
  id_number: z.string().trim().max(20).optional(),
  preferred_language: z.enum(['en', 'mr']).default('en'),
  notes: z.string().trim().optional(),
  tags: z.string().optional(),
})

// z.input gives the pre-default/pre-transform shape that RHF sees on fields.
// Using z.infer (output type) causes type mismatches with zodResolver because
// fields with .default() become required in output but optional in input.
type FormValues = z.input<typeof formSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toFormValues(existing: GuestRowExtended): FormValues {
  return {
    fullname: existing.fullname ?? '',
    phone: existing.phone ?? '',
    email: existing.email ?? '',
    city: existing.city ?? '',
    address: existing.address ?? '',
    id_type: (existing.id_type as FormValues['id_type']) ?? undefined,
    id_number: existing.id_number ?? '',
    preferred_language: existing.preferred_language === 'mr' ? 'mr' : 'en',
    notes: existing.notes ?? '',
    tags: (existing.tags ?? []).join(', '),
  }
}

const DEFAULT_VALUES: FormValues = {
  fullname: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  id_type: undefined,
  id_number: '',
  preferred_language: 'en',
  notes: '',
  tags: '',
}

// ---------------------------------------------------------------------------
// GuestDrawer
// ---------------------------------------------------------------------------

export function GuestDrawer({ open, onClose, existing }: GuestDrawerProps) {
  const isEdit = !!existing

  const createMutation = useCreateGuest()
  const updateMutation = useUpdateGuest()
  const { mutate: extractId, isPending: scanning } = useExtractIdProof()

  // The id-proof upload + OCR endpoints key off an existing guest id. In edit
  // mode we have `existing.id`; in create mode we capture the new id after save.
  const [createdId, setCreatedId] = useState<string | null>(null)
  // updated_at of the just-created guest — needed to UPDATE it (optimistic lock)
  // when saving the scanned ID details without re-creating a duplicate.
  const [createdUpdatedAt, setCreatedUpdatedAt] = useState<string | null>(null)
  // Track the uploaded proof path / a client-side upload flag so Scan enables.
  const [proofPath, setProofPath] = useState<string | null>(existing?.id_proof_url ?? null)
  const [hasUploaded, setHasUploaded] = useState(false)

  const guestId = existing?.id ?? createdId
  const canScan = !!guestId && (!!proofPath || hasUploaded)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  })

  // Reset form + ID-proof state whenever the drawer opens or `existing` changes
  useEffect(() => {
    if (open) {
      form.reset(existing ? toFormValues(existing) : DEFAULT_VALUES)
      setCreatedId(null)
      setCreatedUpdatedAt(null)
      setProofPath(existing?.id_proof_url ?? null)
      setHasUploaded(false)
    }
  }, [open, existing, form])

  const isPending = createMutation.isPending || updateMutation.isPending

  function handleScanId() {
    if (!guestId) return
    extractId(guestId, {
      onSuccess: (res) => {
        if (res.id_type) {
          form.setValue('id_type', res.id_type as FormValues['id_type'])
        }
        if (res.id_number) form.setValue('id_number', res.id_number)
        // Pre-fill the name only when the field is empty — don't clobber a typed name.
        if (res.fullname && !form.getValues('fullname')?.trim()) {
          form.setValue('fullname', res.fullname)
        }
        if (res.id_type && res.id_number) {
          toast.success('ID details read — confirm and save')
        } else if (res.id_type || res.id_number) {
          toast.success('Partial read — review the fields')
        } else {
          toast.message('Could not read — enter manually')
        }
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Could not scan ID'),
    })
  }

  function onSubmit(values: FormValues) {
    // Transform tags string → array
    const tagsArray = (values.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    // Build the payload: replace the raw tags string with the parsed array.
    // Cast to GuestInput — zodResolver guarantees runtime validity,
    // and preferred_language will always be set (it has a .default('en')).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tags: _tags, ...rest } = values
    const payload = { ...rest, tags: tagsArray } as GuestInput

    // Create mode, AFTER the guest was saved: persist the scanned/edited ID by
    // UPDATING the just-created guest (never re-create), then close.
    if (!isEdit && createdId) {
      if (!createdUpdatedAt) {
        onClose(false)
        return
      }
      updateMutation.mutate(
        { id: createdId, ...payload, updated_at: createdUpdatedAt },
        {
          onSuccess: () => {
            toast.success('ID details saved')
            onClose(false)
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Could not save ID details')
          },
        }
      )
      return
    }

    if (isEdit && existing) {
      updateMutation.mutate(
        { id: existing.id, ...payload, updated_at: existing.updated_at! },
        {
          onSuccess: () => {
            toast.success('Guest updated')
            onClose(false)
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Could not update guest')
          },
        }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: (data) => {
          // Keep the drawer OPEN so staff can add + scan the ID proof, which
          // needs the just-created guest id.
          setCreatedId(data.id)
          setCreatedUpdatedAt(data.updated_at ?? null)
          toast.success('Guest created — add ID proof')
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Could not create guest')
        },
      })
    }
  }

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit guest' : 'Add guest'}
      description={isEdit ? 'Update guest profile details.' : 'Create a new guest record.'}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

          {/* ---------------------------------------------------------------- */}
          {/* Basic Info                                                        */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex flex-col gap-4">
            <p className="text-label font-medium uppercase tracking-wide text-text-tertiary">
              Basic Info
            </p>

            {/* Name + Phone: two-column on sm+ */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fullname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name <span className="text-danger">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Ramesh Patil" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile <span className="text-danger">*</span></FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email <span className="text-text-tertiary font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ramesh@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City <span className="text-text-tertiary font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Kolhapur" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address <span className="text-text-tertiary font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Street, area, pin code"
                      rows={2}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* ---------------------------------------------------------------- */}
          {/* ID Proof                                                          */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex flex-col gap-4">
            <p className="text-label font-medium uppercase tracking-wide text-text-tertiary">
              ID Proof
            </p>

            {/* Upload + Scan — needs an existing guest id. In create mode this
                appears only after the guest is saved (`createdId` set). Ordered
                Upload → Scan, sitting above the type/number fields. */}
            {createdId && !isEdit && (
              <p className="text-sm text-muted-foreground">
                Guest created — upload and scan their ID proof.
              </p>
            )}
            {guestId && (
              <div className="flex flex-col gap-2">
                <IdProofUpload
                  guestId={guestId}
                  existingPath={proofPath}
                  onUploaded={() => setHasUploaded(true)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleScanId}
                  disabled={!canScan || scanning}
                  className="self-start"
                >
                  {scanning && <Loader2 className="size-4 animate-spin" />}
                  {scanning ? 'Scanning…' : 'Scan ID'}
                </Button>
                {!canScan && (
                  <p className="text-xs text-muted-foreground">
                    Upload an ID image to enable Scan.
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="id_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Type</FormLabel>
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(val) => field.onChange(val === '' ? undefined : val)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">— None —</SelectItem>
                        <SelectItem value="aadhaar">Aadhaar</SelectItem>
                        <SelectItem value="pan">PAN Card</SelectItem>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="driving_license">Driving License</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="id_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Number</FormLabel>
                    <FormControl>
                      <Input placeholder="XXXX XXXX XXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* ---------------------------------------------------------------- */}
          {/* Preferences                                                       */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex flex-col gap-4">
            <p className="text-label font-medium uppercase tracking-wide text-text-tertiary">
              Preferences
            </p>

            <FormField
              control={form.control}
              name="preferred_language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred language</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="mr">Marathi</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* ---------------------------------------------------------------- */}
          {/* Notes                                                             */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex flex-col gap-4">
            <p className="text-label font-medium uppercase tracking-wide text-text-tertiary">
              Notes
            </p>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Admin notes{' '}
                    <span className="text-text-tertiary font-normal">(private)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Prefers ground floor, allergic to dust…"
                      rows={3}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* ---------------------------------------------------------------- */}
          {/* Tags                                                              */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex flex-col gap-4">
            <p className="text-label font-medium uppercase tracking-wide text-text-tertiary">
              Tags
            </p>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tags{' '}
                    <span className="text-text-tertiary font-normal">(comma-separated)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="VIP, Frequent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Footer                                                            */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {createdId && !isEdit ? (
              /* Create mode, after save: the guest exists and the upload + Scan
                 block is shown above. "Save ID details" UPDATEs the new guest
                 with the scanned/edited ID (the image was already uploaded);
                 "Skip" closes without saving the ID fields. */
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClose(false)}
                  disabled={isPending}
                >
                  Skip
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Save ID details
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClose(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  {isEdit ? 'Save changes' : 'Create guest'}
                </Button>
              </>
            )}
          </div>
        </form>
      </Form>
    </SideDrawer>
  )
}
