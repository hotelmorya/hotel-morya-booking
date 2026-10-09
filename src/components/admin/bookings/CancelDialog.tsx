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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useBookingAction } from '@/hooks/use-bookings'

interface CancelDialogProps {
  bookingId: string
  updatedAt: string
  bookingRef: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CancelDialog({
  bookingId,
  updatedAt,
  bookingRef,
  open,
  onOpenChange,
}: CancelDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const { mutate: bookingAction, isPending } = useBookingAction()

  function handleConfirm() {
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please provide a cancellation reason (at least 3 characters)')
      return
    }

    bookingAction(
      {
        id: bookingId,
        updated_at: updatedAt,
        action: 'cancel',
        cancellation_reason: reason.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Booking cancelled')
          handleClose()
        },
        onError: (err) => {
          toast.error(err.message ?? 'Could not cancel booking')
        },
      }
    )
  }

  function handleClose() {
    setReason('')
    setError('')
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Booking {bookingRef}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel the booking. The record is kept for audit purposes (soft cancel).
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cancel-reason">
            Cancellation Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="cancel-reason"
            placeholder="e.g. Guest request, no payment received…"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (error) setError('')
            }}
            aria-invalid={!!error || undefined}
            className="min-h-[80px] resize-none"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Keep Booking</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Cancelling…' : 'Cancel Booking'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
