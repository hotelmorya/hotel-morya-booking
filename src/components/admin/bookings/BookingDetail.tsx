'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PhoneIcon, PrinterIcon, TagIcon, Trash2Icon, UndoIcon } from 'lucide-react'

import {
  useBooking,
  useBookingAction,
  useVoidPayment,
  useRefundPayment,
  useSetVehicle,
} from '@/hooks/use-bookings'
import { BookingStatusPill, type BookingStatus } from '@/components/admin/bookings/BookingStatusPill'
import { AddPaymentDialog } from '@/components/admin/bookings/AddPaymentDialog'
import { DiscountDialog } from '@/components/admin/bookings/DiscountDialog'
import { CancelDialog } from '@/components/admin/bookings/CancelDialog'
import { CheckInDialog } from '@/components/admin/bookings/CheckInDialog'
import { CheckOutDialog } from '@/components/admin/bookings/CheckOutDialog'
import { ReassignRoomDialog } from '@/components/admin/bookings/ReassignRoomDialog'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

import {
  formatCurrency,
  formatStay,
  formatDateIST,
  formatDateTimeIST,
  formatRelativeIST,
  formatDayUseWindow,
  formatElapsedSince,
} from '@/lib/format'
import type { UserRole } from '@/types/database'
import { MANAGER_PLUS } from '@/lib/roles'
import { VEHICLE_TYPE_LABELS } from '@/schemas/booking'
import type { VehicleType } from '@/schemas/booking'

// ── Types ────────────────────────────────────────────────────────────────────

interface BookingRoom {
  id: string
  room_type_id: string
  room_id: string | null
  rate_per_night: number
  nights: number
  subtotal: number
  room_types: {
    id: string
    name: { en: string; mr?: string; hi?: string }
  }
  rooms: { id: string; room_number: string } | null
}

interface Payment {
  id: string
  amount: number
  method: string
  reference_note: string | null
  status: string
  paid_at: string | null
  created_at: string
}

