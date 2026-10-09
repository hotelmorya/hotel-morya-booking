'use client'

import { useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  PlusIcon,
  SearchIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  InboxIcon,
  XIcon,
} from 'lucide-react'

import { useBookings } from '@/hooks/use-bookings'
import { useTableSort } from '@/lib/use-table-sort'
import { BookingStatusPill } from '@/components/admin/bookings/BookingStatusPill'
import type { BookingStatus } from '@/components/admin/bookings/BookingStatusPill'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatStay, formatDateTimeIST, formatRelativeIST, currentDateIST } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BookingListItem = {
  id: string
  booking_ref: string
  check_in: string
  check_out: string
  nights: number
  stay_type: 'overnight' | 'day_use' | null
  status: BookingStatus
  source: string
  total_amount: number | string
  discount_amount: number | string
  gst_amount: number | string
  advance_paid: number | string
  balance_due: number | string
  created_at: string
  guests: {
    id: string
    fullname: string
    phone: string
    tags: string[] | null
  }
}

type SortKey = 'booked' | 'total' | 'checkin' | 'balance'

// ---------------------------------------------------------------------------
// Status chip options
// ---------------------------------------------------------------------------

const STATUS_CHIPS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'checked_out', label: 'Checked out' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'not_arrived', label: 'Not arrived' },
]

// ---------------------------------------------------------------------------
// Source label map
// ---------------------------------------------------------------------------

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  walkin: 'Walk-in',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
}

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source
}

// ---------------------------------------------------------------------------
// Date preset helpers
// ---------------------------------------------------------------------------

type DatePreset =
  | 'all'
  | 'arriving_today'
  | 'arriving_tomorrow'
  | 'departing_today'
  | 'next7'

const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All dates' },
  { value: 'arriving_today', label: 'Arriving today' },
  { value: 'arriving_tomorrow', label: 'Arriving tomorrow' },
  { value: 'departing_today', label: 'Departing today' },
  { value: 'next7', label: 'Next 7 days' },
]

// Trigger-label maps — Base UI's Select.Value renders the raw value, so we map
// it to a human label via a render function on <SelectValue>.
const DATE_PRESET_LABEL: Record<string, string> = Object.fromEntries(
  DATE_PRESET_OPTIONS.map((o) => [o.value, o.label])
)
const SOURCE_FILTER_LABEL: Record<string, string> = {
  all: 'All sources',
  ...SOURCE_LABELS,
}

