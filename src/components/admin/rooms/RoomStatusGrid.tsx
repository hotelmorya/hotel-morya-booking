'use client'

import {
  IconArchive,
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconPlus,
  IconRestore,
  IconTrash,
  IconUser,
  IconX,
} from '@tabler/icons-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  deriveRoomStatus,
  buildRoomContextMap,
  ROOM_ASSIGNMENT_SELECT,
  STATUS_LABEL,
  type AssignmentWithContext,
  type DerivedRoomStatus,
  type RoomBookingContext,
} from '@/lib/room-status'
import type { Tables } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type Room = Tables<'rooms'>
type RoomType = Tables<'room_types'>

interface RoomWithType extends Room {
  room_types: Pick<RoomType, 'id' | 'name'> | null
}

const STATUS_ORDER: DerivedRoomStatus[] = [
  'available',
  'arriving',
  'occupied',
  'cleaning',
  'repair',
]

function getRoomTypeName(name: unknown, locale: 'en' | 'mr' = 'en'): string {
  if (!name) return 'Unknown'
  if (typeof name === 'string') return name
  const n = name as Record<string, string>
  return n[locale] ?? n.en ?? Object.values(n)[0] ?? 'Unknown'
}

function relativeTime(isoString: string | null | undefined): string {
  if (!isoString) return ''
  const diffMs = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

async function fetchRooms(): Promise<RoomWithType[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*, room_types(id, name)')
    .is('deleted_at', null)
    .order('room_number')
  if (error) throw error
  return (data ?? []) as RoomWithType[]
}

async function fetchDeletedRooms(): Promise<RoomWithType[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*, room_types(id, name)')
    .not('deleted_at', 'is', null)
    .order('room_number')
  if (error) throw error
  return (data ?? []) as RoomWithType[]
}

// Room assignments for active bookings — lets the grid derive occupancy from
// the booking truth (checked-in guest) rather than the physical rooms.status,
// which can drift if a room is cleaned/edited while still occupied.
async function fetchRoomAssignments(): Promise<AssignmentWithContext[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('booking_rooms')
    .select(ROOM_ASSIGNMENT_SELECT)
    .not('room_id', 'is', null)
    .in('bookings.status', ['checked_in', 'confirmed', 'pending'])
    .is('bookings.deleted_at', null)
  if (error) throw error
  return (data ?? []) as unknown as AssignmentWithContext[]
}

async function fetchRoomTypes(): Promise<Pick<RoomType, 'id' | 'name'>[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('room_types')
    .select('id, name')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Room Dialog
// ─────────────────────────────────────────────────────────────────────────────

function AddRoomDialog({
  roomTypes,
  deletedRooms,
  onClose,
  onAdded,
}: {
  roomTypes: Pick<RoomType, 'id' | 'name'>[]
  deletedRooms: RoomWithType[]
  onClose: () => void
  onAdded: () => void
}) {
  const supabase = createClient()
  const [roomNumber, setRoomNumber] = useState('')
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id ?? '')
  const [floor, setFloor] = useState(0)
  const [status, setStatus] = useState<'available' | 'cleaning' | 'maintenance'>('available')
  const [error, setError] = useState<string | null>(null)
  const [deletedMatch, setDeletedMatch] = useState<RoomWithType | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleRestoreDeleted() {
    if (!deletedMatch) return
    setSaving(true)
    setError(null)
    const { error: dbErr } = await supabase
      .from('rooms')
      .update({
        room_type_id: roomTypeId,
        floor,
        status,
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deletedMatch.id)
    setSaving(false)
    if (dbErr) {
      setError(dbErr.message)
      return
    }
    toast.success(`Room ${deletedMatch.room_number} restored successfully`)
    onAdded()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setDeletedMatch(null)
    if (!roomNumber.trim()) {
      setError('Room number is required')
      return
    }
    if (!roomTypeId) {
      setError('Room type is required')
      return
    }
    setSaving(true)
    setError(null)

    const { error: dbErr } = await supabase.from('rooms').insert({
      room_number: roomNumber.trim(),
      room_type_id: roomTypeId,
      floor,
      status,
    })

    setSaving(false)
    if (dbErr) {
      if (dbErr.code === '23505') {
        const match = deletedRooms.find(
          (r) => r.room_number.toLowerCase() === roomNumber.trim().toLowerCase()
        )
        if (match) {
          setError(
            `Room number "${roomNumber.trim()}" was previously deleted. You can restore it instead.`
          )
          setDeletedMatch(match)
        } else {
          setError(`Room number "${roomNumber.trim()}" already exists`)
        }
      } else {
        setError(dbErr.message)
      }
      return
    }
    toast.success(`Room ${roomNumber.trim()} added successfully`)
    onAdded()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-xl border-hairline border-border bg-surface-1 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-subsection font-medium text-text-primary">
            Add room
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-text-tertiary hover:bg-surface-2"
          >
            <IconX size={16} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-small font-medium text-text-secondary">
              Room number <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              maxLength={10}
              placeholder="e.g. 101"
              className="w-full rounded border-hairline border-border bg-surface-1 px-3 py-2 text-body text-text-primary placeholder:text-text-disabled focus:ring-focus outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-small font-medium text-text-secondary">
              Room type <span className="text-danger">*</span>
            </label>
            <select
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              className="w-full rounded border-hairline border-border bg-surface-1 px-3 py-2 text-body text-text-primary focus:ring-focus outline-none"
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {getRoomTypeName(rt.name)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-small font-medium text-text-secondary">
              Floor
            </label>
            <input
              type="number"
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
              min={0}
              max={50}
              className="w-full rounded border-hairline border-border bg-surface-1 px-3 py-2 text-body text-text-primary focus:ring-focus outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-small font-medium text-text-secondary">
              Initial status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as 'available' | 'cleaning' | 'maintenance')
              }
              className="w-full rounded border-hairline border-border bg-surface-1 px-3 py-2 text-body text-text-primary focus:ring-focus outline-none"
            >
              <option value="available">Available</option>
              <option value="cleaning">Cleaning</option>
              <option value="maintenance">Maintenance (Repair)</option>
            </select>
          </div>

          {error && (
            <div className="rounded bg-danger/10 px-3 py-2 text-small text-danger">
              <p>{error}</p>
              {deletedMatch && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleRestoreDeleted}
                  disabled={saving}
                  className="mt-2 w-full gap-1.5 bg-accent-500 font-medium text-white hover:bg-accent-700"
                >
                  <IconRestore size={14} />
                  Restore Room {deletedMatch.room_number} instead
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-hairline border-border bg-surface-1 text-text-secondary hover:bg-surface-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-accent-500 font-medium text-white disabled:opacity-60 hover:bg-accent-700"
            >
              {saving ? 'Adding…' : 'Add room'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Room Dialog
// ─────────────────────────────────────────────────────────────────────────────

function EditRoomDialog({
  room,
  roomTypes,
  onClose,
  onUpdated,
}: {
  room: RoomWithType
  roomTypes: Pick<RoomType, 'id' | 'name'>[]
  onClose: () => void
  onUpdated: () => void
}) {
  const supabase = createClient()
  const [roomNumber, setRoomNumber] = useState(room.room_number)
  const [roomTypeId, setRoomTypeId] = useState(room.room_type_id)
  const [floor, setFloor] = useState(room.floor ?? 0)
  // Occupied is booking-driven and DB-guarded — staff can't change the status of
  // a room with a checked-in guest, so the quick-status buttons are replaced by a note.
  const isOccupied = room.status === 'occupied'
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Quick status change — the common action. Applies on tap and closes.
  async function changeStatus(newStatus: 'available' | 'cleaning' | 'maintenance') {
    if (newStatus === room.status || saving) return
    setSaving(true)
    setError(null)
    const { error: dbErr } = await supabase
      .from('rooms')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', room.id)
      .is('deleted_at', null)
    setSaving(false)
    if (dbErr) {
      setError(dbErr.message)
      return
    }
    onUpdated()
    onClose()
  }

  // Structural edit — rare; behind the "Edit room details" expander. Never
  // touches status (that's the quick buttons above).
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roomNumber.trim()) {
      setError('Room number is required')
      return
    }
    setSaving(true)
    setError(null)

    const { error: dbErr } = await supabase
      .from('rooms')
      .update({
        room_number: roomNumber.trim(),
        room_type_id: roomTypeId,
        floor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', room.id)
      .is('deleted_at', null)

    setSaving(false)
    if (dbErr) {
      setError(dbErr.message)
      return
    }
    onUpdated()
    onClose()
  }

  async function handleDelete() {
    setDeleting(true)
    const now = new Date().toISOString()
    const { error: dbErr } = await supabase
      .from('rooms')
      .update({ deleted_at: now })
      .eq('id', room.id)

    setDeleting(false)
    if (dbErr) {
      setError(dbErr.message)
      return
    }
    toast.success(`Room ${room.room_number} removed`, {
      action: {
        label: 'Undo',
        onClick: async () => {
          await supabase
            .from('rooms')
            .update({
              deleted_at: null,
              deleted_by: null,
              updated_at: new Date().toISOString(),
              status: 'available',
            })
            .eq('id', room.id)
          onUpdated()
          toast.success(`Room ${room.room_number} restored`)
        },
      },
    })
    onUpdated()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-xl border-hairline border-border bg-surface-1 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-subsection font-medium text-text-primary">
            Room {room.room_number}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-text-tertiary hover:bg-surface-2"
          >
            <IconX size={16} />
          </Button>
        </div>

        {/* Quick status — the common action */}
        <div>
          <p className="mb-1.5 text-small font-medium text-text-secondary">
            Status{' '}
            <span className="text-text-tertiary">(occupied is booking-driven)</span>
          </p>
          {isOccupied ? (
            <p className="rounded border-hairline border-border bg-surface-2 px-3 py-2 text-body text-text-secondary">
              Occupied — set by check-in. Check the guest out to change the room status.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {([
                ['available', 'Available'],
                ['cleaning', 'Cleaning'],
                ['maintenance', 'Repair'],
              ] as const).map(([val, label]) => {
                const derived = val === 'maintenance' ? 'repair' : val
                const active = room.status === val
                return (
                  <button
                    key={val}
                    type="button"
                    disabled={saving}
                    onClick={() => changeStatus(val)}
                    className={cn(
                      'rounded-md border px-2 py-2.5 text-small font-medium transition-colors disabled:opacity-60',
                      active
                        ? `bg-room-${derived}-bg text-room-${derived}-text border-room-${derived}-border`
                        : 'border-border bg-surface-1 text-text-secondary hover:bg-surface-2'
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded bg-danger/10 px-3 py-2 text-small text-danger">
            {error}
          </p>
        )}

        {/* Edit room details — rare; collapsed by default */}
        <div className="mt-4 border-t-hairline border-border pt-3">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex w-full items-center justify-between text-small font-medium text-text-secondary hover:text-text-primary"
          >
            <span>Edit room details</span>
            <IconChevronDown
              size={16}
              className={cn('transition-transform', showDetails && 'rotate-180')}
            />
          </button>

          {showDetails && (
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-small font-medium text-text-secondary">
                  Room number
                </label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  maxLength={10}
                  className="w-full rounded border-hairline border-border bg-surface-1 px-3 py-2 text-body text-text-primary focus:ring-focus outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-small font-medium text-text-secondary">
                  Room type
                </label>
                <select
                  value={roomTypeId}
                  onChange={(e) => setRoomTypeId(e.target.value)}
                  className="w-full rounded border-hairline border-border bg-surface-1 px-3 py-2 text-body text-text-primary focus:ring-focus outline-none"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {getRoomTypeName(rt.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-small font-medium text-text-secondary">
                  Floor
                </label>
                <input
                  type="number"
                  value={floor}
                  onChange={(e) => setFloor(Number(e.target.value))}
                  min={0}
                  max={50}
                  className="w-full rounded border-hairline border-border bg-surface-1 px-3 py-2 text-body text-text-primary focus:ring-focus outline-none"
                />
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-accent-500 font-medium text-white disabled:opacity-60 hover:bg-accent-700"
              >
                {saving ? 'Saving…' : 'Save details'}
              </Button>
            </form>
          )}
        </div>

        {/* Danger zone */}
        <div className="mt-4 border-t-hairline border-border pt-4">
          {isOccupied ? (
            <p className="text-small text-text-tertiary">
              Check the guest out before removing this room.
            </p>
          ) : !showDeleteConfirm ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="h-auto gap-1.5 p-0 text-small text-danger hover:bg-transparent hover:underline"
            >
              <IconTrash size={14} />
              Remove room
            </Button>
          ) : (
            <div className="rounded border-hairline border-danger/40 bg-danger/5 p-3">
              <p className="mb-2 text-small text-text-secondary">
                Remove room {room.room_number}? You can restore it later from Deleted Rooms.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 border-hairline border-border py-1.5 text-small text-text-secondary hover:bg-surface-2"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-danger py-1.5 text-small font-medium text-white disabled:opacity-60 hover:bg-danger/90"
                >
                  {deleting ? 'Removing…' : 'Remove'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Card
// ─────────────────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  status,
  context,
  dimmed,
  onMarkClean,
  onEdit,
}: {
  room: Room
  status: DerivedRoomStatus
  context: RoomBookingContext | null
  dimmed: boolean
  onMarkClean: () => void
  onEdit: () => void
}) {
  const contextLine =
    status === 'cleaning'
      ? `Vacated ${relativeTime(room.updated_at)}`
      : status === 'repair'
        ? 'Under maintenance'
        : null

  // Card is a clickable container, not a <button>, so the nested "Mark clean"
  // action and the booking link can be real interactive elements without invalid
  // button-in-button nesting.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit()
        }
      }}
      className={cn(
        'relative flex min-h-[110px] w-full cursor-pointer flex-col items-start rounded-md border px-3 py-2.5 text-left transition-all hover:opacity-90 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        `bg-room-${status}-bg text-room-${status}-text border-room-${status}-border`,
        dimmed && 'opacity-25 saturate-50 hover:opacity-50'
      )}
    >
      <span className="text-micro font-semibold uppercase tracking-wide">
        {STATUS_LABEL[status]}
      </span>
      <span className="mt-0.5 font-mono text-page font-bold leading-none text-tabular">
        {room.room_number}
      </span>

      {/* Guest + booking context (occupied / arriving) */}
      {context ? (
        <div className="mt-1 flex w-full flex-col gap-0.5">
          <span className="flex items-center gap-1 text-micro opacity-90">
            <IconUser size={11} className="shrink-0" />
            <span className="truncate">{context.guestName}</span>
          </span>
          <Link
            href={`/admin/bookings/${context.bookingId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex w-fit items-center gap-0.5 text-micro font-medium underline decoration-current/40 underline-offset-2 hover:decoration-current"
          >
            {context.bookingRef}
            <IconArrowRight size={11} />
          </Link>
        </div>
      ) : (
        contextLine && (
          <span className="mt-1 text-micro opacity-80">{contextLine}</span>
        )
      )}

      {/* Mark clean inline action */}
      {status === 'cleaning' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onMarkClean()
          }}
          className="mt-auto flex items-center gap-1 rounded border border-current/30 bg-white/30 px-2 py-1 text-micro font-medium hover:bg-white/50"
        >
          <IconCheck size={11} />
          Mark clean
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Summary Strip
// ─────────────────────────────────────────────────────────────────────────────

function StatusSummaryStrip({
  counts,
  activeFilter,
  onToggleFilter,
}: {
  counts: Partial<Record<DerivedRoomStatus, number>>
  activeFilter: DerivedRoomStatus | null
  onToggleFilter: (status: DerivedRoomStatus) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_ORDER.map((s) => {
        const count = counts[s] ?? 0
        if (count === 0) return null
        const active = activeFilter === s
        return (
          <button
            key={s}
            type="button"
            onClick={() => onToggleFilter(s)}
            aria-pressed={active}
            title={active ? 'Clear filter' : `Show only ${STATUS_LABEL[s]} rooms`}
            className={cn(
              'pill cursor-pointer transition-all',
              `bg-room-${s}-bg text-room-${s}-text border border-room-${s}-border`,
              active
                ? 'ring-2 ring-ring ring-offset-1 ring-offset-bg'
                : activeFilter
                  ? 'opacity-50 hover:opacity-100'
                  : 'hover:opacity-80'
            )}
          >
            <span className={cn('pill-dot', `bg-room-${s}-text opacity-70`)} />
            {count} {STATUS_LABEL[s].toLowerCase()}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Deleted Rooms Dialog
// ─────────────────────────────────────────────────────────────────────────────

function DeletedRoomsDialog({
  onClose,
  onRestored,
}: {
  onClose: () => void
  onRestored: () => void
}) {
  const supabase = createClient()
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [restoringAll, setRestoringAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: deletedRooms = [], isLoading, refetch } = useQuery({
    queryKey: ['deleted-rooms'],
    queryFn: fetchDeletedRooms,
  })

  async function handleRestore(room: RoomWithType) {
    setRestoringId(room.id)
    setError(null)
    const { error: dbErr } = await supabase
      .from('rooms')
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString(),
        status: 'available',
      })
      .eq('id', room.id)

    setRestoringId(null)
    if (dbErr) {
      setError(dbErr.message)
      toast.error(`Failed to restore Room ${room.room_number}: ${dbErr.message}`)
      return
    }

    toast.success(`Room ${room.room_number} restored successfully`)
    refetch()
    onRestored()
  }

  async function handleRestoreAll() {
    if (deletedRooms.length === 0) return
    setRestoringAll(true)
    setError(null)
    const ids = deletedRooms.map((r) => r.id)
    const { error: dbErr } = await supabase
      .from('rooms')
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString(),
        status: 'available',
      })
      .in('id', ids)

    setRestoringAll(false)
    if (dbErr) {
      setError(dbErr.message)
      toast.error(`Failed to restore rooms: ${dbErr.message}`)
      return
    }

    toast.success(`All ${deletedRooms.length} rooms restored successfully`)
    refetch()
    onRestored()
  }

  return (
    <div
      className="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-xl border-hairline border-border bg-surface-1 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-subsection font-medium text-text-primary">
              <IconArchive size={18} className="text-text-secondary" />
              Deleted rooms
            </h2>
            <p className="mt-0.5 text-small text-text-tertiary">
              Restore soft-deleted rooms to make them available again.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-text-tertiary hover:bg-surface-2"
          >
            <IconX size={16} />
          </Button>
        </div>

        {error && (
          <p className="mb-3 rounded bg-danger/10 px-3 py-2 text-small text-danger">
            {error}
          </p>
        )}

        {isLoading ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-12 w-full rounded-lg bg-surface-2" />
            <Skeleton className="h-12 w-full rounded-lg bg-surface-2" />
          </div>
        ) : deletedRooms.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <p className="text-body text-text-secondary">No deleted rooms found.</p>
            <p className="mt-1 text-small text-text-tertiary">
              All configured rooms are active.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-small font-medium text-text-secondary">
                {deletedRooms.length} deleted room{deletedRooms.length === 1 ? '' : 's'}
              </span>
              {deletedRooms.length > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={restoringAll || !!restoringId}
                  onClick={handleRestoreAll}
                  className="gap-1.5 border-hairline border-border text-xs font-medium"
                >
                  <IconRestore size={14} />
                  {restoringAll ? 'Restoring all…' : 'Restore all'}
                </Button>
              )}
            </div>

            <div className="max-h-[60vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {deletedRooms.map((room) => {
                const typeName = getRoomTypeName(room.room_types?.name ?? {})
                const isRestoring = restoringId === room.id
                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-3 transition-colors hover:bg-surface-2"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-body font-semibold text-text-primary">
                          Room {room.room_number}
                        </span>
                        <span className="rounded bg-surface-3 px-1.5 py-0.5 text-xs text-text-secondary">
                          Floor {room.floor}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-small text-text-tertiary">
                        <span>{typeName}</span>
                        <span>•</span>
                        <span>Deleted {relativeTime(room.deleted_at)}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      disabled={isRestoring || restoringAll}
                      onClick={() => handleRestore(room)}
                      className="gap-1.5 bg-accent-500 font-medium text-white hover:bg-accent-700"
                    >
                      <IconRestore size={15} />
                      {isRestoring ? 'Restoring…' : 'Restore'}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main: RoomStatusGrid
// ─────────────────────────────────────────────────────────────────────────────

export function RoomStatusGrid() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [showAddRoom, setShowAddRoom] = useState(false)
  const [showDeletedRooms, setShowDeletedRooms] = useState(false)
  const [editRoom, setEditRoom] = useState<RoomWithType | null>(null)
  const [filter, setFilter] = useState<DerivedRoomStatus | null>(null)

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms-grid'],
    queryFn: fetchRooms,
    staleTime: 30_000,
  })

  const { data: deletedRooms = [], isLoading: deletedLoading } = useQuery({
    queryKey: ['deleted-rooms'],
    queryFn: fetchDeletedRooms,
    staleTime: 30_000,
  })

  const { data: roomTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['room-types-list-active'],
    queryFn: fetchRoomTypes,
    staleTime: 5 * 60_000,
  })

  const { data: assignments = [] } = useQuery({
    queryKey: ['rooms-grid-assignments'],
    queryFn: fetchRoomAssignments,
    staleTime: 30_000,
  })

  // Realtime subscription.
  useEffect(() => {
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] })
      queryClient.invalidateQueries({ queryKey: ['deleted-rooms'] })
      queryClient.invalidateQueries({ queryKey: ['rooms-grid-assignments'] })
    }
    const channel = supabase
      .channel('rooms-grid-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, refresh)
      // Check-in/out and room assignment change occupancy without touching rooms.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_rooms' }, refresh)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])

  const markClean = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase
        .from('rooms')
        .update({ status: 'available', updated_at: new Date().toISOString() })
        .eq('id', roomId)
        .is('deleted_at', null)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] })
    },
  })

  const isLoading = roomsLoading || typesLoading || deletedLoading

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full bg-surface-2" />
          ))}
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32 bg-surface-2" />
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-[110px] rounded-md bg-surface-2" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Group rooms by room type. deriveRoomStatus reads room_id + bookings.status/
  // check_in — our richer assignment rows are structurally compatible, so cast.
  const roomsWithStatus = rooms.map((room) => ({
    room,
    status: deriveRoomStatus(
      room,
      assignments as unknown as Parameters<typeof deriveRoomStatus>[1]
    ),
  }))

  const todayIST = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  })
  const contextMap = buildRoomContextMap(assignments, todayIST)

  const counts = STATUS_ORDER.reduce<Partial<Record<DerivedRoomStatus, number>>>(
    (acc, s) => {
      const c = roomsWithStatus.filter((r) => r.status === s).length
      if (c > 0) acc[s] = c
      return acc
    },
    {}
  )

  // Group by room type, preserving type sort_order.
  const typeMap = new Map<string, RoomWithType[]>()
  for (const { room } of roomsWithStatus) {
    const key = room.room_type_id
    if (!typeMap.has(key)) typeMap.set(key, [])
    typeMap.get(key)!.push(room)
  }

  // Sort type sections by name (since sort_order is on room_types table).
  const typeSections: Array<{
    typeId: string
    typeName: string
    rooms: RoomWithType[]
  }> = []

  for (const [typeId, typeRooms] of typeMap) {
    const rtRow = roomTypes.find((rt) => rt.id === typeId)
    typeSections.push({
      typeId,
      typeName: getRoomTypeName(rtRow?.name ?? {}),
      rooms: typeRooms,
    })
  }

  return (
    <div className="space-y-6">
      {/* Status summary strip + primary actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusSummaryStrip
          counts={counts}
          activeFilter={filter}
          onToggleFilter={(s) => setFilter((cur) => (cur === s ? null : s))}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDeletedRooms(true)}
            className="gap-1.5 border-hairline border-border bg-surface-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary"
          >
            <IconArchive size={16} />
            Deleted rooms
            {deletedRooms.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-xs font-semibold">
                {deletedRooms.length}
              </Badge>
            )}
          </Button>
          <Button
            onClick={() => setShowAddRoom(true)}
            className="gap-1.5 bg-accent-500 font-medium text-white hover:bg-accent-700"
          >
            <IconPlus size={16} />
            Add room
          </Button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <Card className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border-hairline border-border bg-surface-1 p-8 text-center">
          <CardContent className="flex flex-col items-center p-0">
            <p className="text-body text-text-secondary">No active rooms configured.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {deletedRooms.length > 0 && (
                <Button
                  onClick={() => setShowDeletedRooms(true)}
                  variant="outline"
                  className="gap-1.5 border-hairline border-border"
                >
                  <IconArchive size={16} />
                  Deleted rooms ({deletedRooms.length})
                </Button>
              )}
              <Button
                onClick={() => setShowAddRoom(true)}
                className="gap-1.5 bg-accent-500 font-medium text-white hover:bg-accent-700"
              >
                <IconPlus size={16} />
                Add room
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {typeSections.map(({ typeId, typeName, rooms: typeRooms }) => {
            const availCount = typeRooms.filter((r) => {
              const derived = roomsWithStatus.find((rws) => rws.room.id === r.id)
              return derived?.status === 'available'
            }).length

            return (
              <section key={typeId}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-subsection font-medium text-text-primary">
                    {typeName}
                  </h3>
                  <span className="text-small text-text-tertiary">
                    {availCount} of {typeRooms.length} available
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                  {typeRooms.map((room) => {
                    const derived =
                      roomsWithStatus.find((rws) => rws.room.id === room.id)
                        ?.status ?? 'available'
                    return (
                      <RoomCard
                        key={room.id}
                        room={room}
                        status={derived}
                        context={contextMap.get(room.id) ?? null}
                        dimmed={filter !== null && filter !== derived}
                        onMarkClean={() => markClean.mutate(room.id)}
                        onEdit={() => setEditRoom(room)}
                      />
                    )
                  })}
                </div>
              </section>
            )
          })}
        </>
      )}

      {/* Add Room Dialog */}
      {showAddRoom && (
        <AddRoomDialog
          roomTypes={roomTypes}
          deletedRooms={deletedRooms}
          onClose={() => setShowAddRoom(false)}
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['rooms-grid'] })
            queryClient.invalidateQueries({ queryKey: ['deleted-rooms'] })
          }}
        />
      )}

      {/* Edit Room Dialog */}
      {editRoom && (
        <EditRoomDialog
          room={editRoom}
          roomTypes={roomTypes}
          onClose={() => setEditRoom(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['rooms-grid'] })
            queryClient.invalidateQueries({ queryKey: ['deleted-rooms'] })
          }}
        />
      )}

      {/* Deleted Rooms Dialog */}
      {showDeletedRooms && (
        <DeletedRoomsDialog
          onClose={() => setShowDeletedRooms(false)}
          onRestored={() => {
            queryClient.invalidateQueries({ queryKey: ['rooms-grid'] })
            queryClient.invalidateQueries({ queryKey: ['deleted-rooms'] })
          }}
        />
      )}

    </div>
  )
}
