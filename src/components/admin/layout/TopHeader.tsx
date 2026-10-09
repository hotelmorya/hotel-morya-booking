'use client'

import { IconBell, IconLogout } from '@tabler/icons-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database'

import { ThemeToggle } from './ThemeToggle'

const PAGE_TITLES: [string, string][] = [
  ['/admin/bookings/new', 'New booking'],
  ['/admin/bookings', 'Bookings'],
  ['/admin/calendar', 'Calendar'],
  ['/admin/rooms', 'Rooms'],
  ['/admin/room-types', 'Room types'],
  ['/admin/guests', 'Guests'],
  ['/admin/rates', 'Rates'],
  ['/admin/reports', 'Reports'],
  ['/admin/settings', 'Settings'],
  ['/admin/help', 'Help'],
  ['/admin', 'Dashboard'],
]

function pageTitle(pathname: string): string {
  return PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'Admin'
}

/** Compute initials from a full name, e.g. "Pravin Bagde" → "PB" */
function initials(fullname: string): string {
  const parts = fullname.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
}

/** Format IST date like "Tuesday, 9 December" */
function istDateLabel(): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  }).format(new Date())
}

export function TopHeader({
  fullname,
  role,
  needsCallCount = 0,
}: {
  fullname: string
  role: UserRole
  needsCallCount?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  // Avoid hydration mismatch: date is stable within a day but computed client-side
  const [dateLabel, setDateLabel] = useState<string>('')

  // Compute the IST date label on the client after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDateLabel(istDateLabel())
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/auth/login')
    router.refresh()
  }

  const userInitials = initials(fullname)

  return (
    <header className="sticky top-0 z-sticky flex h-14 items-center justify-between border-b-hairline border-border bg-bg px-4 lg:h-[60px] lg:px-6">
      {/* Left: page title + IST date subtitle */}
      <div>
        <h1 className="text-[20px] font-medium leading-tight text-text-primary">
          {pageTitle(pathname)}
        </h1>
        {/* suppressHydrationWarning because date is set on client after mount */}
        <p
          className="text-[12px] text-text-tertiary"
          suppressHydrationWarning
        >
          {dateLabel}
        </p>
      </div>

      {/* Right: theme toggle + bell + avatar */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {/* Bell — 34×34px rounded-md with hairline border, red dot when needsCallCount > 0 */}
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Notifications"
          className="relative h-[34px] w-[34px] border-hairline border-border text-text-secondary hover:bg-surface-2 hover:text-text-primary active:scale-95"
        >
          <IconBell size={17} stroke={1.75} />
          {needsCallCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-[6px] top-[6px] h-[7px] w-[7px] rounded-full bg-danger"
            />
          )}
        </Button>

        {/* Avatar dropdown — 28px circle, accent-50 bg, accent-700 text */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-50 text-[11px] font-medium text-accent-700 transition-all hover:scale-105 hover:opacity-80 active:scale-95 outline-none dark:bg-accent-500/20 dark:text-accent-100"
          >
            {userInitials}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            side="bottom"
            sideOffset={8}
            className="w-52 rounded-md border-hairline border-border bg-bg py-1 shadow-md"
          >
            {/* User info header */}
            <div className="border-b-hairline border-border px-3 py-2">
              <p className="truncate text-body font-medium text-text-primary">
                {fullname}
              </p>
              <p className="text-small capitalize text-text-tertiary">
                {role.replace('_', ' ')}
              </p>
            </div>

            {/* Sign out */}
            <DropdownMenuItem
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-body text-text-secondary hover:bg-surface-2 hover:text-text-primary focus:bg-surface-2 focus:text-text-primary"
            >
              <IconLogout size={15} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
