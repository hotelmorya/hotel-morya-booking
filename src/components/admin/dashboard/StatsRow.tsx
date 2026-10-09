import {
  IconLogin,
  IconLogout,
  IconPercentage,
  IconCurrencyRupee,
} from '@tabler/icons-react'
import type { UserRole } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'

interface StatsRowProps {
  role: UserRole
  arrivalsToday: number
  departuresToday: number
  occupancyPercent: number | null
  revenueToday: number
  /** Positive = more than yesterday, negative = less, null = no data */
  arrivalsTrend?: number | null
  departuresTrend?: number | null
  revenueTrend?: number | null
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  trend?: number | null
  trendLabel?: string
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function StatCard({ icon, label, value, trend, trendLabel }: StatCardProps) {
  const hasTrend = trend !== null && trend !== undefined

  return (
    <Card size="sm" className="rounded bg-surface-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
      <CardContent className="px-[14px] py-[14px]">
        {/* Label row: small icon + 11px uppercase label */}
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.04em] text-text-tertiary">
          <span className="text-[12px]">{icon}</span>
          {label}
        </div>
        {/* Value: 24px/500 tabular */}
        <p className="mt-1.5 text-[24px] font-medium leading-none text-text-primary text-tabular">
          {value}
        </p>
        {/* Trend line: only when trend is provided */}
        {hasTrend && (
          <p
            className={`mt-1 text-[11px] ${
              trend! >= 0
                ? 'text-[var(--success)]'
                : 'text-[var(--danger)]'
            }`}
          >
            {trend! >= 0 ? '+' : '−'}
            {trendLabel ?? String(Math.abs(trend!))} vs yest
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function StatsRow({
  role,
  arrivalsToday,
  departuresToday,
  occupancyPercent,
  revenueToday,
  arrivalsTrend,
  departuresTrend,
  revenueTrend,
}: StatsRowProps) {
  const showFull = role === 'super_admin' || role === 'admin' || role === 'manager'

  return (
    <div
      className={
        showFull
          ? 'grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-[10px]'
          : 'grid grid-cols-2 gap-2 lg:gap-[10px]'
      }
    >
      <StatCard
        icon={<IconLogin size={12} stroke={1.75} />}
        label="Arrivals"
        value={String(arrivalsToday)}
        trend={arrivalsTrend}
        trendLabel={arrivalsTrend !== null && arrivalsTrend !== undefined ? String(Math.abs(arrivalsTrend)) : undefined}
      />
      <StatCard
        icon={<IconLogout size={12} stroke={1.75} />}
        label="Departures"
        value={String(departuresToday)}
        trend={departuresTrend}
        trendLabel={departuresTrend !== null && departuresTrend !== undefined ? String(Math.abs(departuresTrend)) : undefined}
      />
      {showFull && (
        <>
          <StatCard
            icon={<IconPercentage size={12} stroke={1.75} />}
            label="Occupancy"
            value={occupancyPercent === null ? '–' : `${occupancyPercent}%`}
          />
          <StatCard
            icon={<IconCurrencyRupee size={12} stroke={1.75} />}
            label="Revenue"
            value={formatInr(revenueToday)}
            trend={revenueTrend}
            trendLabel={
              revenueTrend !== null && revenueTrend !== undefined
                ? formatInr(Math.abs(revenueTrend))
                : undefined
            }
          />
        </>
      )}
    </div>
  )
}