/** Shift an IST "YYYY-MM-DD" by N days, returning "YYYY-MM-DD". */
function shiftDateIST(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

type DateRange = {
  checkInFrom?: string
  checkInTo?: string
  checkOutFrom?: string
  checkOutTo?: string
  // Effective-departure range — server matches overnight stays by check_out and
  // day-use stays by check_in (a day-use booking departs on its check_in day).
  departingFrom?: string
  departingTo?: string
}

function computePresetDates(preset: DatePreset): DateRange {
  if (preset === 'all') return {}
  const today = currentDateIST()
  switch (preset) {
    case 'arriving_today':
      return { checkInFrom: today, checkInTo: today }
    case 'arriving_tomorrow': {
      const t = shiftDateIST(today, 1)
      return { checkInFrom: t, checkInTo: t }
    }
    case 'departing_today':
      return { departingFrom: today, departingTo: today }
    case 'next7':
      return { checkInFrom: today, checkInTo: shiftDateIST(today, 7) }
  }
}

// Map dashboard / nav deep-link query params → the list's internal filter state.
// e.g. /admin/bookings?status=pending  ·  ?check_in=today  ·  ?balance=outstanding
function parseFiltersFromURL(sp: URLSearchParams): {
  status: string
  source: string
  datePreset: DatePreset
  balanceOutstanding: boolean
} {
  const status = sp.get('status') ?? ''
  const rawSource = sp.get('source') ?? ''
  const source = rawSource in SOURCE_LABELS ? rawSource : ''
  const balanceOutstanding = sp.get('balance') === 'outstanding'

  const checkIn = sp.get('check_in')
  const checkOut = sp.get('check_out')
  const arriving = sp.get('arriving')
  let datePreset: DatePreset = 'all'
  if (checkOut === 'today') datePreset = 'departing_today'
  else if (checkIn === 'tomorrow') datePreset = 'arriving_tomorrow'
  else if (checkIn === 'today' || arriving === 'today') datePreset = 'arriving_today'

  return { status, source, datePreset, balanceOutstanding }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(val: number | string | undefined | null): number {
  if (val === undefined || val === null) return 0
  const n = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(n) ? 0 : n
}

// Net payable = room total − discount + GST. Matches the booking's grand total
// (what the guest actually owes), not the gross pre-discount room subtotal.
function netTotal(b: BookingListItem): number {
  return toNum(b.total_amount) - toNum(b.discount_amount) + toNum(b.gst_amount)
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
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
            <div className="flex items-start justify-between gap-2 mb-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40 mb-1" />
            <Skeleton className="h-3 w-32 mb-3" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
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

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-surface-1 mb-4">
        <InboxIcon className="size-7 text-text-tertiary" />
      </div>
      {hasFilters ? (
        <>
          <p className="text-text-primary font-medium mb-1">No bookings match</p>
          <p className="text-text-secondary text-small">Try adjusting your filters or search query.</p>
        </>
      ) : (
        <>
          <p className="text-text-primary font-medium mb-1">No bookings yet</p>
          <p className="text-text-secondary text-small mb-4">Create a walk-in booking to get started.</p>
          <Link
            href="/admin/bookings/new"
            className={buttonVariants({ size: 'sm' })}
          >
            <PlusIcon className="size-4" />
            New booking
          </Link>
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
// Sortable table head button
// ---------------------------------------------------------------------------

function SortableHead({
  col,
  label,
  activeSortKey,
  sortDir,
  onSort,
  className,
}: {
  col: SortKey
  label: string
  activeSortKey: SortKey | null
  sortDir: 'asc' | 'desc'
  onSort: (col: SortKey) => void
  className?: string
}) {
  const isActive = activeSortKey === col
  return (
    <TableHead className={cn('text-text-tertiary text-label font-medium uppercase tracking-wide', className)}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-text-primary transition-colors',
          isActive ? 'text-text-primary' : 'text-text-tertiary'
        )}
      >
        {label}
        {isActive ? (
          sortDir === 'asc' ? (
            <ChevronUpIcon className="size-3.5" />
          ) : (
            <ChevronDownIcon className="size-3.5" />
          )
        ) : (
          <span className="size-3.5 opacity-0">
            <ChevronDownIcon className="size-3.5" />
          </span>
        )}
      </button>
    </TableHead>
  )
}

// ---------------------------------------------------------------------------
// Overdue helper — checked-in past checkout date
// ---------------------------------------------------------------------------

function isOverdueCheckout(booking: BookingListItem, today: string): boolean {
  return booking.status === 'checked_in' && booking.check_out < today
}

// ---------------------------------------------------------------------------
// Desktop table row
// ---------------------------------------------------------------------------

function BookingTableRow({ booking, today, onClick }: { booking: BookingListItem; today: string; onClick: () => void }) {
  const balance = toNum(booking.balance_due)
  const collectable = booking.status !== 'cancelled' && booking.status !== 'not_arrived'

  return (
    <TableRow
      className="cursor-pointer hover:bg-surface-2 transition-colors"
      onClick={onClick}
    >
      {/* Ref */}
      <TableCell>
        <span className="font-mono text-small font-medium text-text-primary">
          {booking.booking_ref}
        </span>
        {booking.source && (
          <p className="text-label text-text-tertiary mt-0.5">{sourceLabel(booking.source)}</p>
        )}
      </TableCell>

      {/* Guest */}
      <TableCell>
        <p className="font-medium text-text-primary leading-snug">{booking.guests?.fullname ?? '—'}</p>
        <p className="text-small text-text-secondary">{booking.guests?.phone ?? ''}</p>
        {(booking.guests?.tags?.length ?? 0) > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {booking.guests!.tags!.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-accent-50 text-accent-500 text-label px-2 py-0.5 dark:bg-accent-500/15 dark:text-accent-100"
              >
                {tag}
              </span>
            ))}
            {booking.guests!.tags!.length > 2 && (
              <span className="text-label text-text-tertiary">
                +{booking.guests!.tags!.length - 2}
              </span>
            )}
          </div>
        )}
      </TableCell>

      {/* Dates / Stay */}
      <TableCell>
        <div className="flex items-center gap-1.5 text-text-secondary">
          <CalendarIcon className="size-3.5 shrink-0" />
          <span className="text-small">{formatStay(booking)}</span>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <div className="flex items-center gap-1.5 flex-wrap">
          <BookingStatusPill status={booking.status} />
          {booking.stay_type === 'day_use' && (
            <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-label font-medium text-text-secondary bg-surface-1">
              Day use
            </span>
          )}
          {isOverdueCheckout(booking, today) && (
            <span className="inline-flex items-center rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-label font-semibold text-danger">
              Overdue
            </span>
          )}
        </div>
      </TableCell>

      {/* Total (net of discount — what the guest owes) */}
      <TableCell className="text-right">
        <span
          className="font-mono text-tabular text-text-primary"
          title={
            toNum(booking.discount_amount) > 0
              ? `Room ${formatCurrency(toNum(booking.total_amount))} − discount ${formatCurrency(toNum(booking.discount_amount))}`
              : undefined
          }
        >
          {formatCurrency(netTotal(booking))}
        </span>
      </TableCell>

      {/* Balance */}
      <TableCell className="text-right">
        {!collectable ? (
          <span className="font-mono text-tabular text-text-tertiary">—</span>
        ) : (
          <span
            className={cn(
              'font-mono text-tabular',
              balance > 0
                ? 'text-warning font-medium'
                : balance < 0
                  ? 'text-text-secondary'
                  : 'text-text-tertiary'
            )}
          >
            {balance > 0
              ? formatCurrency(balance)
              : balance < 0
                ? `Refund ${formatCurrency(Math.abs(balance))}`
                : '—'}
          </span>
        )}
      </TableCell>

      {/* Booked */}
      <TableCell>
        <div className="leading-tight">
          <span className="block text-small text-text-secondary">
            {formatDateTimeIST(booking.created_at)}
          </span>
          <span className="block text-label text-text-tertiary">
            {formatRelativeIST(booking.created_at)}
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Mobile card
// ---------------------------------------------------------------------------

function BookingCard({ booking, today, onClick }: { booking: BookingListItem; today: string; onClick: () => void }) {
  const balance = toNum(booking.balance_due)
  const collectable = booking.status !== 'cancelled' && booking.status !== 'not_arrived'

  return (
    <Card
      size="sm"
      className="cursor-pointer active:scale-[0.99] transition-transform hover:ring-border-emphasis"
      onClick={onClick}
    >
      <CardContent className="pt-3 pb-3 space-y-2">
        {/* Top row: ref + status + day-use badge */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-mono text-small font-medium text-text-secondary">
              {booking.booking_ref}
            </span>
            {booking.source && (
              <p className="text-label text-text-tertiary">{sourceLabel(booking.source)}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {booking.stay_type === 'day_use' && (
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-label font-medium text-text-secondary bg-surface-1">
                Day use
              </span>
            )}
            {isOverdueCheckout(booking, today) && (
              <span className="inline-flex items-center rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-label font-semibold text-danger">
                Overdue
              </span>
            )}
            <BookingStatusPill status={booking.status} />
          </div>
        </div>

        {/* Guest */}
        <div>
          <p className="font-medium text-text-primary leading-snug">{booking.guests?.fullname ?? '—'}</p>
          <p className="text-small text-text-secondary">{booking.guests?.phone ?? ''}</p>
          {(booking.guests?.tags?.length ?? 0) > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {booking.guests!.tags!.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-accent-50 text-accent-500 text-label px-2 py-0.5 dark:bg-accent-500/15 dark:text-accent-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stay */}
        <div className="flex items-center gap-1.5 text-small text-text-secondary">
          <CalendarIcon className="size-3.5 shrink-0" />
          <span>{formatStay(booking)}</span>
        </div>

        {/* Footer: total + balance */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-label text-text-tertiary uppercase tracking-wide">Total</p>
              <p className="font-mono text-tabular text-text-primary font-medium">
                {formatCurrency(netTotal(booking))}
              </p>
            </div>
            {collectable && balance > 0 && (
              <div>
                <p className="text-label text-text-tertiary uppercase tracking-wide">Due</p>
                <p className="font-mono text-tabular text-warning font-medium">
                  {formatCurrency(balance)}
                </p>
              </div>
            )}
            {collectable && balance < 0 && (
              <div>
                <p className="text-label text-text-tertiary uppercase tracking-wide">Refund</p>
                <p className="font-mono text-tabular text-text-secondary font-medium">
                  {formatCurrency(Math.abs(balance))}
                </p>
              </div>
            )}
          </div>
          <span className="text-small text-text-tertiary">
            {formatDateTimeIST(booking.created_at)} · {formatRelativeIST(booking.created_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BookingsList() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Seed filters from the URL so dashboard / nav deep-links land pre-filtered
  // (e.g. "Needs call" → ?status=pending, "Arrivals" → ?check_in=today).
  const initial = parseFiltersFromURL(
    new URLSearchParams(searchParams.toString())
  )

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState(initial.status)
  const [source, setSource] = useState(initial.source)
  const [datePreset, setDatePreset] = useState<DatePreset>(initial.datePreset)
  const [balanceOutstanding, setBalanceOutstanding] = useState(
    initial.balanceOutstanding
  )
  const [searchRaw, setSearchRaw] = useState('')
  const search = useDebounce(searchRaw, 300)

  // Filters are seeded from the URL above (lazy init). When the URL query changes
  // (e.g. tapping a different dashboard link), the page remounts this component via
  // a `key`, so the initializers re-read the new params — no effect needed.

  const { sortKey, sortDir, onSort } = useTableSort<SortKey>('booked', 'desc')

  // Reset to page 1 when filters/sort changes
  const handleStatusChip = useCallback((val: string) => {
    setStatus(val)
    setPage(1)
  }, [])

  const handleSourceChange = useCallback((val: string | null) => {
    setSource(!val || val === 'all' ? '' : val)
    setPage(1)
  }, [])

  const handleDatePreset = useCallback((val: string | null) => {
    setDatePreset((val as DatePreset) ?? 'all')
    setPage(1)
  }, [])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchRaw(e.target.value)
    setPage(1)
  }, [])

  const handleSort = useCallback(
    (col: SortKey) => {
      onSort(col)
      setPage(1)
    },
    [onSort]
  )

  const dateRange = computePresetDates(datePreset)

  const { data, isLoading, isError, error } = useBookings({
    page,
    status: status || undefined,
    search: search || undefined,
    source: source || undefined,
    checkInFrom: dateRange.checkInFrom,
    checkInTo: dateRange.checkInTo,
    checkOutFrom: dateRange.checkOutFrom,
    checkOutTo: dateRange.checkOutTo,
    departingFrom: dateRange.departingFrom,
    departingTo: dateRange.departingTo,
    balance: balanceOutstanding ? 'outstanding' : undefined,
    sort: sortKey ?? 'booked',
    dir: sortDir,
  })

  const bookings = (data?.data ?? []) as BookingListItem[]
  const meta = data?.meta ?? { total: 0, page: 1, pageSize: 25 }
  const counts = data?.meta?.counts ?? {}
  const hasFilters = !!(
    status ||
    search ||
    source ||
    balanceOutstanding ||
    datePreset !== 'all'
  )

  const today = currentDateIST()

  const goToDetail = (id: string) => router.push(`/admin/bookings/${id}`)

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------------------------------------------------------- */}
      {/* Top bar                                                           */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex items-center justify-end">
        <Link
          href="/admin/bookings/new"
          className={buttonVariants({ size: 'default' })}
        >
          <PlusIcon className="size-4" />
          New booking
        </Link>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Filters                                                           */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col gap-3">
        {/* Status chips row */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {STATUS_CHIPS.map((chip) => {
            const isActive = status === chip.value
            const chipCount = chip.value === '' ? (counts.all ?? 0) : (counts[chip.value] ?? 0)
            return (
              <button
                key={chip.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleStatusChip(chip.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-small font-medium transition-colors',
                  isActive
                    ? 'border-border-emphasis bg-surface-2 text-text-primary'
                    : 'border-transparent bg-surface-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                )}
              >
                {chip.label}
                <span
                  className={cn(
                    'tabular-nums text-label',
                    isActive ? 'text-text-secondary' : 'text-text-tertiary'
                  )}
                >
                  {chipCount}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search + Source + Date row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
            <Input
              type="search"
              placeholder="Search ref, guest, phone, group"
              value={searchRaw}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>

          {/* Source filter */}
          <Select value={source || 'all'} onValueChange={handleSourceChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All sources">
                {(value: string) => SOURCE_FILTER_LABEL[value] ?? 'All sources'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="walkin">Walk-in</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>

          {/* Date preset filter */}
          <Select value={datePreset} onValueChange={handleDatePreset}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All dates">
                {(value: string) => DATE_PRESET_LABEL[value] ?? 'All dates'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESET_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Outstanding-balance filter — set by the dashboard deep-link; dismissible */}
          {balanceOutstanding && (
            <button
              type="button"
              onClick={() => {
                setBalanceOutstanding(false)
                setPage(1)
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-small font-medium text-warning"
              title="Showing only bookings with an outstanding balance — click to clear"
            >
              Outstanding only
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Error state                                                       */}
      {/* ---------------------------------------------------------------- */}
      {isError && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-small text-danger">
          {error instanceof Error ? error.message : 'Failed to load bookings. Please try again.'}
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
                <TableHead className="text-text-tertiary text-label font-medium uppercase tracking-wide">Ref</TableHead>
                <TableHead className="text-text-tertiary text-label font-medium uppercase tracking-wide">Guest</TableHead>
                <SortableHead
                  col="checkin"
                  label="Stay"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <TableHead className="text-text-tertiary text-label font-medium uppercase tracking-wide">Status</TableHead>
                <SortableHead
                  col="total"
                  label="Total"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHead
                  col="balance"
                  label="Balance"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHead
                  col="booked"
                  label="Booked"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton />
              ) : bookings.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <td colSpan={7}>
                    <EmptyState hasFilters={hasFilters} />
                  </td>
                </TableRow>
              ) : (
                bookings.map((b) => (
                  <BookingTableRow key={b.id} booking={b} today={today} onClick={() => goToDetail(b.id)} />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && bookings.length > 0 && (
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
        ) : bookings.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <div className="space-y-3">
              {bookings.map((b) => (
                <BookingCard key={b.id} booking={b} today={today} onClick={() => goToDetail(b.id)} />
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
    </div>
  )
}
