'use client'

import { toast } from 'sonner'
import { IconVacuumCleaner, IconCheck, IconClock } from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useHousekeepingQueue,
  useStartCleaning,
  useDoneCleaning,
  type HkRoom,
  type HkLock,
  type HkCompleted,
} from '@/hooks/use-housekeeping'
import { formatRelativeIST } from '@/lib/format'
import { ReportIssueFab } from '@/components/hk/ReportIssueFab'

function countdownMinutes(autoReleaseAt: string): number {
  const remaining = new Date(autoReleaseAt).getTime() - Date.now()
  return Math.max(0, Math.floor(remaining / 60_000))
}

// Static room status class strings — Tailwind v4 requires full literal class names.
// Template literals like `bg-room-${status}-bg` are safelisted via @source inline()
// in globals.css but these component-level constants must also be static strings.
const CLEANING_STATUS_CLASSES =
  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-room-cleaning-bg text-room-cleaning-text border border-room-cleaning-border'

export function HousekeepingClient() {
  const { data, isLoading, error } = useHousekeepingQueue()
  const startMutation = useStartCleaning()
  const doneMutation = useDoneCleaning()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-surface-1 p-6 text-center">
        <p className="text-body text-danger">
          Could not load cleaning queue. Pull to refresh.
        </p>
      </div>
    )
  }

  const queue: HkRoom[] = data?.data?.queue ?? []
  const myLocks: HkLock[] = data?.data?.my_locks ?? []
  const completedToday: HkCompleted[] = data?.data?.completed_today ?? []

  // Rooms I have locked — filter them out of the pending queue
  const myLockRoomIds = new Set(myLocks.map((l) => l.room_id))
  const pendingQueue = queue.filter((r) => !myLockRoomIds.has(r.id))

  // All rooms visible in this session (queue + rooms I'm currently cleaning)
  const lockedRooms = myLocks.map((l) => l.rooms).filter((r): r is HkRoom => r !== null)
  const allRooms: HkRoom[] = [...queue, ...lockedRooms]

  async function handleStart(roomId: string, roomNumber: string) {
    try {
      await startMutation.mutateAsync({ room_id: roomId })
      toast.success(`Started cleaning room ${roomNumber}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not start cleaning')
    }
  }

  async function handleDone(roomId: string, roomNumber: string) {
    try {
      await doneMutation.mutateAsync({ room_id: roomId })
      toast.success(`Room ${roomNumber} marked available`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not complete cleaning')
    }
  }

  return (
    <>
      {/* ── Section 1: Needs cleaning ─────────────────────────── */}
      <Card className="rounded-xl border border-border bg-surface-1">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-2">
            <IconVacuumCleaner className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            <CardTitle className="text-body font-medium text-text-primary flex items-center gap-2">
              Needs cleaning
              {pendingQueue.length > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-medium text-white">
                  {pendingQueue.length}
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {pendingQueue.length === 0 ? (
            <p className="py-4 text-center text-small text-text-tertiary">
              All caught up
            </p>
          ) : (
            <ul className="space-y-2">
              {pendingQueue.map((room) => (
                <li
                  key={room.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-text-primary">
                      Room {room.room_number}
                      {room.floor != null && (
                        <span className="ml-1.5 text-small text-text-tertiary font-normal">
                          · Floor {room.floor}
                        </span>
                      )}
                    </p>
                    {room.updated_at && (
                      <p className="text-small text-text-tertiary">
                        Vacated {formatRelativeIST(room.updated_at)}
                      </p>
                    )}
                  </div>
                  <span className={CLEANING_STATUS_CLASSES}>Cleaning</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 min-w-[80px] shrink-0 border-border text-text-primary"
                    disabled={startMutation.isPending}
                    onClick={() => handleStart(room.id, room.room_number)}
                  >
                    Start
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: In progress (mine) ─────────────────────── */}
      <Card className="rounded-xl border border-border bg-surface-1">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-2">
            <IconClock className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            <CardTitle className="text-body font-medium text-text-primary">
              In progress (mine)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {myLocks.length === 0 ? (
            <p className="py-4 text-center text-small text-text-tertiary">
              Nothing in progress
            </p>
          ) : (
            <ul className="space-y-2">
              {myLocks.map((lock) => {
                const room = lock.rooms
                if (!room) return null
                const mins = countdownMinutes(lock.auto_release_at)
                return (
                  <li
                    key={lock.room_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium text-text-primary">
                        Room {room.room_number}
                        {room.floor != null && (
                          <span className="ml-1.5 text-small text-text-tertiary font-normal">
                            · Floor {room.floor}
                          </span>
                        )}
                      </p>
                      <p className="text-small text-text-tertiary flex items-center gap-1">
                        <IconClock className="h-3 w-3" aria-hidden="true" />
                        {mins}m before auto-release
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="h-11 min-w-[80px] shrink-0 bg-accent-500 hover:bg-accent-700 text-white"
                      disabled={doneMutation.isPending}
                      onClick={() => handleDone(lock.room_id, room.room_number)}
                    >
                      <IconCheck className="h-4 w-4 mr-1" aria-hidden="true" />
                      Done
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Section 3: Today's completed ─────────────────────── */}
      <Card className="rounded-xl border border-border bg-surface-1">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-2">
            <IconCheck className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            <CardTitle className="text-body font-medium text-text-primary">
              Today&apos;s completed
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {completedToday.length === 0 ? (
            <p className="py-4 text-center text-small text-text-tertiary">
              No rooms cleaned yet today
            </p>
          ) : (
            <ul className="space-y-2">
              {completedToday.map((item) => (
                <li
                  key={item.entity_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 p-3"
                >
                  <p className="text-body font-medium text-text-primary">
                    Room {item.metadata?.room_number ?? '—'}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-small text-text-tertiary">
                      {formatRelativeIST(item.created_at)}
                    </p>
                    <IconCheck className="h-4 w-4 text-accent-500" aria-hidden="true" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Report Issue FAB ──────────────────────────────────── */}
      <ReportIssueFab availableRooms={allRooms} />
    </>
  )
}
