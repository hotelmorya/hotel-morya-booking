'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IdProofUpload } from '@/components/admin/guests/IdProofUpload'
import { useCheckIn } from '@/hooks/use-bookings'
import { useGuest, useUpdateGuest } from '@/hooks/use-guests'
import { useExtractIdProof } from '@/hooks/use-id-proof-extract'
import { createClient } from '@/lib/supabase/client'
import { VEHICLE_TYPE_LABELS } from '@/schemas/booking'
import type { VehicleType } from '@/schemas/booking'

const ID_TYPE_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar',
  pan: 'PAN',
  passport: 'Passport',
  driving_license: 'Driving License',
}

/** Convert a datetime-local string ("2026-06-17T14:30") to an ISO 8601 string
 *  using the browser's local zone (IST for this hotel). Returns undefined when
 *  the value is empty or unparseable so the server defaults to now(). */
function datetimeLocalToISO(value: string): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (isNaN(d.getTime())) return undefined
  return d.toISOString()
}

/** Return a datetime-local string for the current instant in local wall-clock time. */
function nowDatetimeLocal(): string {
  const now = new Date()
  // Shift to local time by subtracting the UTC offset, then format as ISO and trim to minutes
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
  return localISO
}

interface BookingRoom {
  id: string
  room_type_id: string
  room_id: string | null
  room_types: {
    id: string
    name: { en: string; mr?: string; hi?: string }
  }
  rooms: { id: string; room_number: string } | null
}

interface CheckInGuest {
  id: string
  id_type: string | null
  id_number: string | null
  id_proof_url: string | null
  updated_at: string
  last_vehicle_type: string | null
  last_vehicle_number: string | null
}

interface CheckInDialogProps {
  bookingId: string
  updatedAt: string
  bookingRooms: BookingRoom[]
  guest: CheckInGuest
  open: boolean
  onOpenChange: (open: boolean) => void
}

function useAvailableRooms(roomTypeId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['rooms', 'available', roomTypeId],
    enabled,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('rooms')
        .select('id, room_number')
        .eq('room_type_id', roomTypeId)
        .eq('status', 'available')
        .is('deleted_at', null)
        .order('room_number')
      if (error) throw error
      return data ?? []
    },
  })
}

interface RoomAssignRowProps {
  line: BookingRoom
  assignment: string
  takenRoomIds: string[]
  onAssign: (roomId: string) => void
}

