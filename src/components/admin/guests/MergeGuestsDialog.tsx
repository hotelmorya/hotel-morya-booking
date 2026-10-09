'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, XIcon } from 'lucide-react'

import { useMergeGuests, useGuestSearch } from '@/hooks/use-guests'
import { useDebounce } from '@/hooks/use-debounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SelectedGuest {
  id: string
  fullname: string
  phone: string
}

interface MergeGuestsDialogProps {
  keepGuest: { id: string; fullname: string }
  open: boolean
  onOpenChange: (v: boolean) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MergeGuestsDialog({ keepGuest, open, onOpenChange }: MergeGuestsDialogProps) {
  const qc = useQueryClient()
  const { mutate: mergeGuests, isPending } = useMergeGuests()

  const [searchRaw, setSearchRaw] = useState('')
  const [selected, setSelected] = useState<SelectedGuest | null>(null)

  const debouncedSearch = useDebounce(searchRaw, 300)
  const { data: guestResults = [], isFetching } = useGuestSearch(debouncedSearch)

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleClose(v: boolean) {
    if (!v) {
      setSearchRaw('')
      setSelected(null)
    }
    onOpenChange(v)
  }

  function handleConfirm() {
    if (!selected) return
    mergeGuests(
      { keep_id: keepGuest.id, merge_id: selected.id },
      {
        onSuccess: () => {
          toast.success(`Merged ${selected.fullname} into ${keepGuest.fullname}`)
          qc.invalidateQueries({ queryKey: ['guests'] })
          handleClose(false)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Could not merge guests')
        },
      }
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const showResults = debouncedSearch.trim().length >= 2 && !selected
  // Filter self out from results
  const filteredResults = guestResults.filter((g) => g.id !== keepGuest.id)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge guest</DialogTitle>
          <DialogDescription>
            This will merge the selected guest into{' '}
            <span className="font-medium text-foreground">{keepGuest.fullname}</span>. Their
            bookings will be transferred and the merged guest will be permanently removed from
            the directory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {selected ? (
            /* Selected guest chip */
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{selected.fullname}</p>
                <p className="text-xs text-muted-foreground">{selected.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1 rounded-md hover:bg-accent transition-colors shrink-0"
                aria-label="Remove selection"
              >
                <XIcon className="size-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            /* Search input */
            <div className="relative">
              <Input
                placeholder="Search guest by name or phone…"
                value={searchRaw}
                onChange={(e) => setSearchRaw(e.target.value)}
                autoFocus
              />
              {isFetching && (
                <Loader2 className="size-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
          )}

          {/* Search results */}
          {showResults && (
            <div className="rounded-lg border bg-popover overflow-hidden shadow-sm">
              {filteredResults.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-3 text-center">
                  {isFetching ? 'Searching…' : 'No guests found'}
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  {filteredResults.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setSelected(g)
                        setSearchRaw('')
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b last:border-b-0"
                    >
                      <span className="text-sm font-medium text-foreground">{g.fullname}</span>
                      <span className="text-sm text-muted-foreground ml-2">{g.phone}</span>
                      {g.city && (
                        <span className="text-xs text-muted-foreground ml-1">· {g.city}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Merge direction summary */}
          {selected && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-200">
              <span className="font-medium">{selected.fullname}</span>
              {' '}will be merged into{' '}
              <span className="font-medium">{keepGuest.fullname}</span>.
              All their bookings will transfer and{' '}
              <span className="font-medium">{selected.fullname}&apos;s</span>{' '}
              record will be removed.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? 'Merging…' : 'Merge guests'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
