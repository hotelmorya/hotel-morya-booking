'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  IconArrowRight,
  IconBrush,
  IconCircleCheck,
  IconUser,
} from '@tabler/icons-react'

import { createClient } from '@/lib/supabase/client'
import {
  deriveRoomStatus,
  buildRoomContextMap,
  ROOM_ASSIGNMENT_SELECT,
  type AssignmentWithContext,
  type DerivedRoomStatus,
  type RoomBookingContext,
} from '@/lib/room-status'
import type { Tables } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type Room = Tables<'rooms'>
type RoomType = Pick<Tables<'room_types'>, 'id' | 'name'>

interface RoomWithType extends Room {
  room_types: RoomType | null
}

const STATUS_ORDER: DerivedRoomStatus[] = [
  'available',
  'arriving',
  'occupied',
  'cleaning',
  'repair',
]

const STATUS_LABEL: Record<DerivedRoomStatus, string> = {
  available: 'Available',
  arriving: 'Arriving',
  occupied: 'Occupied',
  cleaning: 'Cleaning',
  repair: 'Repair',
}

function getRoomTypeName(name: unknown): string {
  if (!name) return 'Unknown'
  if (typeof name === 'string') return name
  const n = name as Record<string, string>
  return n.en ?? Object.values(n)[0] ?? 'Unknown'
}

async function fetchRoomsWithTypes(): Promise<RoomWithType[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*, room_types(id, name)')
    .is('deleted_at', null)
    .order('room_number')

  if (error) throw error
  return (data ?? []) as RoomWithType[]
}

// Active room assignments — so occupancy reflects the checked-in guest, not the
// (possibly drifted) physical rooms.status. Also carries booking/guest context.
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