function RoomAssignRow({ line, assignment, takenRoomIds, onAssign }: RoomAssignRowProps) {
  const { data: availableRooms = [], isLoading } = useAvailableRooms(line.room_type_id, true)

  const roomTypeName = line.room_types?.name?.en ?? 'Room'

  // Hide rooms already picked by a sibling line so the same physical room can't
  // be assigned twice within this booking. Keep this row's own pick visible.
  const selectable = availableRooms.filter(
    (r) => r.id === assignment || !takenRoomIds.includes(r.id)
  )

  // If already assigned, show that room in the select too
  const roomsToShow =
    line.rooms && !selectable.find((r) => r.id === line.rooms!.id)
      ? [line.rooms, ...selectable]
      : selectable

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{roomTypeName}</Label>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading available rooms…</p>
      ) : roomsToShow.length === 0 ? (
        <p className="text-sm text-destructive">
          No available rooms of this type. Please mark a room as available first.
        </p>
      ) : (
        <Select
          // value→label map so the trigger shows "Room 101", not the room UUID.
          items={Object.fromEntries(roomsToShow.map((r) => [r.id, `Room ${r.room_number}`]))}
          value={assignment}
          onValueChange={(val) => {
            if (val !== null) onAssign(val)
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select room…" />
          </SelectTrigger>
          <SelectContent>
            {roomsToShow.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                Room {room.room_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

export function CheckInDialog({
  bookingId,
  updatedAt,
  bookingRooms,
  guest,
  open,
  onOpenChange,
}: CheckInDialogProps) {
  // Build initial assignments map: booking_room_id → room_id (empty if unassigned)
  const [assignments, setAssignments] = useState<Record<string, string>>(() =>
    Object.fromEntries(bookingRooms.map((br) => [br.id, br.room_id ?? '']))
  )

  // Optional actual check-in time (datetime-local, defaults to now)
  const [checkInTime, setCheckInTime] = useState<string>(nowDatetimeLocal)

  // Vehicle — pre-filled from the guest's last vehicle. Number hidden when 'none'.
  const [vehicleType, setVehicleType] = useState<string>(
    guest.last_vehicle_type ?? ''
  )
  const [vehicleNumber, setVehicleNumber] = useState<string>(
    guest.last_vehicle_number ?? ''
  )

  // Inline ID capture state (used only when the guest has no ID on file).
  const [idType, setIdType] = useState<string>(guest.id_type ?? '')
  const [idNumber, setIdNumber] = useState<string>(guest.id_number ?? '')

  // Name read off the ID by OCR — shown as a read-only match hint (the guest
  // already exists, so we never overwrite their name and never block check-in).
  const [scannedName, setScannedName] = useState<string | null>(null)

  const { mutate: checkIn, isPending } = useCheckIn()
  const { mutate: updateGuest, isPending: savingId } = useUpdateGuest()
  const { mutate: extractId, isPending: scanning } = useExtractIdProof()

  // Live guest detail — invalidated by the ID PATCH + upload, so hasId re-derives
  // after the staff fills in the inline ID. Falls back to the prop until loaded.
  const { data: liveGuest } = useGuest(open ? guest.id : undefined)
  const idType_ = liveGuest?.id_type ?? guest.id_type
  const idNumber_ = liveGuest?.id_number ?? guest.id_number
  const idProofUrl = liveGuest?.id_proof_url ?? guest.id_proof_url
  const guestUpdatedAt = liveGuest?.updated_at ?? guest.updated_at
  const hasId = !!idType_ && !!idNumber_ && !!idProofUrl

  const unassignedLines = bookingRooms.filter((br) => !br.room_id)

  function handleAssign(bookingRoomId: string, roomId: string) {
    setAssignments((prev) => ({ ...prev, [bookingRoomId]: roomId }))
  }

  function handleSaveId() {
    if (!idType || !idNumber.trim()) {
      toast.error('Select an ID type and enter the ID number')
      return
    }
    updateGuest(
      {
        id: guest.id,
        updated_at: guestUpdatedAt,
        // guestSchema validates the full record; carry the existing identity fields.
        fullname: liveGuest?.fullname ?? '',
        phone: liveGuest?.phone ?? '',
        email: liveGuest?.email ?? undefined,
        id_type: idType as never,
        id_number: idNumber.trim(),
        city: liveGuest?.city ?? undefined,
        address: liveGuest?.address ?? undefined,
        preferred_language: (liveGuest?.preferred_language ?? 'en') as never,
        notes: liveGuest?.notes ?? undefined,
        tags: liveGuest?.tags ?? [],
      },
      {
        onSuccess: () =>
          toast.success('ID details saved. Upload the document to enable check-in.'),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Could not save ID details'),
      }
    )
  }

  function handleScanId() {
    extractId(guest.id, {
      onSuccess: (res) => {
        if (res.id_type) setIdType(res.id_type)
        if (res.id_number) setIdNumber(res.id_number)
        setScannedName(res.fullname ?? null)
        // Never auto-saves — staff still presses "Save ID details".
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

  function handleSubmit() {
    // Vehicle: a type must be chosen; number required unless type is 'none'.
    if (!vehicleType) {
      toast.error('Select a vehicle type (choose "None" if the guest has no vehicle)')
      return
    }
    if (vehicleType !== 'none' && !vehicleNumber.trim()) {
      toast.error('Vehicle number is required')
      return
    }

    // Validate all unassigned lines now have a room selected
    const missing = unassignedLines.filter((br) => !assignments[br.id])
    if (missing.length > 0) {
      toast.error('Please assign a room to all room lines before checking in')
      return
    }

    const assignmentList = unassignedLines.map((br) => ({
      booking_room_id: br.id,
      room_id: assignments[br.id],
    }))

    checkIn(
      {
        id: bookingId,
        updated_at: updatedAt,
        assignments: assignmentList,
        actual_check_in: datetimeLocalToISO(checkInTime),
        vehicle_type: vehicleType as VehicleType,
        vehicle_number: vehicleType === 'none' ? undefined : vehicleNumber.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Guest checked in successfully')
          onOpenChange(false)
        },
        onError: (err) => {
          toast.error(err.message ?? 'Check-in failed')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto]">
        <DialogHeader>
          <DialogTitle>Check In Guest</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto -mx-1 px-1">
          {unassignedLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All rooms are already assigned. Confirm check-in to proceed.
            </p>
          ) : (
            unassignedLines.map((line) => (
              <RoomAssignRow
                key={line.id}
                line={line}
                assignment={assignments[line.id]}
                takenRoomIds={Object.entries(assignments)
                  .filter(([brId, roomId]) => brId !== line.id && roomId)
                  .map(([, roomId]) => roomId)}
                onAssign={(roomId) => handleAssign(line.id, roomId)}
              />
            ))
          )}

          {/* Vehicle (required; pre-filled from last vehicle) */}
          <div className="flex flex-col gap-1.5">
            <Label>Vehicle</Label>
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
            {vehicleType && vehicleType !== 'none' && (
              <Input
                placeholder="Vehicle number (e.g. MH09 AB 1234)"
                value={vehicleNumber}
                maxLength={20}
                className="uppercase"
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              />
            )}
          </div>

          {/* ID-proof gate — inline capture when the guest has no ID on file.
              Ordered: Upload → Scan → type/number fields → Save. */}
          {!hasId && (
            <div className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
              <p className="text-sm font-medium text-foreground">ID proof required</p>
              <p className="text-xs text-muted-foreground">
                Upload the ID, scan to read the details, confirm, then save.
              </p>

              {/* 1. Upload */}
              <IdProofUpload guestId={guest.id} existingPath={idProofUrl} />

              {/* 2. Scan (OCR) — enabled once an image is on file */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleScanId}
                disabled={!idProofUrl || scanning}
                className="self-start"
              >
                {scanning ? 'Scanning…' : 'Scan ID'}
              </Button>
              {!idProofUrl && (
                <p className="text-xs text-muted-foreground">
                  Upload an ID image to enable Scan.
                </p>
              )}

              {/* 3. ID type + number (pre-filled by the scan, editable) */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">ID type</Label>
                <Select
                  items={ID_TYPE_LABELS}
                  value={idType}
                  onValueChange={(val) => {
                    if (val !== null) setIdType(val)
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
                  value={idNumber}
                  maxLength={20}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </div>
              {scannedName && (
                <p className="text-xs text-muted-foreground">
                  Name on ID: <span className="font-medium">{scannedName}</span>
                </p>
              )}

              {/* 4. Save */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveId}
                disabled={savingId}
                className="self-start"
              >
                {savingId ? 'Saving…' : 'Save ID details'}
              </Button>
            </div>
          )}

          {/* Optional actual check-in time */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="check-in-time" className="text-xs text-muted-foreground">
              Actual check-in time{' '}
              <span className="text-text-disabled">(defaults to now)</span>
            </Label>
            <Input
              id="check-in-time"
              type="datetime-local"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col sm:items-stretch sm:justify-start">
          {!hasId && (
            <p className="text-xs text-muted-foreground">
              Add the guest&apos;s ID proof to enable check-in
            </p>
          )}
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
            <Button onClick={handleSubmit} disabled={isPending || !hasId}>
              {isPending ? 'Checking in…' : 'Confirm Check-In'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
