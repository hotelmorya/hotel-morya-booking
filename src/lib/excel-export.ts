/**
 * SheetJS (xlsx@0.18.5) helpers — client-side .xlsx export for bookings, guests, and payments.
 *
 * The dynamic import below uses `require` at runtime so TypeScript does not
 * need installed types for xlsx at build time. ESLint @typescript-eslint/no-require-imports
 * is suppressed on that line only.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XlsxModule = any

// Dynamic import so the xlsx bundle is only loaded on demand (client-side).
async function loadXlsx(): Promise<XlsxModule> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('xlsx') as XlsxModule
}

function triggerDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Bookings export
// ---------------------------------------------------------------------------
export type BookingExportRow = {
  booking_ref?: string | null
  status?: string | null
  source?: string | null
  check_in?: string | null
  check_out?: string | null
  nights?: number | null
  total_amount?: number | null
  discount_amount?: number | null
  gst_amount?: number | null
  advance_paid?: number | null
  balance_due?: number | null
  special_requests?: string | null
  created_at?: string | null
  // nested guest
  guests?: {
    fullname?: string | null
    phone?: string | null
  } | null
}

export async function exportBookings(rows: BookingExportRow[], filename = 'bookings.xlsx'): Promise<void> {
  const XLSX = await loadXlsx()

  const sheetData = [
    [
      'Booking Ref',
      'Guest Name',
      'Phone',
      'Status',
      'Source',
      'Check-in',
      'Check-out',
      'Nights',
      'Total (₹)',
      'Discount (₹)',
      'GST (₹)',
      'Advance Paid (₹)',
      'Balance Due (₹)',
      'Special Requests',
      'Created At',
    ],
    ...rows.map((r) => [
      r.booking_ref ?? '',
      r.guests?.fullname ?? '',
      r.guests?.phone ?? '',
      r.status ?? '',
      r.source ?? '',
      formatIsoDate(r.check_in),
      formatIsoDate(r.check_out),
      r.nights ?? '',
      r.total_amount ?? 0,
      r.discount_amount ?? 0,
      r.gst_amount ?? 0,
      r.advance_paid ?? 0,
      r.balance_due ?? 0,
      r.special_requests ?? '',
      formatIsoDate(r.created_at),
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Bookings')

  const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  triggerDownload(buf, filename)
}

// ---------------------------------------------------------------------------
// Guests export
// ---------------------------------------------------------------------------
export type GuestExportRow = {
  fullname?: string | null
  phone?: string | null
  email?: string | null
  city?: string | null
  preferred_language?: string | null
  total_stays?: number | null
  lifetime_value?: number | null
  last_stayed_at?: string | null
  tags?: string[] | null
  notes?: string | null
  created_at?: string | null
}

export async function exportGuests(rows: GuestExportRow[], filename = 'guests.xlsx'): Promise<void> {
  const XLSX = await loadXlsx()

  const sheetData = [
    [
      'Full Name',
      'Phone',
      'Email',
      'City',
      'Language',
      'Total Stays',
      'Lifetime Value (₹)',
      'Last Stayed',
      'Tags',
      'Notes',
      'Added On',
    ],
    ...rows.map((g) => [
      g.fullname ?? '',
      g.phone ?? '',
      g.email ?? '',
      g.city ?? '',
      g.preferred_language ?? '',
      g.total_stays ?? 0,
      g.lifetime_value ?? 0,
      formatIsoDate(g.last_stayed_at),
      (g.tags ?? []).join(', '),
      g.notes ?? '',
      formatIsoDate(g.created_at),
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Guests')

  const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  triggerDownload(buf, filename)
}

// ---------------------------------------------------------------------------
// Payments export
// ---------------------------------------------------------------------------
export type PaymentExportRow = {
  id?: string | null
  booking_id?: string | null
  amount?: number | null
  method?: string | null
  status?: string | null
  reference_note?: string | null
  paid_at?: string | null
  created_at?: string | null
  // optionally decorated at call site
  booking_ref?: string | null
  guest_name?: string | null
}

export async function exportPayments(rows: PaymentExportRow[], filename = 'payments.xlsx'): Promise<void> {
  const XLSX = await loadXlsx()

  const sheetData = [
    [
      'Payment ID',
      'Booking Ref',
      'Guest Name',
      'Amount (₹)',
      'Method',
      'Status',
      'Reference / UTR',
      'Paid At',
      'Recorded At',
    ],
    ...rows.map((p) => [
      p.id ?? '',
      p.booking_ref ?? p.booking_id ?? '',
      p.guest_name ?? '',
      p.amount ?? 0,
      p.method ?? '',
      p.status ?? '',
      p.reference_note ?? '',
      formatIsoDate(p.paid_at),
      formatIsoDate(p.created_at),
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Payments')

  const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  triggerDownload(buf, filename)
}