/** Compact, interactive room status mini-grid for the dashboard. */
export function RoomStatusMiniGridCard() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [filter, setFilter] = useState<DerivedRoomStatus | null>(null)

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms-mini-grid'],
    queryFn: fetchRoomsWithTypes,
    staleTime: 30_000,
  })

  const { data: assignments = [] } = useQuery({
    queryKey: ['rooms-mini-grid-assignments'],
    queryFn: fetchRoomAssignments,
    staleTime: 30_000,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['rooms-mini-grid'] })
    queryClient.invalidateQueries({ queryKey: ['rooms-mini-grid-assignments'] })
  }

  // Quick status change (available ⇄ cleaning, clear repair). The DB trigger
  // guard_room_status_occupied blocks invalid changes (e.g. occupied → available).
  const setRoomStatus = useMutation({
    mutationFn: async ({
      roomId,
      status,
    }: {
      roomId: string
      status: 'available' | 'cleaning'
    }) => {
      const { error } = await supabase
        .from('rooms')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', roomId)
        .is('deleted_at', null)
      if (error) throw error
    },
    onSuccess: refresh,
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Could not update room'),
  })

  // Supabase Realtime: refresh on room, booking, or assignment changes.
  useEffect(() => {
    const onChange = () => refresh()
    const channel = supabase
      .channel('rooms-mini-grid-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_rooms' }, onChange)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, queryClient])

  if (isLoading) {
    return (
      <Card className="rounded-xl border-hairline border-border bg-surface-1 p-4">
        <CardContent className="p-0">
          <Skeleton className="mb-3 h-4 w-24 bg-surface-2" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-10 bg-surface-2" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (rooms.length === 0) {
    return (
      <Card className="rounded-xl border-hairline border-border bg-surface-1 p-4">
        <CardContent className="p-0">
          <p className="text-body font-medium text-text-primary">Room status</p>
          <p className="mt-1 text-small text-text-tertiary">
            No rooms configured.{' '}
            <Link href="/admin/rooms" className="text-accent-500 hover:underline">
              Add rooms
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  const todayIST = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  })
  const contextMap = buildRoomContextMap(assignments, todayIST)

  // deriveRoomStatus reads room_id + bookings.status/check_in — our richer rows
  // are structurally compatible, so cast for the call.
  const derivedAssignments = assignments as unknown as Parameters<
    typeof deriveRoomStatus
  >[1]

  const roomsWithStatus = rooms.map((room) => ({
    room,
    status: deriveRoomStatus(room, derivedAssignments),
    typeName: getRoomTypeName(room.room_types?.name),
    context: contextMap.get(room.id) ?? null,
  }))

  // Count by status.
  const counts = STATUS_ORDER.reduce<Partial<Record<DerivedRoomStatus, number>>>(
    (acc, s) => {
      const c = roomsWithStatus.filter((r) => r.status === s).length
      if (c > 0) acc[s] = c
      return acc
    },
    {}
  )

  const subtitleParts = STATUS_ORDER.filter((s) => counts[s]).map(
    (s) => `${counts[s]} ${STATUS_LABEL[s].toLowerCase()}`
  )

  // Group by room type.
  const typeGroups = new Map<string, typeof roomsWithStatus>()
  for (const item of roomsWithStatus) {
    const key = item.room.room_type_id
    if (!typeGroups.has(key)) typeGroups.set(key, [])
    typeGroups.get(key)!.push(item)
  }

  return (
    <Card className="rounded-xl border-hairline border-border bg-surface-1 gap-0 py-0">
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-body font-medium text-text-primary">Room status</p>
            <p className="text-small text-text-tertiary">
              {subtitleParts.join(' · ')}
            </p>
          </div>
          <Link
            href="/admin/rooms"
            className="shrink-0 text-small text-accent-500 hover:underline"
          >
            View all →
          </Link>
        </div>

        {/* Grouped mini-grid */}
        <div className="space-y-3">
          {Array.from(typeGroups.entries()).map(([, items]) => {
            const typeName = items[0].typeName
            return (
              <div key={items[0].room.room_type_id}>
                <p className="mb-1.5 text-micro font-medium uppercase text-text-tertiary">
                  {typeName}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map(({ room, status, typeName: tn, context }) => (
                    <RoomSquare
                      key={room.id}
                      room={room}
                      status={status}
                      typeName={tn}
                      context={context}
                      dimmed={filter !== null && filter !== status}
                      pending={setRoomStatus.isPending}
                      onSetStatus={(s) =>
                        setRoomStatus.mutate({ roomId: room.id, status: s })
                      }
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend — clickable filters */}
        <Separator className="mt-3 mb-3" />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_ORDER.filter((s) => counts[s]).map((s) => {
            const active = filter === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(active ? null : s)}
                aria-pressed={active}
                className={[
                  'flex items-center gap-1 rounded-full border px-2 py-0.5 transition-colors',
                  active
                    ? 'border-border-emphasis bg-surface-2'
                    : 'border-transparent hover:bg-surface-2',
                ].join(' ')}
                title={`Show ${STATUS_LABEL[s]} rooms`}
              >
                <span
                  className={`h-2 w-2 rounded-sm bg-room-${s}-bg border border-room-${s}-border`}
                />
                <span className="text-micro text-text-secondary">
                  {STATUS_LABEL[s]}
                </span>
                <span className="text-micro font-medium text-text-tertiary">
                  {counts[s]}
                </span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function RoomSquare({
  room,
  status,
  typeName,
  context,
  dimmed,
  pending,
  onSetStatus,
}: {
  room: Room
  status: DerivedRoomStatus
  typeName: string
  context: RoomBookingContext | null
  dimmed: boolean
  pending: boolean
  onSetStatus: (status: 'available' | 'cleaning') => void
}) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        title={`${room.room_number} — ${STATUS_LABEL[status]}`}
        className={[
          'flex h-10 w-10 min-w-[40px] items-center justify-center rounded border text-micro font-semibold transition-all',
          `bg-room-${status}-bg text-room-${status}-text border-room-${status}-border`,
          'hover:scale-105 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
          dimmed ? 'opacity-25 saturate-50' : 'opacity-100',
        ].join(' ')}
      >
        {room.room_number}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-body font-semibold text-text-primary">
              Room {room.room_number}
            </p>
            <p className="truncate text-micro text-text-tertiary">{typeName}</p>
          </div>
          <span
            className={[
              'shrink-0 rounded-full border px-2 py-0.5 text-micro font-medium',
              `bg-room-${status}-bg text-room-${status}-text border-room-${status}-border`,
            ].join(' ')}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>

        {/* Context */}
        <div className="mt-2.5 space-y-1.5 text-small">
          {context ? (
            <div className="flex items-center gap-1.5 text-text-secondary">
              <IconUser size={14} className="shrink-0 text-text-tertiary" />
              <span className="truncate">{context.guestName}</span>
            </div>
          ) : (
            <p className="text-text-tertiary">
              {status === 'cleaning'
                ? 'Awaiting housekeeping.'
                : status === 'repair'
                  ? 'Under maintenance.'
                  : 'No guest assigned.'}
            </p>
          )}

          {context && (
            <Link
              href={`/admin/bookings/${context.bookingId}`}
              className="inline-flex items-center gap-1 text-accent-500 hover:underline"
            >
              {context.bookingRef}
              <IconArrowRight size={13} />
            </Link>
          )}
        </div>

        {/* Quick actions */}
        <div className="mt-3 flex flex-wrap gap-1.5 border-t-hairline border-border pt-2.5">
          {status === 'cleaning' || status === 'repair' ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => onSetStatus('available')}
              className="inline-flex items-center gap-1 rounded-md border-hairline border-border bg-surface-1 px-2 py-1 text-micro font-medium text-text-secondary hover:bg-surface-2 disabled:opacity-50"
            >
              <IconCircleCheck size={13} /> Mark available
            </button>
          ) : null}

          {status === 'available' ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => onSetStatus('cleaning')}
              className="inline-flex items-center gap-1 rounded-md border-hairline border-border bg-surface-1 px-2 py-1 text-micro font-medium text-text-secondary hover:bg-surface-2 disabled:opacity-50"
            >
              <IconBrush size={13} /> Mark cleaning
            </button>
          ) : null}

          {status === 'occupied' ? (
            <p className="text-micro text-text-tertiary">
              Check out the guest to free this room.
            </p>
          ) : null}

          <Link
            href="/admin/rooms"
            className="ml-auto inline-flex items-center gap-1 text-micro text-accent-500 hover:underline"
          >
            Rooms <IconArrowRight size={12} />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