interface BookingDetailData {
  id: string
  booking_ref: string
  check_in: string
  check_out: string
  nights: number
  stay_type: 'overnight' | 'day_use' | null
  day_use_from: string | null
  day_use_to: string | null
  total_amount: number
  discount_amount: number | null
  discount_reason: string | null
  gst_amount: number | null
  advance_paid: number
  balance_due: number
  status: BookingStatus
  source: string
  group_ref: string | null
  special_requests: string | null
  additional_guests: number | null
  actual_check_in: string | null
  actual_check_out: string | null
  vehicle_type: string | null
  vehicle_number: string | null
  created_at: string
  updated_at: string
  guests: {
    id: string
    fullname: string
    phone: string
    email: string | null
    city: string | null
    address: string | null
    tags: string[] | null
    id_type: string | null
    id_number: string | null
    id_proof_url: string | null
    updated_at: string
    last_vehicle_type: string | null
    last_vehicle_number: string | null
  }
  booking_rooms: BookingRoom[]
  payments: Payment[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  walkin: 'Walk-in',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  other: 'Other',
}

const METHOD_LABELS: Record<string, string> = {
  upi: 'UPI',
  cash: 'Cash',
  card: 'Card',
  bank: 'Bank Transfer',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  success: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
}

function ChargeRow({
  label,
  value,
  emphasis,
  sub,
}: {
  label: string
  value: string
  emphasis?: boolean
  sub?: string
}) {
  return (
    <div className="flex items-start justify-between py-1">
      <div>
        <span className={emphasis ? 'font-semibold' : 'text-muted-foreground text-sm'}>{label}</span>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <span className={`font-mono tabular-nums ${emphasis ? 'text-base font-semibold' : 'text-sm'}`}>
        {value}
      </span>
    </div>
  )
}

// Edit the vehicle captured at check-in (typo fix / "guest parked later").
function VehicleEditDialog({
  bookingId,
  updatedAt,
  initialType,
  initialNumber,
  open,
  onOpenChange,
}: {
  bookingId: string
  updatedAt: string
  initialType: string | null
  initialNumber: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [vehicleType, setVehicleType] = useState<string>(initialType ?? '')
  const [vehicleNumber, setVehicleNumber] = useState<string>(initialNumber ?? '')
  const { mutate: setVehicle, isPending } = useSetVehicle()

  function handleSave() {
    if (!vehicleType) {
      toast.error('Select a vehicle type (choose "None" if the guest has no vehicle)')
      return
    }
    if (vehicleType !== 'none' && !vehicleNumber.trim()) {
      toast.error('Vehicle number is required')
      return
    }
    setVehicle(
      {
        id: bookingId,
        updated_at: updatedAt,
        vehicle_type: vehicleType as VehicleType,
        vehicle_number: vehicleType === 'none' ? undefined : vehicleNumber.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Vehicle updated')
          onOpenChange(false)
        },
        onError: (err) => toast.error(err.message ?? 'Could not update vehicle'),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Vehicle type</Label>
            <Select
              items={VEHICLE_TYPE_LABELS}
              value={vehicleType}
              onValueChange={(val) => {
                if (val === null) return
                setVehicleType(val)
                if (val === 'none') setVehicleNumber('')
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select vehicle type…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {vehicleType && vehicleType !== 'none' && (
            <div className="flex flex-col gap-1.5">
              <Label>Vehicle number</Label>
              <Input
                placeholder="Vehicle number (e.g. MH09 AB 1234)"
                value={vehicleNumber}
                maxLength={20}
                className="uppercase"
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              />
            </div>
          )}
        </div>
        <DialogFooter showCloseButton>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

interface BookingDetailProps {
  id: string
  role: UserRole
}

export function BookingDetail({ id, role }: BookingDetailProps) {
  const { data: booking, isLoading, error } = useBooking(id)
  const { mutate: bookingAction, isPending: isActionPending } = useBookingAction()

  const [showAddPayment, setShowAddPayment] = useState(false)
  const [showDiscount, setShowDiscount] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [showCheckOut, setShowCheckOut] = useState(false)
  const [showVehicleEdit, setShowVehicleEdit] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showNotArrivedDialog, setShowNotArrivedDialog] = useState(false)

  // Void / Refund dialogs — keyed by payment ID
  const [reassignLine, setReassignLine] = useState<BookingRoom | null>(null)
  const [voidPayment, setVoidPayment] = useState<Payment | null>(null)
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null)
  const [refundNote, setRefundNote] = useState('')

  const isManagerPlus = MANAGER_PLUS.includes(role)

  const { mutate: voidPaymentMutate, isPending: isVoiding } = useVoidPayment()
  const { mutate: refundPaymentMutate, isPending: isRefunding } = useRefundPayment()

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="space-y-4">
          <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardContent className="py-10 text-center text-destructive">
            {error?.message ?? 'Booking not found'}
          </CardContent>
        </Card>
      </div>
    )
  }

  const b = booking as BookingDetailData
  const status = b.status
  const isReadOnly =
    status === 'checked_out' || status === 'cancelled' || status === 'not_arrived'
  const showPrint = status !== 'cancelled'
  const canActOnBooking = !isReadOnly
  // Day-use payment is collected at check-in, so a confirmed day-use with a
  // balance can't be checked in until it's paid (enforced server-side too).
  const dayUsePaymentDue = b.stay_type === 'day_use' && b.balance_due > 0

  // Room subtotals sum
  const roomsSubtotal = b.booking_rooms.reduce((sum, br) => sum + (br.subtotal ?? 0), 0)
  const discount = b.discount_amount ?? 0
  const gst = b.gst_amount ?? 0

  // ── Action handlers ────────────────────────────────────────────────────────

  function handleConfirm() {
    bookingAction(
      { id: b.id, updated_at: b.updated_at, action: 'confirm' },
      {
        onSuccess: () => {
          toast.success('Booking confirmed')
          setShowConfirmDialog(false)
        },
        onError: (err) => {
          toast.error(err.message ?? 'Could not confirm booking')
        },
      }
    )
  }

  function handleNotArrived() {
    bookingAction(
      { id: b.id, updated_at: b.updated_at, action: 'not_arrived' },
      {
        onSuccess: () => {
          toast.success('Booking marked as not arrived')
          setShowNotArrivedDialog(false)
        },
        onError: (err) => {
          toast.error(err.message ?? 'Action failed')
        },
      }
    )
  }

  function handleVoid() {
    if (!voidPayment) return
    voidPaymentMutate(
      { bookingId: b.id, paymentId: voidPayment.id },
      {
        onSuccess: () => {
          toast.success('Payment voided')
          setVoidPayment(null)
        },
        onError: (err) => {
          toast.error(err.message ?? 'Could not void payment')
        },
      }
    )
  }

  function handleRefund() {
    if (!refundPayment) return
    refundPaymentMutate(
      { bookingId: b.id, paymentId: refundPayment.id, reference_note: refundNote.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Refund recorded')
          setRefundPayment(null)
          setRefundNote('')
        },
        onError: (err) => {
          toast.error(err.message ?? 'Could not record refund')
        },
      }
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-lg font-semibold tracking-tight">
              {b.booking_ref}
            </span>
            <BookingStatusPill status={status} />
            {b.stay_type === 'day_use' && (
              <Badge variant="secondary" className="text-xs">
                Day use
              </Badge>
            )}
            <Badge variant="secondary" className="capitalize text-xs">
              {SOURCE_LABELS[b.source] ?? b.source}
            </Badge>
            {b.group_ref && (
              <Link
                href={`/admin/bookings?search=${encodeURIComponent(b.group_ref)}`}
                title="View all bookings in this group"
              >
                <Badge
                  variant="secondary"
                  className="text-xs hover:bg-accent hover:text-accent-foreground"
                >
                  <TagIcon className="size-3" />
                  {b.group_ref}
                </Badge>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <a
              href={`tel:${b.guests.phone}`}
              className="font-medium text-foreground hover:underline flex items-center gap-1"
            >
              {b.guests.fullname}
              <PhoneIcon className="size-3 text-muted-foreground" />
            </a>
            <span>·</span>
            <span>{formatStay(b)}</span>
            <span>·</span>
            <span>
              Created {formatDateTimeIST(b.created_at)} · {formatRelativeIST(b.created_at)}
            </span>
          </div>
        </div>

        {showPrint && (
          <Link
            href={`/admin/bookings/${b.id}/print`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <PrinterIcon className="size-4" />
            Print Receipt
          </Link>
        )}
      </div>

      {/* Guest card */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Guest Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{b.guests.fullname}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone</span>
            <a href={`tel:${b.guests.phone}`} className="font-medium hover:underline">
              {b.guests.phone}
            </a>
          </div>
          {b.guests.email && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{b.guests.email}</span>
            </div>
          )}
          {b.guests.city && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">City</span>
              <span>{b.guests.city}</span>
            </div>
          )}
          {b.guests.tags && b.guests.tags.length > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <TagIcon className="size-3" /> Tags
              </span>
              <div className="flex gap-1 flex-wrap justify-end">
                {b.guests.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {b.additional_guests && b.additional_guests > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Additional Guests</span>
              <span>{b.additional_guests}</span>
            </div>
          )}
          {b.special_requests && (
            <div className="pt-1">
              <p className="text-muted-foreground text-xs mb-0.5">Special Requests</p>
              <p className="text-sm bg-muted/50 rounded-md p-2">{b.special_requests}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rooms card */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Rooms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {b.booking_rooms.map((br) => (
              <div key={br.id} className="flex items-center justify-between text-sm py-1">
                <div>
                  <span className="font-medium">
                    {br.room_types?.name?.en ?? 'Room'}
                  </span>
                  {br.rooms ? (
                    <span className="text-muted-foreground ml-1.5">
                      — Room {br.rooms.room_number}
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 ml-1.5 text-xs font-medium">
                      unassigned
                    </span>
                  )}
                  {status === 'checked_in' && br.rooms && (
                    <button
                      type="button"
                      onClick={() => setReassignLine(br)}
                      className="ml-2 text-xs font-medium text-primary hover:underline"
                    >
                      Change room
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.stay_type === 'day_use'
                      ? `${formatCurrency(br.rate_per_night)} · day-use charge`
                      : `${formatCurrency(br.rate_per_night)} × ${br.nights} ${br.nights === 1 ? 'night' : 'nights'}`}
                  </p>
                </div>
                <span className="font-mono tabular-nums text-right">
                  {formatCurrency(br.subtotal)}
                </span>
              </div>
            ))}
          </div>

          {(b.actual_check_in ||
            (b.stay_type === 'day_use' &&
              formatDayUseWindow(b.day_use_from, b.day_use_to))) && (
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-0.5">
              {b.stay_type === 'day_use' &&
                formatDayUseWindow(b.day_use_from, b.day_use_to) && (
                  <div>
                    Expected day-use window:{' '}
                    {formatDayUseWindow(b.day_use_from, b.day_use_to)}
                  </div>
                )}
              {b.actual_check_in && (
                <div>
                  Checked in: {formatDateTimeIST(b.actual_check_in)}
                  {/* Live elapsed while a day-use guest is still in the room */}
                  {b.stay_type === 'day_use' &&
                    status === 'checked_in' &&
                    formatElapsedSince(b.actual_check_in) && (
                      <span className="text-foreground font-medium">
                        {' '}
                        · in room {formatElapsedSince(b.actual_check_in)}
                      </span>
                    )}
                </div>
              )}
              {b.actual_check_out && (
                <div>Checked out: {formatDateTimeIST(b.actual_check_out)}</div>
              )}
              {b.vehicle_type && (
                <div className="flex items-center gap-1.5">
                  <span>
                    Vehicle: {VEHICLE_TYPE_LABELS[b.vehicle_type as VehicleType]}
                    {b.vehicle_type !== 'none' && b.vehicle_number
                      ? ` · ${b.vehicle_number}`
                      : ''}
                  </span>
                  {(status === 'checked_in' || status === 'checked_out') && (
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setShowVehicleEdit(true)}
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charges card */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Charges</CardTitle>
        </CardHeader>
        <CardContent>
          <ChargeRow label="Room subtotal" value={formatCurrency(roomsSubtotal)} />
          {discount > 0 && (
            <ChargeRow
              label="Discount"
              value={`− ${formatCurrency(discount)}`}
              sub={b.discount_reason ?? undefined}
            />
          )}
          {gst > 0 && <ChargeRow label="GST" value={`+ ${formatCurrency(gst)}`} />}
          <Separator className="my-2" />
          {/* What the guest owes: subtotal − discount + GST (matches balance_due + advance). */}
          <ChargeRow
            label="Grand Total"
            value={formatCurrency(b.total_amount - discount + gst)}
            emphasis
          />
          <Separator className="my-2" />
          <ChargeRow label="Advance Paid" value={formatCurrency(b.advance_paid)} />
          {/* A negative balance means the guest overpaid (e.g. a discount applied
              after full payment) — show it as a refund owed, not "−₹". */}
          <ChargeRow
            label={b.balance_due < 0 ? 'Refund Due' : 'Balance Due'}
            value={formatCurrency(Math.abs(b.balance_due))}
            emphasis={b.balance_due !== 0}
          />
        </CardContent>
      </Card>

      {/* Payments ledger */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {b.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payments yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  {isManagerPlus && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {b.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono tabular-nums">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{METHOD_LABELS[payment.method] ?? payment.method}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[120px] truncate">
                      {payment.reference_note ?? '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium ${
                          payment.status === 'success'
                            ? 'text-green-600 dark:text-green-400'
                            : payment.status === 'refunded'
                            ? 'text-blue-600 dark:text-blue-400'
                            : payment.status === 'failed'
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {STATUS_LABELS[payment.status] ?? payment.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {payment.paid_at
                        ? formatDateTimeIST(payment.paid_at)
                        : formatDateTimeIST(payment.created_at)}
                    </TableCell>
                    {isManagerPlus && (
                      <TableCell>
                        {payment.status === 'success' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              title="Void payment"
                              onClick={() => setVoidPayment(payment)}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                              title="Record refund"
                              onClick={() => { setRefundPayment(payment); setRefundNote('') }}
                            >
                              <UndoIcon className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Post-checkout balance: allow recording a final payment */}
          {status === 'checked_out' && b.balance_due > 0 && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Balance of <span className="font-mono font-medium text-foreground">{formatCurrency(b.balance_due)}</span> still outstanding
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowAddPayment(true)}>
                Add Payment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action bar */}
      {canActOnBooking && (
        <Card size="sm">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {/* pending */}
              {status === 'pending' && isManagerPlus && (
                <Button variant="default" onClick={() => setShowConfirmDialog(true)}>
                  Confirm
                </Button>
              )}

              {/* confirmed → check in. Day-use must be paid in full first
                  (payment collected up front); block + guide to Add Payment. */}
              {status === 'confirmed' && (
                <Button
                  variant="default"
                  onClick={() => setShowCheckIn(true)}
                  disabled={dayUsePaymentDue}
                  title={
                    dayUsePaymentDue
                      ? 'Collect the day-use payment before check-in'
                      : undefined
                  }
                >
                  Check In
                </Button>
              )}

              {/* checked_in → check out */}
              {status === 'checked_in' && (
                <Button variant="default" onClick={() => setShowCheckOut(true)}>
                  Check Out
                </Button>
              )}

              {/* Add payment — pending, confirmed, checked_in */}
              {(status === 'pending' || status === 'confirmed' || status === 'checked_in') && (
                <Button variant="outline" onClick={() => setShowAddPayment(true)}>
                  Add Payment
                </Button>
              )}

              {/* Discount — MANAGER_PLUS (only reachable when canActOnBooking, so status is pending/confirmed/checked_in) */}
              {isManagerPlus && (
                <Button variant="outline" onClick={() => setShowDiscount(true)}>
                  {discount > 0 ? 'Edit Discount' : 'Apply Discount'}
                </Button>
              )}

              {/* Cancel — pending, confirmed */}
              {(status === 'pending' || status === 'confirmed') && (
                <Button variant="destructive" onClick={() => setShowCancel(true)}>
                  Cancel
                </Button>
              )}

              {/* Mark not arrived — pending, confirmed */}
              {(status === 'pending' || status === 'confirmed') && isManagerPlus && (
                <Button variant="outline" onClick={() => setShowNotArrivedDialog(true)}>
                  Mark Not Arrived
                </Button>
              )}
            </div>

            {/* Why Check In is blocked for an unpaid day-use */}
            {status === 'confirmed' && dayUsePaymentDue && (
              <p className="mt-2 text-xs text-muted-foreground">
                Day-use payment of{' '}
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(b.balance_due)}
                </span>{' '}
                must be collected before check-in. Use{' '}
                <span className="font-medium text-foreground">Add Payment</span> first.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Print receipt for non-cancelled */}
      {isReadOnly && showPrint && (
        <div className="flex justify-end">
          <Link
            href={`/admin/bookings/${b.id}/print`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <PrinterIcon className="size-4" />
            Print Receipt
          </Link>
        </div>
      )}

      {/* Dialogs */}
      <AddPaymentDialog
        bookingId={b.id}
        open={showAddPayment}
        onOpenChange={setShowAddPayment}
      />

      <DiscountDialog
        bookingId={b.id}
        updatedAt={b.updated_at}
        currentDiscount={discount}
        open={showDiscount}
        onOpenChange={setShowDiscount}
      />

      <CancelDialog
        bookingId={b.id}
        updatedAt={b.updated_at}
        bookingRef={b.booking_ref}
        open={showCancel}
        onOpenChange={setShowCancel}
      />

      <CheckInDialog
        key={showCheckIn ? `checkin-${b.id}-${b.updated_at}` : 'checkin-closed'}
        bookingId={b.id}
        updatedAt={b.updated_at}
        bookingRooms={b.booking_rooms}
        guest={{
          id: b.guests.id,
          id_type: b.guests.id_type,
          id_number: b.guests.id_number,
          id_proof_url: b.guests.id_proof_url,
          updated_at: b.guests.updated_at,
          last_vehicle_type: b.guests.last_vehicle_type,
          last_vehicle_number: b.guests.last_vehicle_number,
        }}
        open={showCheckIn}
        onOpenChange={setShowCheckIn}
      />

      <VehicleEditDialog
        bookingId={b.id}
        updatedAt={b.updated_at}
        initialType={b.vehicle_type}
        initialNumber={b.vehicle_number}
        open={showVehicleEdit}
        onOpenChange={setShowVehicleEdit}
      />

      <CheckOutDialog
        bookingId={b.id}
        updatedAt={b.updated_at}
        bookingRef={b.booking_ref}
        guestName={b.guests.fullname}
        open={showCheckOut}
        onOpenChange={setShowCheckOut}
      />

      {reassignLine && reassignLine.rooms && (
        <ReassignRoomDialog
          bookingId={b.id}
          updatedAt={b.updated_at}
          bookingRoomId={reassignLine.id}
          roomTypeId={reassignLine.room_type_id}
          roomTypeName={reassignLine.room_types?.name?.en ?? 'Room'}
          currentRoomId={reassignLine.rooms.id}
          currentRoomNumber={reassignLine.rooms.room_number}
          open={!!reassignLine}
          onOpenChange={(o) => !o && setReassignLine(null)}
        />
      )}

      {/* Confirm AlertDialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Booking {b.booking_ref}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the booking as confirmed. The guest will be expected to arrive on{' '}
              {formatDateIST(b.check_in)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <Button onClick={handleConfirm} disabled={isActionPending}>
              {isActionPending ? 'Confirming…' : 'Confirm Booking'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Not Arrived AlertDialog */}
      <AlertDialog open={showNotArrivedDialog} onOpenChange={setShowNotArrivedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Not Arrived?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark booking {b.booking_ref} as not arrived. The guest did not show up. This
              action will be logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <Button onClick={handleNotArrived} disabled={isActionPending}>
              {isActionPending ? 'Marking…' : 'Mark Not Arrived'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Void Payment AlertDialog */}
      <AlertDialog
        open={!!voidPayment}
        onOpenChange={(open) => { if (!open) setVoidPayment(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Void the{' '}
              <span className="font-mono font-medium">
                {voidPayment ? formatCurrency(voidPayment.amount) : ''}
              </span>{' '}
              {voidPayment ? (METHOD_LABELS[voidPayment.method] ?? voidPayment.method) : ''} payment?
              This removes it from the balance. The action is logged and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isVoiding}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleVoid} disabled={isVoiding}>
              {isVoiding ? 'Voiding…' : 'Void Payment'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Payment AlertDialog */}
      <AlertDialog
        open={!!refundPayment}
        onOpenChange={(open) => { if (!open) { setRefundPayment(null); setRefundNote('') } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record a refund?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark the{' '}
              <span className="font-mono font-medium">
                {refundPayment ? formatCurrency(refundPayment.amount) : ''}
              </span>{' '}
              {refundPayment ? (METHOD_LABELS[refundPayment.method] ?? refundPayment.method) : ''} payment
              as refunded. Add an optional UTR or reference number below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Label htmlFor="refund-ref" className="text-sm mb-1.5 block">
              Reference / UTR <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="refund-ref"
              placeholder="e.g. UTR1234567890"
              value={refundNote}
              onChange={(e) => setRefundNote(e.target.value)}
              maxLength={255}
              disabled={isRefunding}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRefunding}>Cancel</AlertDialogCancel>
            <Button onClick={handleRefund} disabled={isRefunding}>
              {isRefunding ? 'Recording…' : 'Confirm Refund'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
