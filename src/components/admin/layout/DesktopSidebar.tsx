'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

import { isActivePath, visibleSections } from './nav-items'

export function DesktopSidebar({
  role,
  hotelName,
}: {
  role: UserRole
  hotelName: string
}) {
  const pathname = usePathname()
  const sections = visibleSections(role)

  return (
    <aside className="fixed inset-y-0 left-0 z-sticky hidden w-[220px] flex-col border-r-hairline border-border bg-bg lg:flex">
      {/* Brand block — mockup .sb-brand: 6px 12px 18px padding, no divider, no eyebrow */}
      <div
        className="flex items-center gap-2.5"
        style={{ padding: '6px 12px 18px' }}
      >
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-accent-500 text-[12px] font-medium text-white">
          {hotelName.charAt(0)}
        </div>
        <span className="truncate text-[14px] font-medium leading-tight text-text-primary">
          {hotelName}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-[10px]">
        {sections.map((section) => (
          <div key={section.title}>
            {/* Section label — 10px uppercase, text-disabled (#A3A3A3), mockup padding 14px 12px 6px */}
            <p
              className="text-[10px] font-medium uppercase tracking-[0.06em] text-text-disabled"
              style={{ padding: '14px 12px 6px' }}
            >
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded text-[13px] transition-all duration-200',
                        // mockup padding: 8px 12px
                        'px-3 py-2',
                        active
                          ? 'bg-surface-1 font-medium text-text-primary shadow-sm hairline-border'
                          : 'text-text-secondary hover:translate-x-0.5 hover:bg-black/[0.025] hover:text-text-primary dark:hover:bg-white/[0.04]'
                      )}
                    >
                      <item.icon
                        size={16}
                        stroke={1.75}
                        className={active ? 'text-accent-500' : undefined}
                      />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
