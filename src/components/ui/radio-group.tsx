"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { Radio } from "@base-ui/react/radio"

import { cn } from "@/lib/utils"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive>) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof Radio.Root>) {
  return (
    <Radio.Root
      data-slot="radio-group-item"
      className={cn(
        "flex aspect-square size-4 shrink-0 items-center justify-center rounded-full border border-input bg-transparent outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:border-amber-500",
        className
      )}
      {...props}
    >
      <Radio.Indicator className="size-2 rounded-full bg-amber-500" />
    </Radio.Root>
  )
}

// Clickable card-style option — label (+ optional description) wrapping the radio.
// Great for short, fixed choices that each need a one-line explanation.
function RadioCardOption({
  value,
  label,
  description,
  disabled,
  className,
}: {
  value: string
  label: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface-muted/50 has-[[data-checked]]:border-amber-500 has-[[data-checked]]:bg-amber-500/5 has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-60",
        className
      )}
    >
      <RadioGroupItem value={value} disabled={disabled} className="mt-0.5" />
      <div className="space-y-0.5">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        {description && <div className="text-xs text-text-secondary">{description}</div>}
      </div>
    </label>
  )
}

export { RadioGroup, RadioGroupItem, RadioCardOption }
