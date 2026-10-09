'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useReassignRoom } from '@/hooks/use-bookings'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ReassignRoomDialogProps {
  bookingId: string
  updatedAt: string
  bookingRoomId: string
  roomTypeId: string
  roomTypeName: string
  currentRoomId: string
  currentRoomNumber: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Free rooms of the same type, excluding the room the guest is currently in.
function useSameTypeRooms(roomTypeId: string, excludeId: string, enabled: boolean) {
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
      return (data ?? []).filter((r) => r.id !== excludeId)
    },
  })
}

export function ReassignRoomDialog({
  bookingId,
  updatedAt,
  bookingRoomId,
  roomTypeId,
  roomTypeName,
  currentRoomId,
  currentRoomNumber,
  open,
  onOpenChange,
}: ReassignRoomDialogProps) {
  const [newRoomId, setNewRoomId] = useState('')
  const [disposition, setDisposition] = useState<'cleaning' | 'maintenance'>('cleaning')
  const { data: rooms = [], isLoading } = useSameTypeRooms(roomTypeId, currentRoomId, open)
  const { mutate: reassign, isPending } = useReassignRoom()

  function handleConfirm() {
    if (!newRoomId) {
      toast.error('Pick a room to move the guest to')
      return
    }
    reassign(
      {
        bookingId,
        bookingRoomId,
        new_room_id: newRoomId,
        old_room_disposition: disposition,
        updated_at: updatedAt,
      },
      {
        onSuccess: () => {
          toast.success('Room changed')
          onOpenChange(false)
        },
        onError: (err) => toast.error(err.message ?? 'Could not change room'),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change room</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Moving {roomTypeName} guest out of <strong>Room {currentRoomNumber}</strong>.
          </p>

          {/* New room (same type) */}
          <div className="flex flex-col gap-1.5">
            <Label>Move to</Label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading available rooms…</p>
            ) : rooms.length === 0 ? (
              <p className="text-sm text-destructive">
                No other available {roomTypeName} rooms. Free one first.
              </p>
            ) : (
              <Select
                items={Object.fromEntries(rooms.map((r) => [r.id, `Room ${r.room_number}`]))}
                value={newRoomId}
                onValueChange={(v) => v && setNewRoomId(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select room…" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Room {r.room_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* What happens to the vacated room */}
          <div className="flex flex-col gap-1.5">
            <Label>Room {currentRoomNumber} after the move</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['cleaning', 'Needs cleaning'],
                ['maintenance', 'Needs repair'],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDisposition(val)}
                  className={cn(
                    'rounded-md border px-2 py-2 text-sm font-medium transition-colors',
                    disposition === val
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-surface-1 text-muted-foreground hover:bg-surface-2'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleConfirm} disabled={isPending || rooms.length === 0}>
            {isPending ? 'Moving…' : 'Confirm move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
