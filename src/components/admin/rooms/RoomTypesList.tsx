'use client'

import { IconBed, IconChevronRight, IconPlus } from '@tabler/icons-react'
import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatBeds } from '@/lib/format'
import type { Tables } from '@/types/database'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

type RoomType = Tables<'room_types'>

interface RoomTypeWithCount extends RoomType {
  roomCount: number
}

function getRoomTypeName(name: unknown): string {
  if (!name) return 'Untitled'
  if (typeof name === 'string') return name
  const n = name as Record<string, string>
  return n.en ?? Object.values(n)[0] ?? 'Untitled'
}

async function fetchRoomTypes(): Promise<RoomTypeWithCount[]> {
  const supabase = createClient()

  // Fetch room types
  const { data: types, error: typesErr } = await supabase
    .from('room_types')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order')
    .order('created_at')

  if (typesErr) throw typesErr
  if (!types || types.length === 0) return []

  // Count active rooms per type
  const { data: roomCounts, error: countsErr } = await supabase
    .from('rooms')
    .select('room_type_id')
    .is('deleted_at', null)
    .in(
      'room_type_id',
      types.map((t) => t.id)
    )

  if (countsErr) throw countsErr

  const countMap = new Map<string, number>()
  for (const r of roomCounts ?? []) {
    countMap.set(r.room_type_id, (countMap.get(r.room_type_id) ?? 0) + 1)
  }

  return types.map((t) => ({ ...t, roomCount: countMap.get(t.id) ?? 0 }))
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-8 w-8 bg-surface-2" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32 bg-surface-2" />
        <Skeleton className="h-3 w-20 bg-surface-2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full bg-surface-2" />
    </div>
  )
}

export function RoomTypesList() {
  const { data: roomTypes = [], isLoading, error } = useQuery({
    queryKey: ['room-types-list'],
    queryFn: fetchRoomTypes,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="divide-y-hairline divide-border rounded-xl border-hairline border-border bg-surface-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border-hairline border-border bg-danger/5 px-4 py-4 text-body text-danger">
        Failed to load room types. Please refresh.
      </div>
    )
  }

  if (roomTypes.length === 0) {
    return (
      <Card className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border-hairline border-border bg-surface-1 p-8 text-center">
        <CardContent className="flex flex-col items-center p-0">
          <IconBed size={40} className="text-text-disabled" stroke={1.5} />
          <p className="mt-3 text-body font-medium text-text-primary">
            No room types yet
          </p>
          <p className="mt-1 text-small text-text-secondary">
            Add your first room type to start taking bookings.
          </p>
          <Link
            href="/admin/room-types/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded bg-accent-500 px-4 py-2.5 text-body font-medium text-white hover:bg-accent-700"
          >
            <IconPlus size={16} />
            Create room type
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden rounded-xl border-hairline border-border bg-surface-1 sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-b-hairline border-border">
              <TableHead className="px-4 py-2.5 text-small font-medium text-text-tertiary">
                Name
              </TableHead>
              <TableHead className="px-4 py-2.5 text-right text-small font-medium text-text-tertiary">
                Base rate
              </TableHead>
              <TableHead className="px-4 py-2.5 text-center text-small font-medium text-text-tertiary">
                Max guests
              </TableHead>
              <TableHead className="px-4 py-2.5 text-center text-small font-medium text-text-tertiary">
                Beds
              </TableHead>
              <TableHead className="px-4 py-2.5 text-center text-small font-medium text-text-tertiary">
                Rooms
              </TableHead>
              <TableHead className="px-4 py-2.5 text-center text-small font-medium text-text-tertiary">
                Status
              </TableHead>
              <TableHead className="px-4 py-2.5 text-center text-small font-medium text-text-tertiary">
                Order
              </TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y-hairline divide-border">
            {roomTypes.map((rt) => (
              <TableRow
                key={rt.id}
                className="group cursor-pointer hover:bg-surface-2"
                onClick={() => {
                  window.location.href = `/admin/room-types/${rt.id}`
                }}
              >
                <TableCell className="px-4 py-3">
                  <span className="text-body font-medium text-text-primary">
                    {getRoomTypeName(rt.name)}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <span className="text-body text-tabular text-text-primary">
                    {formatCurrency(rt.base_rate)}
                  </span>
                  {rt.day_use_rate != null && (
                    <p className="mt-0.5 text-small text-tabular text-text-tertiary">
                      Day use {formatCurrency(rt.day_use_rate)}
                    </p>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-center">
                  <span className="text-body text-text-secondary">
                    {rt.max_guests}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-center">
                  <span className="text-body text-text-secondary">
                    {formatBeds(rt.number_of_beds, rt.bed_type) || '—'}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-center">
                  <span className="text-body text-text-secondary">
                    {rt.roomCount}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-center">
                  <span
                    className={[
                      'pill',
                      rt.is_active
                        ? 'bg-room-available-bg text-room-available-text border border-room-available-border'
                        : 'bg-surface-2 text-text-tertiary border border-border',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'pill-dot',
                        rt.is_active ? 'bg-room-available-text' : 'bg-text-disabled',
                      ].join(' ')}
                    />
                    {rt.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-center">
                  <span className="text-body text-tabular text-text-tertiary">
                    {rt.sort_order ?? 0}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <IconChevronRight
                    size={16}
                    className="text-text-disabled group-hover:text-text-tertiary"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="divide-y-hairline divide-border rounded-xl border-hairline border-border bg-surface-1 sm:hidden">
        {roomTypes.map((rt) => (
          <Link
            key={rt.id}
            href={`/admin/room-types/${rt.id}`}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2">
              <IconBed size={18} className="text-text-tertiary" stroke={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium text-text-primary">
                {getRoomTypeName(rt.name)}
              </p>
              <p className="text-small text-text-tertiary">
                {formatCurrency(rt.base_rate)} · {rt.max_guests} guests
                {formatBeds(rt.number_of_beds, rt.bed_type)
                  ? ` · ${formatBeds(rt.number_of_beds, rt.bed_type)}`
                  : ''}
                · {rt.roomCount} room{rt.roomCount !== 1 ? 's' : ''}
                {rt.day_use_rate != null
                  ? ` · Day use ${formatCurrency(rt.day_use_rate)}`
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={[
                  'pill',
                  rt.is_active
                    ? 'bg-room-available-bg text-room-available-text border border-room-available-border'
                    : 'bg-surface-2 text-text-tertiary border border-border',
                ].join(' ')}
              >
                {rt.is_active ? 'Active' : 'Inactive'}
              </span>
              <IconChevronRight size={16} className="text-text-disabled" />
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
