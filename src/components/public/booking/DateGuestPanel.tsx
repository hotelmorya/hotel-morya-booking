'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { currentDateIST } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  checkIn: string
  checkOut: string
  guests: number
  isLoading: boolean
  onSearch: (checkIn: string, checkOut: string, guests: number) => void
}

export function DateGuestPanel({ checkIn, checkOut, guests, isLoading, onSearch }: Props) {
  const t = useTranslations('booking')
  const [localCheckIn, setLocalCheckIn] = useState(checkIn)
  const [localCheckOut, setLocalCheckOut] = useState(checkOut)
  const [localGuests, setLocalGuests] = useState(guests)
  const [error, setError] = useState<string | null>(null)

  const today = currentDateIST()

  function handleSearch() {
    setError(null)
    if (!localCheckIn || !localCheckOut) {
      setError('Please select check-in and check-out dates.')
      return
    }
    if (localCheckOut <= localCheckIn) {
      setError('Check-out must be after check-in.')
      return
    }
    onSearch(localCheckIn, localCheckOut, localGuests)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Check-in */}
        <div className="space-y-1.5">
          <Label htmlFor="check-in" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('checkIn')}
          </Label>
          <Input
            id="check-in"
            type="date"
            min={today}
            value={localCheckIn}
            onChange={(e) => {
              setLocalCheckIn(e.target.value)
              if (localCheckOut && e.target.value >= localCheckOut) {
                setLocalCheckOut('')
              }
              setError(null)
            }}
            className="h-11 w-full border-border bg-background text-foreground text-sm font-medium"
          />
        </div>

        {/* Check-out */}
        <div className="space-y-1.5">
          <Label htmlFor="check-out" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('checkOut')}
          </Label>
          <Input
            id="check-out"
            type="date"
            min={localCheckIn || today}
            value={localCheckOut}
            onChange={(e) => {
              setLocalCheckOut(e.target.value)
              setError(null)
            }}
            className="h-11 w-full border-border bg-background text-foreground text-sm font-medium"
          />
        </div>
      </div>

      {/* Guests stepper */}
      <div className="mt-4 space-y-1.5">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('guests')}
        </Label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Decrease guests"
            onClick={() => setLocalGuests((g) => Math.max(1, g - 1))}
            className={cn(
              'flex size-10 items-center justify-center rounded-xl border border-border bg-muted/50 text-lg font-bold text-foreground transition hover:bg-muted',
              localGuests <= 1 && 'cursor-not-allowed opacity-40 hover:bg-muted/50',
            )}
            disabled={localGuests <= 1}
          >
            −
          </button>
          <span className="min-w-[2ch] text-center text-lg font-bold tabular-nums text-foreground">
            {localGuests}
          </span>
          <button
            type="button"
            aria-label="Increase guests"
            onClick={() => setLocalGuests((g) => Math.min(50, g + 1))}
            className={cn(
              'flex size-10 items-center justify-center rounded-xl border border-border bg-muted/50 text-lg font-bold text-foreground transition hover:bg-muted',
              localGuests >= 50 && 'cursor-not-allowed opacity-40 hover:bg-muted/50',
            )}
            disabled={localGuests >= 50}
          >
            +
          </button>
          <span className="text-xs font-semibold text-muted-foreground">
            {localGuests === 1 ? t('guestSingle') : t('guestPlural', { count: localGuests })}
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs font-semibold text-destructive">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSearch}
        disabled={isLoading}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-amber-400 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-md transition-all hover:bg-amber-300 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? t('searching') : t('searchRooms')}
      </button>
    </div>
  )
}
