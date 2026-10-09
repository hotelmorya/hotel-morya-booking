import type { Icon } from '@tabler/icons-react'
import {
  IconBed,
  IconCalendarMonth,
  IconCash,
  IconChartBar,
  IconHelp,
  IconHome,
  IconLayoutGrid,
  IconNotebook,
  IconPhoto,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react'

import type { UserRole } from '@/types/database'

export type NavItem = {
  label: string
  href: string
  icon: Icon
  /** Roles that can see this item. Omit = all non-housekeeping staff. */
  roles?: UserRole[]
}

export type NavSection = {
  title: string
  items: NavItem[]
}

const MANAGER_PLUS: UserRole[] = ['super_admin', 'admin', 'manager']
const ADMIN_PLUS: UserRole[] = ['super_admin', 'admin']

// Per uiux-spec §1.1 site map + CLAUDE.md role permission matrix.
// Receptionist: no rates/room-types/reports/settings. Manager: no settings/users.
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/admin', icon: IconHome },
      { label: 'Bookings', href: '/admin/bookings', icon: IconNotebook },
      { label: 'Calendar', href: '/admin/calendar', icon: IconCalendarMonth },
      { label: 'Rooms', href: '/admin/rooms', icon: IconLayoutGrid },
      { label: 'Guests', href: '/admin/guests', icon: IconUsers },
    ],
  },
  {
    title: 'Manage',
    items: [
      { label: 'Room types', href: '/admin/room-types', icon: IconBed, roles: MANAGER_PLUS },
      { label: 'Rates', href: '/admin/rates', icon: IconCash, roles: MANAGER_PLUS },
      { label: 'Gallery', href: '/admin/gallery', icon: IconPhoto, roles: MANAGER_PLUS },
      { label: 'Reports', href: '/admin/reports', icon: IconChartBar, roles: MANAGER_PLUS },
      { label: 'Settings', href: '/admin/settings', icon: IconSettings, roles: ADMIN_PLUS },
      { label: 'Help', href: '/admin/help', icon: IconHelp },
    ],
  },
]

export function visibleSections(role: UserRole): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.roles || item.roles.includes(role)
    ),
  })).filter((section) => section.items.length > 0)
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}
