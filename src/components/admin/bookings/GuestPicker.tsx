'use client'

import { IconSearch, IconUserPlus, IconX } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { guestSchema, type GuestInput } from '@/schemas/guest'
import { useGuestSearch, useCreateGuest, type GuestLite } from '@/hooks/use-guests'

// z.input gives the form-level type (before coercion). Use this with useForm.
type GuestFormValues = z.input<typeof guestSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Repeat badge
// ─────────────────────────────────────────────────────────────────────────────

function RepeatBadge({ stays }: { stays: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
      Repeat guest · {stays} {stays === 1 ? 'stay' : 'stays'}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// New guest inline form
// ─────────────────────────────────────────────────────────────────────────────

function NewGuestForm({ onCreated }: { onCreated: (guest: GuestLite) => void }) {
  const form = useForm<GuestFormValues>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      fullname: '',
      phone: '',
      email: '',
      city: '',
      preferred_language: 'en',
      tags: [],
    },
  })

  const createGuest = useCreateGuest()

  function onSubmit(values: GuestFormValues) {
    createGuest.mutate(values as GuestInput, {
      onSuccess: (guest: GuestLite) => {
        toast.success('Guest added')
        form.reset()
        onCreated(guest)
      },
      onError: (err: Error) => {
        toast.error(err.message)
      },
    })
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-surface-2 p-4">
      <p className="mb-3 text-sm font-medium text-text-primary">New guest</p>
      <Form {...form}>
        {/* Not a <form> element — this panel is nested inside the booking page's
            outer form, and nested <form>s are invalid HTML. Submit via the
            button's onClick instead. */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="fullname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-text-secondary">
                    Full name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ramesh Patil" className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-text-secondary">
                    Phone <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      placeholder="9876543210"
                      maxLength={10}
                      className="h-8 text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-text-secondary">Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      type="email"
                      placeholder="ramesh@example.com"
                      className="h-8 text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-text-secondary">City</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="Kolhapur"
                      className="h-8 text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={createGuest.isPending}
              onClick={form.handleSubmit(onSubmit)}
              className="bg-accent-500 text-white hover:bg-accent-700"
            >
              {createGuest.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Add guest
            </Button>
          </div>
        </div>
      </Form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GuestPicker
// ─────────────────────────────────────────────────────────────────────────────

export type GuestPickerProps = {
  onSelect: (guestId: string) => void
  error?: string
}

export function GuestPicker({ onSelect, error }: GuestPickerProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedGuest, setSelectedGuest] = useState<GuestLite | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const { data: results = [], isFetching } = useGuestSearch(debouncedQuery)

  function selectGuest(guest: GuestLite) {
    setSelectedGuest(guest)
    setQuery('')
    setDebouncedQuery('')
    setShowNewForm(false)
    onSelect(guest.id)
  }

  function clearGuest() {
    setSelectedGuest(null)
    onSelect('')
  }

  // ── Selected chip ──────────────────────────────────────────────────────────
  if (selectedGuest) {
    return (
      <div
        className={[
          'flex items-start justify-between gap-3 rounded-lg border p-3',
          error
            ? 'border-destructive bg-destructive/5'
            : 'border-border bg-surface-2',
        ].join(' ')}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {selectedGuest.fullname}
            </span>
            {selectedGuest.total_stays != null && selectedGuest.total_stays > 0 && (
              <RepeatBadge stays={selectedGuest.total_stays} />
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            {selectedGuest.phone}
            {selectedGuest.city ? ` · ${selectedGuest.city}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={clearGuest}
          className="shrink-0 rounded p-0.5 text-text-tertiary hover:text-text-primary"
          aria-label="Remove guest"
        >
          <IconX size={15} />
        </button>
      </div>
    )
  }

  // ── Search + results ───────────────────────────────────────────────────────
  const showDropdown = debouncedQuery.length >= 2 && !showNewForm
  const hasResults = results.length > 0

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <IconSearch
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone…"
          className={[
            'h-8 w-full rounded-lg border bg-transparent py-1 pl-8 pr-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30',
            error ? 'border-destructive ring-3 ring-destructive/20' : 'border-input',
          ].join(' ')}
        />
        {isFetching && (
          <Loader2
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-text-tertiary"
          />
        )}
      </div>

      {/* Validation error */}
      {error && (
        <p className="text-[0.8rem] font-medium text-destructive">{error}</p>
      )}

      {/* Search results dropdown */}
      {showDropdown && (
        <div className="rounded-lg border border-border bg-background shadow-md">
          {!hasResults && !isFetching && (
            <p className="px-3 py-2.5 text-sm text-text-tertiary">No guests found.</p>
          )}
          {hasResults && (
            <ul className="divide-y divide-border">
              {results.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => selectGuest(g)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-xs font-medium text-accent-700 dark:bg-accent-500/20 dark:text-accent-100">
                      {g.fullname.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-text-primary">
                          {g.fullname}
                        </span>
                        {g.total_stays != null && g.total_stays > 0 && (
                          <RepeatBadge stays={g.total_stays} />
                        )}
                      </div>
                      <p className="text-xs text-text-tertiary">
                        {g.phone}
                        {g.city ? ` · ${g.city}` : ''}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Add new guest toggle */}
      {!showNewForm && (
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          className="inline-flex items-center gap-1.5 text-sm text-accent-500 hover:text-accent-700"
        >
          <IconUserPlus size={14} />
          Add new guest
        </button>
      )}

      {/* New guest inline form */}
      {showNewForm && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Or add a new guest</span>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="text-xs text-text-tertiary hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
          <NewGuestForm onCreated={selectGuest} />
        </>
      )}
    </div>
  )
}
