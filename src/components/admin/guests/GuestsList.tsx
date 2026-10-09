'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PlusIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
} from 'lucide-react'

import { useGuests } from '@/hooks/use-guests'
import type { GuestRow } from '@/hooks/use-guests'
import { GuestDrawer } from '@/components/admin/guests/GuestDrawer'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatRelativeIST } from '@/lib/format'
import { useDebounce } from '@/hooks/use-debounce'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(val: number | string | undefined | null): number {
  if (val == null) return 0
  const n = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(n) ? 0 : n
}

const ID_TYPE_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar',
  pan: 'PAN',
  passport: 'Passport',
  driving_license: 'Driving License',
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  )
}

function CardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} size="sm">
          <CardContent className="pt-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-24 mb-3" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({
  hasFilters,
  onAdd,
}: {
  hasFilters: boolean
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-surface-1 mb-4">
        <InboxIcon className="size-7 text-text-tertiary" />
      </div>
      {hasFilters ? (
        <>
          <p className="text-text-primary font-medium mb-1">No guests match</p>
          <p className="text-text-secondary text-small">Try adjusting your search query.</p>
        </>
      ) : (
        <>
          <p className="text-text-primary font-medium mb-1">No guests yet</p>
          <p className="text-text-secondary text-small mb-4">
            Add a guest manually or they&apos;ll appear after a booking is created.
          </p>
          <Button size="sm" onClick={onAdd}>
            <PlusIcon className="size-4" />
            Add guest
          </Button>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (p: number) => void
}) {
  const start = Math.min((page - 1) * pageSize + 1, total)
  const end = Math.min(page * pageSize, total)
  const totalPages = Math.ceil(total / pageSize)

  if (total === 0) return null

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-2 text-small text-text-secondary">
      <span>
        {start}–{end} of {total.toLocaleString('en-IN')}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </Button>
        <span className="px-2 text-text-primary font-medium tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tag chip — custom accent pill (not status pill)
// ---------------------------------------------------------------------------

function TagChip({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full bg-accent-50 text-accent-500 text-label px-2 py-0.5 dark:bg-accent-500/15 dark:text-accent-100">
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Desktop table row
// ---------------------------------------------------------------------------

function GuestTableRow({ guest, onClick }: { guest: GuestRow; onClick: () => void }) {
  const tags = guest.tags ?? []
  return (
    <TableRow
      className="cursor-pointer hover:bg-surface-2 transition-colors"
      onClick={onClick}
    >
      {/* Name + phone + tags */}
      <TableCell>
        <p className="font-medium text-text-primary leading-snug">{guest.fullname}</p>
        <p className="text-small text-text-secondary">{guest.phone}</p>
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {tags.slice(0, 3).map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
            {tags.length > 3 && (
              <span className="text-label text-text-tertiary">+{tags.length - 3}</span>
            )}
          </div>
        )}
      </TableCell>

      {/* City */}
      <TableCell>
        <span className="text-small text-text-secondary">{guest.city ?? '—'}</span>
      </TableCell>

      {/* ID — type + on-file ✓ (never the number) */}
      <TableCell>
        {guest.id_type ? (
          <span className="text-small text-text-secondary">
            {ID_TYPE_LABELS[guest.id_type] ?? guest.id_type}
            {guest.id_proof_url && (
              <span className="ml-1 text-emerald-600" title="ID image on file">
                ✓
              </span>
            )}
          </span>
        ) : (
          <span className="text-small text-text-tertiary">—</span>
        )}
      </TableCell>

      {/* Stays */}
      <TableCell className="text-right">
        <span className="text-small text-text-primary tabular-nums">
          {guest.total_stays ?? 0}
        </span>
      </TableCell>

      {/* Lifetime value */}
      <TableCell className="text-right">
        <span className="font-mono text-tabular text-text-primary">
          {formatCurrency(toNum(guest.lifetime_value))}
        </span>
      </TableCell>

      {/* Last stay */}
      <TableCell>
        <span className="text-small text-text-tertiary">
          {guest.last_stayed_at ? formatRelativeIST(guest.last_stayed_at) : 'Never'}
        </span>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Mobile card
// ---------------------------------------------------------------------------

function GuestCard({ guest, onClick }: { guest: GuestRow; onClick: () => void }) {
  const visibleTags = (guest.tags ?? []).slice(0, 2)

  return (
    <Card
      size="sm"
      className="cursor-pointer active:scale-[0.99] transition-transform hover:ring-border-emphasis"
      onClick={onClick}
    >
      <CardContent className="pt-3 pb-3 space-y-2">
        {/* Name + phone */}
        <div>
          <p className="font-medium text-text-primary leading-snug">{guest.fullname}</p>
          <p className="text-small text-text-secondary">{guest.phone}</p>
        </div>

        {/* City + ID + tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {guest.city && (
            <span className="text-small text-text-tertiary">{guest.city}</span>
          )}
          {guest.id_type && (
            <>
              {guest.city && <span className="text-text-tertiary">·</span>}
              <span className="text-small text-text-tertiary">
                {ID_TYPE_LABELS[guest.id_type] ?? guest.id_type}
                {guest.id_proof_url && (
                  <span className="ml-1 text-emerald-600" title="ID image on file">
                    ✓
                  </span>
                )}
              </span>
            </>
          )}
          {visibleTags.length > 0 && (guest.city || guest.id_type) && (
            <span className="text-text-tertiary">·</span>
          )}
          {visibleTags.map((tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </div>

        {/* Footer: stays + lifetime value */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div>
            <p className="text-label text-text-tertiary uppercase tracking-wide">Stays</p>
            <p className="text-text-primary font-medium tabular-nums">
              {guest.total_stays ?? 0}
            </p>
          </div>
          <div className="text-right">
            <p className="text-label text-text-tertiary uppercase tracking-wide">Lifetime</p>
            <p className="font-mono text-tabular text-text-primary font-medium">
              {formatCurrency(toNum(guest.lifetime_value))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GuestsList() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [searchRaw, setSearchRaw] = useState('')
  const search = useDebounce(searchRaw, 300)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchRaw(e.target.value)
    setPage(1)
  }, [])

  const { data, isLoading, isError, error } = useGuests({
    page,
    search: search || undefined,
  })

  const guests = (data?.data ?? []) as GuestRow[]
  const meta = data?.meta ?? { total: 0, page: 1, pageSize: 25 }
  const hasFilters = !!search

  const goToDetail = (id: string) => router.push(`/admin/guests/${id}`)

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------------------------------------------------------- */}
      {/* Top bar                                                           */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setDrawerOpen(true)}>
          <PlusIcon className="size-4" />
          Add guest
        </Button>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Search                                                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
          <Input
            type="search"
            placeholder="Search name, phone, city"
            value={searchRaw}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Error state                                                       */}
      {/* ---------------------------------------------------------------- */}
      {isError && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-small text-danger">
          {error instanceof Error ? error.message : 'Failed to load guests. Please try again.'}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Desktop table (lg+)                                              */}
      {/* ---------------------------------------------------------------- */}
      <div className="hidden lg:block">
        <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="text-text-tertiary text-label font-medium uppercase tracking-wide">
                  Name
                </TableHead>
                <TableHead className="text-text-tertiary text-label font-medium uppercase tracking-wide">
                  City
                </TableHead>
                <TableHead className="text-text-tertiary text-label font-medium uppercase tracking-wide">
                  ID
                </TableHead>
                <TableHead className="text-text-tertiary text-label font-medium uppercase tracking-wide text-right">
                  Stays
                </TableHead>
                <TableHead className="text-text-tertiary text-label font-medium uppercase tracking-wide text-right">
                  Lifetime Value
                </TableHead>
                <TableHead className="text-text-tertiary text-label font-medium uppercase tracking-wide">
                  Last Stay
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton />
              ) : guests.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <td colSpan={6}>
                    <EmptyState hasFilters={hasFilters} onAdd={() => setDrawerOpen(true)} />
                  </td>
                </TableRow>
              ) : (
                guests.map((g) => (
                  <GuestTableRow key={g.id} guest={g} onClick={() => goToDetail(g.id)} />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && guests.length > 0 && (
          <Pagination
            page={meta.page}
            pageSize={meta.pageSize}
            total={meta.total}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Mobile cards (<lg)                                               */}
      {/* ---------------------------------------------------------------- */}
      <div className="lg:hidden">
        {isLoading ? (
          <CardSkeleton />
        ) : guests.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onAdd={() => setDrawerOpen(true)} />
        ) : (
          <>
            <div className="space-y-3">
              {guests.map((g) => (
                <GuestCard key={g.id} guest={g} onClick={() => goToDetail(g.id)} />
              ))}
            </div>
            <div className="mt-4">
              <Pagination
                page={meta.page}
                pageSize={meta.pageSize}
                total={meta.total}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Add guest drawer                                                  */}
      {/* ---------------------------------------------------------------- */}
      <GuestDrawer open={drawerOpen} onClose={setDrawerOpen} />
    </div>
  )
}
