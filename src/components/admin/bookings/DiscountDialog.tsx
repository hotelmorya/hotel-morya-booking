'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useBookingAction } from '@/hooks/use-bookings'

interface DiscountDialogProps {
  bookingId: string
  updatedAt: string
  currentDiscount?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DiscountDialog({
  bookingId,
  updatedAt,
  currentDiscount = 0,
  open,
  onOpenChange,
}: DiscountDialogProps) {
  const [amount, setAmount] = useState(currentDiscount > 0 ? String(currentDiscount) : '')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { mutate: bookingAction, isPending } = useBookingAction()

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    const parsedAmount = parseFloat(amount)

    if (amount && (isNaN(parsedAmount) || parsedAmount < 0)) {
      newErrors.amount = 'Discount must be zero or a positive amount'
    }

    if (parsedAmount > 0 && !reason.trim()) {
      newErrors.reason = 'Reason is required when applying a discount'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit() {
    if (!validate()) return

    const discountAmount = amount ? parseFloat(amount) : 0

    bookingAction(
      {
        id: bookingId,
        updated_at: updatedAt,
        action: 'discount',
        discount_amount: discountAmount,
        discount_reason: reason.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Discount applied')
          handleClose()
        },
        onError: (err) => {
          toast.error(err.message ?? 'Could not apply discount')
        },
      }
    )
  }

  function handleClose() {
    setAmount('')
    setReason('')
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply Discount / Comp</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discount-amount">Discount Amount (₹)</Label>
            <Input
              id="discount-amount"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }))
              }}
              aria-invalid={!!errors.amount || undefined}
              className="font-mono"
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discount-reason">
              Reason{' '}
              <span className="font-normal text-muted-foreground">
                (required for non-zero discount)
              </span>
            </Label>
            <Textarea
              id="discount-reason"
              placeholder="e.g. VIP guest, loyalty discount, complaint resolution…"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (errors.reason) setErrors((prev) => ({ ...prev, reason: '' }))
              }}
              aria-invalid={!!errors.reason || undefined}
              className="min-h-[80px] resize-none"
            />
            {errors.reason && (
              <p className="text-xs text-destructive">{errors.reason}</p>
            )}
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Applying…' : 'Apply Discount'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
