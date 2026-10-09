'use client'

import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import {
  IconCalendar,
  IconCurrencyRupee,
  IconPercentage,
  IconBuildingBank,
  IconTrendingUp,
  IconSun,
  IconAlertCircle,
  IconClock,
} from '@tabler/icons-react'

import { useReports } from '@/hooks/use-reports'
import { formatCurrency, currentDateIST } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { ExportButtons } from './ExportButtons'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function firstDayOfMonth(): string {
  const today = currentDateIST()
  return today.slice(0, 7) + '-01'
}

function toDisplayDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso))
}

// ---------------------------------------------------------------------------
// Stat card (mirrors StatsRow look)
// ---------------------------------------------------------------------------
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: boolean
}

function StatCard({ icon, label, value, sub, accent }: StatCardProps) {
  return (
    <Card size="sm" className="rounded bg-surface-1">
      <CardContent className="px-[14px] py-[14px]">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.04em] text-text-tertiary">
          <span className="text-[12px]">{icon}</span>
          {label}
        </div>
        <p
          className={`mt-1.5 text-[22px] font-medium leading-none text-tabular ${
            accent ? 'text-accent-500' : 'text-text-primary'
          }`}
        >
          {value}
        </p>
        {sub && (
          <p className="mt-1 text-[11px] text-text-tertiary">{sub}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Horizontal bar chart (pure CSS — no charting library)
// ---------------------------------------------------------------------------
interface BarItem {
  label: string
  value: number
  count: number
  displayValue: string
  isCurrency: boolean
}

interface HorizontalBarsProps {
  title: string
  items: BarItem[]
}

function HorizontalBars({ title, items }: HorizontalBarsProps) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {items.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">No data for this period</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const pct = Math.max(4, Math.round((item.value / max) * 100))
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[13px] capitalize text-text-secondary">
                      {item.label}
                    </span>
                    <span className="font-mono text-[13px] text-text-primary tabular-nums">
                      {item.displayValue}
                      <span className="ml-1 text-[11px] text-text-tertiary">
                        ({item.count})
                      </span>
                    </span>
                  </div>
                  {/* CSS bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-2 rounded-full bg-accent-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Date range picker
// ---------------------------------------------------------------------------
interface DateRangePickerProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

function toIso(date: Date | undefined): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date)
}

function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>({
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  })

  function handleApply() {
    if (range?.from && range?.to) {
      onChange(toIso(range.from), toIso(range.to))
    }
    setOpen(false)
  }

  function handlePreset(months: number) {
    const today = new Date(currentDateIST())
    const start = new Date(today)
    start.setMonth(start.getMonth() - months + 1)
    start.setDate(1)
    const newRange: DateRange = { from: start, to: today }
    setRange(newRange)
    onChange(toIso(start), toIso(today))
    setOpen(false)
  }

  const label =
    from && to
      ? `${toDisplayDate(from)} – ${toDisplayDate(to)}`
      : 'Select date range'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2 min-w-[200px] justify-start">
            <IconCalendar size={14} stroke={1.75} />
            <span className="truncate">{label}</span>
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col gap-0">
          {/* Preset buttons */}
          <div className="flex flex-wrap gap-1.5 border-b border-border p-3">
            {[
              { label: 'This month', months: 1 },
              { label: 'Last 3 months', months: 3 },
              { label: 'Last 6 months', months: 6 },
            ].map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="xs"
                onClick={() => handlePreset(p.months)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={2}
            disabled={{ after: new Date(currentDateIST()) }}
          />
          <div className="flex justify-end gap-2 border-t border-border p-3">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!range?.from || !range?.to}
              onClick={handleApply}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[200px] rounded-xl" />
        <Skeleton className="h-[200px] rounded-xl" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main ReportsView
// ---------------------------------------------------------------------------
export function ReportsView() {
  const [from, setFrom] = useState(firstDayOfMonth)
  const [to, setTo] = useState(currentDateIST)

  const { data, isLoading, isError, error } = useReports({ from, to })
  const report = data?.data

  function handleRangeChange(newFrom: string, newTo: string) {
    setFrom(newFrom)
    setTo(newTo)
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-page text-text-primary">Reports</h1>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            Revenue, occupancy, and booking analytics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker from={from} to={to} onChange={handleRangeChange} />
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
          {error instanceof Error ? error.message : 'Failed to load reports'}
        </div>
      )}

      {isLoading && <ReportsSkeleton />}

      {report && !isLoading && (
        <>
          {/* KPI cards — 2 cols on mobile, 4 on md, 7 on xl */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <StatCard
              icon={<IconCurrencyRupee size={12} stroke={1.75} />}
              label="Total revenue"
              value={formatCurrency(report.revenue.collected)}
              sub={`Overnight ${formatCurrency(report.revenue.overnight_collected)}`}
              accent
            />
            <StatCard
              icon={<IconSun size={12} stroke={1.75} />}
              label="Day-use revenue"
              value={
                report.revenue.day_use_count > 0
                  ? formatCurrency(report.revenue.day_use_collected)
                  : '–'
              }
              sub={
                report.revenue.day_use_count > 0
                  ? `${report.revenue.day_use_count} booking${report.revenue.day_use_count === 1 ? '' : 's'}`
                  : 'No day-use bookings'
              }
            />
            <StatCard
              icon={<IconCurrencyRupee size={12} stroke={1.75} />}
              label="Revenue waived"
              value={formatCurrency(report.revenue.waived)}
              sub="discounts"
            />
            <StatCard
              icon={<IconPercentage size={12} stroke={1.75} />}
              label="Occupancy"
              value={report.occupancy !== null ? `${report.occupancy}%` : '–'}
              sub={`${report.rooms_sold} room-nights sold`}
            />
            <StatCard
              icon={<IconTrendingUp size={12} stroke={1.75} />}
              label="ADR"
              value={report.adr !== null ? formatCurrency(report.adr) : '–'}
              sub={
                report.revpar !== null
                  ? `RevPAR ${formatCurrency(report.revpar)}`
                  : 'RevPAR –'
              }
            />
            {/* Outstanding balances — money owed by guests who have stayed */}
            <StatCard
              icon={<IconAlertCircle size={12} stroke={1.75} />}
              label="Outstanding"
              value={
                report.outstanding.count > 0
                  ? formatCurrency(report.outstanding.total)
                  : '–'
              }
              sub={
                report.outstanding.count > 0
                  ? `${report.outstanding.count} guest${report.outstanding.count === 1 ? '' : 's'} owe money`
                  : 'All balances settled'
              }
            />
            {/* Pending / expected revenue — committed but not yet confirmed */}
            <StatCard
              icon={<IconClock size={12} stroke={1.75} />}
              label="Pending expected"
              value={
                report.pending.count > 0
                  ? formatCurrency(report.pending.receivable)
                  : '–'
              }
              sub={
                report.pending.count > 0
                  ? `${report.pending.count} pending · ${formatCurrency(report.pending.collected)} collected`
                  : 'No pending bookings'
              }
            />
          </div>

          {/* Breakdown charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <HorizontalBars
              title="Booking source"
              items={report.source_breakdown
                .sort((a, b) => b.revenue - a.revenue)
                .map((s) => ({
                  label: s.source,
                  value: s.revenue,
                  count: s.count,
                  displayValue: formatCurrency(s.revenue),
                  isCurrency: true,
                }))}
            />
            <HorizontalBars
              title="Payment method"
              items={report.payment_breakdown
                .sort((a, b) => b.amount - a.amount)
                .map((p) => ({
                  label: p.method,
                  value: p.amount,
                  count: p.count,
                  displayValue: formatCurrency(p.amount),
                  isCurrency: true,
                }))}
            />
          </div>

          {/* Summary note */}
          <div className="text-[12px] text-text-tertiary">
            <span className="font-medium text-text-secondary">Revenue / occupancy</span> counts
            confirmed, checked-in, and checked-out bookings.{' '}
            <span className="font-medium text-text-secondary">Outstanding</span> is money still owed
            by checked-in/checked-out guests (balance_due &gt; 0) — collected revenue does not
            include these amounts yet.{' '}
            <span className="font-medium text-text-secondary">Pending expected</span> is money
            committed but not yet collected from unconfirmed bookings (may cancel before check-in).
            Period: {toDisplayDate(report.from)} – {toDisplayDate(report.to)}.
            Rooms available: {report.rooms_available.toLocaleString('en-IN')} room-nights (overnight
            only). Occupancy, ADR, and RevPAR exclude day-use bookings.
          </div>

          {/* Export row */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <IconBuildingBank size={14} className="text-text-tertiary" stroke={1.75} />
              <span className="text-[12px] uppercase tracking-[0.04em] text-text-tertiary">
                Export / Backup
              </span>
            </div>
            <ExportButtons from={from} to={to} />
          </div>
        </>
      )}
    </div>
  )
}
