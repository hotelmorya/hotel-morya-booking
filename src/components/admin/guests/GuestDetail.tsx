'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  GitMergeIcon,
  Loader2,
  MoreVerticalIcon,
  PencilIcon,
  PhoneIcon,
  ScanLineIcon,
  Trash2Icon,
} from 'lucide-react'

import { useGuest, useDeleteGuest, useUpdateGuest } from '@/hooks/use-guests'
import { useExtractIdProof } from '@/hooks/use-id-proof-extract'
import { BookingStatusPill, type BookingStatus } from '@/components/admin/bookings/BookingStatusPill'
import { GuestDrawer } from '@/components/admin/guests/GuestDrawer'
import { IdProofUpload } from '@/components/admin/guests/IdProofUpload'
import { MergeGuestsDialog } from '@/components/admin/guests/MergeGuestsDialog'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Skeleton } from '@/components/ui/skeleton'

import { formatCurrency, formatDateRange, formatRelativeIST } from '@/lib/format'
import { MANAGER_PLUS } from '@/lib/roles'
import type { UserRole } from '@/types/database'

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNum(val: number | string | undefined | null): number {
  if (val == null) return 0
  const n = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(n) ? 0 : n
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5 gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right">{value}</span>
    </div>
  )
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  mr: 'Marathi',
  hi: 'Hindi',
}

const ID_TYPE_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar',
  pan: 'PAN Card',
  passport: 'Passport',
  driving_license: 'Driving License',
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface GuestDetailProps {
  id: string
  role: UserRole
}

// ── Main Component ───────────────────────────────────────────────────────────

