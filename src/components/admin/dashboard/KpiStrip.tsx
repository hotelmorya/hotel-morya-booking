'use client'

import Link from 'next/link'
import { IconPhone, IconClock, IconChevronRight } from '@tabler/icons-react'

import { cn } from '@/lib/utils'

interface KpiStripProps {
  needsCallCount: number
  deadlineSoonCount: number
}

interface KpiCardDesktopProps {
  iconEl: React.ReactNode
  iconBg: string
  label: string
  value: number
  subtext: string
  href: string
}

/** Desktop card: white bg, hairline border, radius 6px, 36px tinted icon square */
function KpiCardDesktop({
  iconEl,
  iconBg,
  label,
  value,
  subtext,
  href,
}: KpiCardDesktopProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded border-hairline border-border bg-surface-1 px-4 py-[14px] transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-2 hover:shadow-sm"
    >
      {/* 36×36 tinted icon square */}
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded',
          iconBg
        )}
      >
        {iconEl}
      </div>
      <div>
        {/* 11px uppercase label */}
        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-text-tertiary">
          {label}
        </p>
        {/* 20px/500 value with 12px subtext inline */}
        <p className="mt-0.5 text-[20px] font-medium leading-none text-text-primary">
          {value}
          <small className="ml-1 text-[12px] font-normal text-text-secondary">
            {subtext}
          </small>
        </p>
      </div>
    </Link>
  )
}

interface KpiRowMobileProps {
  iconEl: React.ReactNode
  iconBg: string
  label: string
  value: number
  subtext: string
  href: string
}

/** Mobile row: full-width tappable with chevron */
function KpiRowMobile({
  iconEl,
  iconBg,
  label,
  value,
  subtext,
  href,
}: KpiRowMobileProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-[10px] border-hairline border-border bg-surface-1 px-3 py-[11px] transition-colors hover:bg-surface-2"
    >
      {/* 32×32 icon */}
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md',
          iconBg
        )}
      >
        {iconEl}
      </div>
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-[0.04em] text-text-tertiary">
          {label}
        </p>
        <p className="mt-0.5 text-[14px] font-medium text-text-primary">
          {value}
          <small className="ml-1 text-[11px] font-normal text-text-secondary">
            {subtext}
          </small>
        </p>
      </div>
      <IconChevronRight size={16} className="text-text-disabled" stroke={1.5} />
    </Link>
  )
}

export function KpiStrip({
  needsCallCount,
  deadlineSoonCount,
}: KpiStripProps) {
  const cards = [
    {
      iconEl: <IconPhone size={16} stroke={1.75} />,
      // red: danger-bg / danger-text
      iconBg: 'bg-booking-cancelled-bg text-booking-cancelled-text',
      label: 'Needs call',
      value: needsCallCount,
      subtext: 'pending bookings',
      href: '/admin/bookings?status=pending',
    },
    {
      iconEl: <IconClock size={16} stroke={1.75} />,
      // amber: pending-bg / pending-text
      iconBg: 'bg-booking-pending-bg text-booking-pending-text',
      label: 'Deadline soon',
      value: deadlineSoonCount,
      subtext: 'expires soon',
      href: '/admin/bookings?status=pending&deadline=soon',
    },
    // Active holds are surfaced by the richer <ActiveHoldsPanel> (count + room
    // type + dates + live expiry), so a duplicate KPI card here is redundant.
  ] as const

  return (
    <>
      {/* Desktop: 2-col grid */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-2">
        {cards.map((card) => (
          <KpiCardDesktop key={card.label} {...card} />
        ))}
      </div>

      {/* Mobile: stacked tappable rows */}
      <div className="flex flex-col gap-2 lg:hidden">
        {cards.map((card) => (
          <KpiRowMobile key={card.label} {...card} />
        ))}
      </div>
    </>
  )
}
