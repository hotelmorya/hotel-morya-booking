'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCheckOut } from '@/hooks/use-bookings'

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
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

interface CheckOutDialogProps {
  bookingId: string
  updatedAt: string
  bookingRef: string
  guestName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CheckOutDialog({
  bookingId,
  updatedAt,
  bookingRef,
  guestName,
  open,
  onOpenChange,
}: CheckOutDialogProps) {
  const { mutate: checkOut, isPending } = useCheckOut()

  // Optional actual check-out time (datetime-local, defaults to now)
  const [checkOutTime, setCheckOutTime] = useState<string>(nowDatetimeLocal)

  function handleConfirm() {
    checkOut(
      {
        id: bookingId,
        updated_at: updatedAt,
        actual_check_out: datetimeLocalToISO(checkOutTime),
      },
      {
        onSuccess: () => {
          toast.success('Guest checked out successfully')
          onOpenChange(false)
        },
        onError: (err) => {
          toast.error(err.message ?? 'Check-out failed')
        },
      }
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Check Out {guestName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will check out booking {bookingRef} and set the room(s) to cleaning status.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Optional actual check-out time */}
        <div className="flex flex-col gap-1.5 px-0 pb-1">
          <Label htmlFor="check-out-time" className="text-xs text-muted-foreground">
            Actual check-out time{' '}
            <span className="text-text-disabled">(defaults to now)</span>
          </Label>
          <Input
            id="check-out-time"
            type="datetime-local"
            value={checkOutTime}
            onChange={(e) => setCheckOutTime(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Checking out…' : 'Confirm Check-Out'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
