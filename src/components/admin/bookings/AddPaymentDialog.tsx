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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAddPayment } from '@/hooks/use-bookings'

type PaymentMethod = 'upi' | 'cash' | 'card' | 'bank'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank', label: 'Bank Transfer' },
]

interface AddPaymentDialogProps {
  bookingId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddPaymentDialog({ bookingId, open, onOpenChange }: AddPaymentDialogProps) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [referenceNote, setReferenceNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { mutate: addPayment, isPending } = useAddPayment()

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    const parsedAmount = parseFloat(amount)
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Amount must be greater than zero'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit() {
    if (!validate()) return

    addPayment(
      {
        bookingId,
        amount: parseFloat(amount),
        method,
        reference_note: referenceNote.trim() || undefined,
        status: 'success',
      },
      {
        onSuccess: () => {
          toast.success('Payment recorded successfully')
          handleClose()
        },
        onError: (err) => {
          toast.error(err.message ?? 'Could not record payment')
        },
      }
    )
  }

  function handleClose() {
    setAmount('')
    setMethod('cash')
    setReferenceNote('')
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-amount">Amount (₹)</Label>
            <Input
              id="payment-amount"
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
            <Label>Payment Method</Label>
            <Select
              value={method}
              onValueChange={(val) => setMethod(val as PaymentMethod)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-ref">
              Reference Note{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="payment-ref"
              placeholder={
                method === 'upi'
                  ? 'UTR number…'
                  : method === 'card'
                  ? 'Last 4 digits…'
                  : 'Reference…'
              }
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              className="min-h-[60px] resize-none"
            />
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Recording…' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
