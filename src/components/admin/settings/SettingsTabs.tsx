'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Separator } from '@/components/ui/separator'

const TABS = [
  { href: '/admin/settings/hotel', label: 'Hotel info' },
  { href: '/admin/settings/users', label: 'Staff users' },
  { href: '/admin/settings/policies', label: 'Policies' },
  // Integrations is developer-level config — super_admin only.
  { href: '/admin/settings/integrations', label: 'Integrations', superAdminOnly: true },
]

// SettingsTabs uses router-linked tabs (URL-driven navigation) rather than
// a controlled value — so we keep Link-based tab items and use the Separator
// primitive for the bottom border. Shadcn <Tabs> is value-driven and doesn't
// suit URL-switching without extra state plumbing.
export function SettingsTabs({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const pathname = usePathname()
  const tabs = TABS.filter((t) => !t.superAdminOnly || isSuperAdmin)

  return (
    <div>
      <div className="flex gap-0 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                'whitespace-nowrap px-4 py-2.5 text-body font-medium transition-colors',
                isActive
                  ? 'border-b-2 border-accent-500 text-accent-500'
                  : 'border-b-2 border-transparent text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
      <Separator />
    </div>
  )
}
