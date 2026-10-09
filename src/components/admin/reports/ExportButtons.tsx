'use client'

import { useState } from 'react'
import { IconDownload, IconDatabase } from '@tabler/icons-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  exportBookings,
  exportGuests,
  exportPayments,
  type BookingExportRow,
  type GuestExportRow,
  type PaymentExportRow,
} from '@/lib/excel-export'

// ---------------------------------------------------------------------------
// Helpers: paginate through /api/bookings, /api/guests, /api/payments
// ---------------------------------------------------------------------------
async function fetchAllBookings(): Promise<BookingExportRow[]> {
  const all: BookingExportRow[] = []
  let page = 1
  while (true) {
    const res = await fetch(`/api/bookings?page=${page}&pageSize=100`)
    if (!res.ok) throw new Error('Failed to fetch bookings')
    const json = await res.json()
    const rows: BookingExportRow[] = json.data ?? []
    all.push(...rows)
    const meta = json.meta as { total: number; pageSize: number }
    if (all.length >= meta.total) break
    page++
  }
  return all
}

async function fetchAllGuests(): Promise<GuestExportRow[]> {
  const all: GuestExportRow[] = []
  let page = 1
  while (true) {
    const res = await fetch(`/api/guests?page=${page}&pageSize=100`)
    if (!res.ok) throw new Error('Failed to fetch guests')
    const json = await res.json()
    const rows: GuestExportRow[] = json.data ?? []
    all.push(...rows)
    const meta = json.meta as { total: number; pageSize: number }
    if (all.length >= meta.total) break
    page++
  }
  return all
}

async function fetchAllPayments(): Promise<PaymentExportRow[]> {
  const all: PaymentExportRow[] = []
  let page = 1
  while (true) {
    const res = await fetch(`/api/payments?page=${page}&pageSize=100`)
    if (!res.ok) throw new Error('Failed to fetch payments')
    const json = await res.json()
    const rows: PaymentExportRow[] = json.data ?? []
    all.push(...rows)
    const meta = json.meta as { total: number; pageSize: number }
    if (all.length >= meta.total) break
    page++
  }
  return all
}

// ---------------------------------------------------------------------------
// Export buttons
// ---------------------------------------------------------------------------
interface ExportButtonsProps {
  /** Current date range in reports view — used to name the bookings export */
  from?: string
  to?: string
}

export function ExportButtons({ from, to }: ExportButtonsProps) {
  const [exporting, setExporting] = useState<'bookings' | 'guests' | 'payments' | 'backup' | null>(null)

  async function handleExport(type: 'bookings' | 'guests' | 'payments') {
    setExporting(type)
    try {
      if (type === 'bookings') {
        const rows = await fetchAllBookings()
        const rangeLabel = from && to ? `_${from}_${to}` : ''
        await exportBookings(rows, `bookings${rangeLabel}.xlsx`)
        toast.success(`Exported ${rows.length} bookings`)
      } else if (type === 'guests') {
        const rows = await fetchAllGuests()
        await exportGuests(rows, 'guests.xlsx')
        toast.success(`Exported ${rows.length} guests`)
      } else {
        const rows = await fetchAllPayments()
        await exportPayments(rows, 'payments.xlsx')
        toast.success(`Exported ${rows.length} payments`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(null)
    }
  }

  async function handleBackup() {
    setExporting('backup')
    const toastId = toast.loading('Backing up all data…')
    try {
      const [bookings, guests, payments] = await Promise.all([
        fetchAllBookings(),
        fetchAllGuests(),
        fetchAllPayments(),
      ])
      await exportBookings(bookings, 'backup_bookings.xlsx')
      await exportGuests(guests, 'backup_guests.xlsx')
      await exportPayments(payments, 'backup_payments.xlsx')
      toast.success('Backup complete — 3 files downloaded', { id: toastId })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Backup failed', { id: toastId })
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={exporting !== null}
        onClick={() => handleExport('bookings')}
      >
        <IconDownload size={14} stroke={1.75} />
        {exporting === 'bookings' ? 'Exporting…' : 'Bookings'}
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={exporting !== null}
        onClick={() => handleExport('guests')}
      >
        <IconDownload size={14} stroke={1.75} />
        {exporting === 'guests' ? 'Exporting…' : 'Guests'}
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={exporting !== null}
        onClick={() => handleExport('payments')}
      >
        <IconDownload size={14} stroke={1.75} />
        {exporting === 'payments' ? 'Exporting…' : 'Payments'}
      </Button>

      {/* Divider */}
      <span className="hidden h-5 w-px bg-border lg:block" aria-hidden />

      <Button
        variant="default"
        size="sm"
        disabled={exporting !== null}
        onClick={handleBackup}
      >
        <IconDatabase size={14} stroke={1.75} />
        {exporting === 'backup' ? 'Backing up…' : 'Backup now'}
      </Button>
    </div>
  )
}