export function GuestDetail({ id, role }: GuestDetailProps) {
  const router = useRouter()
  const { data: guest, isLoading, error, refetch } = useGuest(id)
  const { mutate: deleteGuest, isPending: isDeleting } = useDeleteGuest()

  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showMerge, setShowMerge] = useState(false)

  // Inline ID scan (OCR) — read the uploaded ID image, then confirm before saving.
  const { mutate: updateGuest, isPending: savingId } = useUpdateGuest()
  const { mutate: extractId, isPending: scanning } = useExtractIdProof()
  const [scanPanelOpen, setScanPanelOpen] = useState(false)
  const [scanIdType, setScanIdType] = useState('')
  const [scanIdNumber, setScanIdNumber] = useState('')
  const [scanName, setScanName] = useState('') // editable — saving updates the guest name

  const isManagerPlus = MANAGER_PLUS.includes(role)

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-3">
          <Skeleton className="h-20 flex-1 rounded-xl" />
          <Skeleton className="h-20 flex-1 rounded-xl" />
          <Skeleton className="h-20 flex-1 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error || !guest) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center text-destructive">
            {error?.message ?? 'Guest not found'}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Delete handler ─────────────────────────────────────────────────────────

  function handleDelete() {
    deleteGuest(
      { id: guest!.id, updated_at: guest!.updated_at },
      {
        onSuccess: () => {
          toast.success('Guest deleted')
          router.push('/admin/guests')
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Could not delete guest')
          setShowDeleteDialog(false)
        },
      }
    )
  }

  // ── ID scan handlers ─────────────────────────────────────────────────────────

  function handleScanId() {
    if (!guest) return
    extractId(guest.id, {
      onSuccess: (res) => {
        setScanIdType(res.id_type ?? guest.id_type ?? '')
        setScanIdNumber(res.id_number ?? guest.id_number ?? '')
        setScanName(res.fullname ?? guest.fullname ?? '')
        setScanPanelOpen(true)
        if (res.id_type || res.id_number) toast.success('ID read — confirm and save')
        else toast.message('Could not read the ID — enter the details manually')
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Could not scan ID'),
    })
  }

  function handleSaveScannedId() {
    if (!guest) return
    if (!scanIdType || !scanIdNumber.trim()) {
      toast.error('Select an ID type and enter the ID number')
      return
    }
    updateGuest(
      {
        id: guest.id,
        updated_at: guest.updated_at,
        // guestSchema validates the full record; carry the existing fields.
        // The name is editable here, so saving also updates the guest's name.
        fullname: scanName.trim() || guest.fullname,
        phone: guest.phone,
        email: guest.email ?? undefined,
        id_type: scanIdType as never,
        id_number: scanIdNumber.trim(),
        city: guest.city ?? undefined,
        address: guest.address ?? undefined,
        preferred_language: (guest.preferred_language ?? 'en') as never,
        notes: guest.notes ?? undefined,
        tags: guest.tags ?? [],
      },
      {
        onSuccess: () => {
          toast.success('ID details saved')
          setScanPanelOpen(false)
          refetch()
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Could not save ID details'),
      }
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">{guest.fullname}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <a
              href={`tel:${guest.phone}`}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <PhoneIcon className="size-3" />
              {guest.phone}
            </a>
            {guest.city && (
              <>
                <span>·</span>
                <span>{guest.city}</span>
              </>
            )}
          </div>
          {guest.tags && guest.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-1">
              {guest.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <PencilIcon className="size-4" />
            Edit
          </Button>

          {isManagerPlus && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="More actions"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground outline-none"
              >
                <MoreVerticalIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowMerge(true)}>
                  <GitMergeIcon className="size-4 mr-2" />
                  Merge with another guest
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2Icon className="size-4 mr-2" />
                  Delete guest
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Total stays</p>
            <p className="text-xl font-semibold tabular-nums">{guest.total_stays ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Lifetime value</p>
            <p className="text-xl font-semibold font-mono tabular-nums">
              {formatCurrency(toNum(guest.lifetime_value))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Last stay</p>
            <p className="text-sm font-medium">
              {guest.last_stayed_at ? formatRelativeIST(guest.last_stayed_at) : 'Never'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <InfoRow label="Name" value={guest.fullname} />
          <Separator />
          <InfoRow
            label="Phone"
            value={
              <a href={`tel:${guest.phone}`} className="hover:underline">
                {guest.phone}
              </a>
            }
          />
          {guest.email && (
            <>
              <Separator />
              <InfoRow
                label="Email"
                value={
                  <a href={`mailto:${guest.email}`} className="hover:underline">
                    {guest.email}
                  </a>
                }
              />
            </>
          )}
          {guest.city && (
            <>
              <Separator />
              <InfoRow label="City" value={guest.city} />
            </>
          )}
          {guest.address && (
            <>
              <Separator />
              <InfoRow label="Address" value={guest.address} />
            </>
          )}
          <Separator />
          <InfoRow
            label="Language"
            value={LANGUAGE_LABELS[guest.preferred_language] ?? guest.preferred_language}
          />
          {guest.id_type && (
            <>
              <Separator />
              <InfoRow
                label="ID Type"
                value={ID_TYPE_LABELS[guest.id_type] ?? guest.id_type}
              />
            </>
          )}
          {guest.id_number && (
            <>
              <Separator />
              <InfoRow label="ID Number" value={guest.id_number} />
            </>
          )}
          {guest.notes && (
            <>
              <Separator />
              <div className="py-1.5">
                <p className="text-sm text-muted-foreground mb-1.5">Notes</p>
                <p className="text-sm bg-muted/50 rounded-md p-2.5 text-foreground">
                  {guest.notes}
                </p>
              </div>
            </>
          )}

          {/* ID Proof upload + Scan — always shown at bottom of profile card */}
          <Separator className="mt-2" />
          <div className="pt-3 flex flex-col gap-2">
            <IdProofUpload
              guestId={guest.id}
              existingPath={guest.id_proof_url}
              onUploaded={() => refetch()}
            />

            {/* Scan the uploaded ID to read its details (read-only OCR draft). */}
            {guest.id_proof_url && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={scanning}
                  onClick={handleScanId}
                >
                  {scanning ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ScanLineIcon className="size-4" />
                  )}
                  {scanning ? 'Scanning…' : 'Scan ID to read details'}
                </Button>

                {scanPanelOpen && (
                  <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Full name</Label>
                      <Input
                        placeholder="Full name"
                        value={scanName}
                        maxLength={100}
                        onChange={(e) => setScanName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">ID type</Label>
                      <Select
                        items={ID_TYPE_LABELS}
                        value={scanIdType}
                        onValueChange={(v) => {
                          if (v !== null) setScanIdType(v)
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select ID type…" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ID_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">ID number</Label>
                      <Input
                        placeholder="ID number"
                        value={scanIdNumber}
                        maxLength={20}
                        onChange={(e) => setScanIdNumber(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveScannedId} disabled={savingId}>
                        {savingId ? 'Saving…' : 'Save ID details'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => setScanPanelOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Booking history */}
      <Card>
        <CardHeader>
          <CardTitle>Booking History</CardTitle>
        </CardHeader>
        <CardContent>
          {guest.bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No bookings yet</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ref</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guest.bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <Link
                            href={`/admin/bookings/${booking.id}`}
                            className="font-mono text-sm font-medium hover:underline text-primary"
                          >
                            {booking.booking_ref}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateRange(booking.check_in, booking.check_out)}
                        </TableCell>
                        <TableCell>
                          <BookingStatusPill status={booking.status as BookingStatus} />
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-sm">
                          {formatCurrency(booking.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden space-y-2">
                {guest.bookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/admin/bookings/${booking.id}`}
                    className="block rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-medium">{booking.booking_ref}</span>
                      <span className="font-mono text-sm tabular-nums">
                        {formatCurrency(booking.total_amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDateRange(booking.check_in, booking.check_out)}
                      </span>
                      <BookingStatusPill status={booking.status as BookingStatus} />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit drawer */}
      <GuestDrawer
        open={showEdit}
        onClose={setShowEdit}
        existing={guest}
      />

      {/* Merge dialog */}
      {isManagerPlus && (
        <MergeGuestsDialog
          keepGuest={{ id: guest.id, fullname: guest.fullname }}
          open={showMerge}
          onOpenChange={setShowMerge}
        />
      )}

      {/* Delete AlertDialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {guest.fullname}?</AlertDialogTitle>
            <AlertDialogDescription>
              This guest has no bookings and will be permanently removed from the directory
              (soft-deleted). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete guest'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
