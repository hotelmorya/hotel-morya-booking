'use client'

import { IconCheck, IconPencil, IconX } from '@tabler/icons-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateBaseRate } from '@/lib/actions/rates'
import type { Tables } from '@/types/database'

type RoomType = Tables<'room_types'>

function parseName(raw: unknown): string {
  if (!raw) return 'Unnamed'
  if (typeof raw === 'string') return raw
  const r = raw as Record<string, string>
  return r.en ?? 'Unnamed'
}

interface BaseRateRowProps {
  roomType: RoomType
}

function BaseRateRow({ roomType }: BaseRateRowProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(roomType.base_rate))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) {
      setError('Enter a valid rate')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await updateBaseRate(roomType.id, num)
      if (result.success) {
        setEditing(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        setError(result.error)
      }
    })
  }

  function handleCancel() {
    setValue(String(roomType.base_rate))
    setEditing(false)
    setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-body font-medium text-text-primary truncate">
          {parseName(roomType.name)}
        </p>
        <p className="text-small text-text-tertiary">
          Max {roomType.max_guests} guests
          {!roomType.is_active && ' · Inactive'}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-body text-text-tertiary">
                ₹
              </span>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                min={0}
                step={1}
                autoFocus
                className="h-9 w-28 border-accent-500 pl-6 pr-3 text-tabular"
              />
            </div>
            <Button
              type="button"
              size="icon"
              onClick={handleSave}
              disabled={isPending}
              className="bg-accent-500 hover:bg-accent-700"
              title="Save"
            >
              <IconCheck size={16} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCancel}
              title="Cancel"
            >
              <IconX size={16} />
            </Button>
          </>
        ) : (
          <>
            <span className="text-body text-tabular text-text-primary">
              ₹{Number(roomType.base_rate).toLocaleString('en-IN')}
            </span>
            {saved && (
              <span className="inline-flex items-center gap-1 text-small text-success">
                <IconCheck size={13} />
                Saved
              </span>
            )}
            {error && (
              <span className="text-small text-danger">{error}</span>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setEditing(true)}
              title="Edit base rate"
            >
              <IconPencil size={14} />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

interface BaseRatesSectionProps {
  roomTypes: RoomType[]
}

export function BaseRatesSection({ roomTypes }: BaseRatesSectionProps) {
  if (roomTypes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded border border-border bg-surface-1 py-10 text-center">
        <p className="text-body text-text-secondary">No room types found.</p>
        <Link
          href="/admin/room-types/new"
          className="text-body text-accent-500 hover:underline"
        >
          Add a room type first
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded border border-border bg-surface-1 overflow-hidden">
      <div className="px-4 py-2.5 bg-surface-1 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Room type
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Base rate / night
          </span>
        </div>
      </div>
      <div className="divide-y divide-border px-4">
        {roomTypes.map((rt) => (
          <BaseRateRow key={rt.id} roomType={rt} />
        ))}
      </div>
    </div>
  )
}
