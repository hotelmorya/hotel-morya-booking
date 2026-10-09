'use client'

import {
  IconCalendarMonth,
  IconDotsCircleHorizontal,
  IconHome,
  IconLogout,
  IconNotebook,
  IconPlus,
  IconSparkles,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

import { isActivePath, visibleSections } from './nav-items'

const TABS = [
  { label: 'Home', href: '/admin', icon: IconHome },
  { label: 'Bookings', href: '/admin/bookings', icon: IconNotebook },
  // center FAB slot
  { label: 'Calendar', href: '/admin/calendar', icon: IconCalendarMonth },
] as const

// 5-tab bottom nav with elevated circular center button (design-system §6.13).
// Center "+" is context-aware (uiux-spec §1.3): action sheet on dashboard,
// direct "new booking" elsewhere. "More" opens a bottom sheet drawer.
export function MobileBottomTabs({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sheet, setSheet] = useState<'none' | 'actions' | 'more'>('none')

  // Close any sheet on navigation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSheet('none')
  }, [pathname])

  function onPlusTap() {
    if (pathname === '/admin') {
      setSheet('actions')
    } else if (pathname.startsWith('/admin/guests')) {
      router.push('/admin/guests/new')
    } else {
      router.push('/admin/bookings/new')
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/auth/login')
    router.refresh()
  }

  const moreItems = visibleSections(role)
    .flatMap((s) => s.items)
    .filter((item) => !TABS.some((t) => t.href === item.href))

  return (
    <>
      {/* Quick-actions bottom sheet */}
      <Sheet
        open={sheet === 'actions'}
        onOpenChange={(open) => {
          if (!open) setSheet('none')
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl bg-bg px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] lg:hidden"
        >
          <SheetHeader className="mb-1 flex-row items-center justify-between p-0 pb-3">
            <SheetTitle className="text-subsection font-medium text-text-primary">
              Quick actions
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSheet('none')}
              aria-label="Close sheet"
              className="text-text-tertiary hover:bg-surface-2"
            >
              <IconX size={18} />
            </Button>
          </SheetHeader>
          <div className="space-y-1 -mx-2">
            <SheetLink href="/admin/bookings/new" icon={<IconNotebook size={18} />} label="New booking" />
            <SheetLink href="/admin/bookings?status=confirmed&arriving=today" icon={<IconUserPlus size={18} />} label="Quick check-in" />
            <SheetLink href="/admin/rooms?status=cleaning" icon={<IconSparkles size={18} />} label="Mark room clean" />
          </div>
        </SheetContent>
      </Sheet>

      {/* More bottom sheet */}
      <Sheet
        open={sheet === 'more'}
        onOpenChange={(open) => {
          if (!open) setSheet('none')
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl bg-bg px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] lg:hidden"
        >
          <SheetHeader className="mb-1 flex-row items-center justify-between p-0 pb-3">
            <SheetTitle className="text-subsection font-medium text-text-primary">
              More
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSheet('none')}
              aria-label="Close sheet"
              className="text-text-tertiary hover:bg-surface-2"
            >
              <IconX size={18} />
            </Button>
          </SheetHeader>
          <div className="space-y-1 -mx-2">
            {moreItems.map((item) => (
              <SheetLink
                key={item.href}
                href={item.href}
                icon={<item.icon size={18} />}
                label={item.label}
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              onClick={handleSignOut}
              className="flex w-full items-center justify-start gap-3 rounded-md px-2 py-3 text-subsection text-text-secondary hover:bg-surface-2"
            >
              <IconLogout size={18} />
              Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-fab border-t-hairline border-border bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid h-[64px] grid-cols-5">
          {TABS.slice(0, 2).map((tab) => (
            <TabCell key={tab.href} {...tab} active={isActivePath(pathname, tab.href)} />
          ))}

          {/* Elevated center FAB — must stay visually elevated (design-system §6.13).
              Using a raw <button> here because shadcn Button's base styles (rounded-lg,
              h-8 default) would fight the bespoke 56px circle + negative top offset.
              We need full control over the shape, size, and ring-4 ring-bg elevation trick. */}
          <div className="relative">
            <button
              type="button"
              onClick={onPlusTap}
              aria-label="New"
              className="absolute left-1/2 top-[-24px] flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-accent-500 text-white shadow-md ring-4 ring-bg transition-transform hover:-translate-x-1/2 hover:scale-105 active:scale-95"
            >
              <IconPlus size={26} />
            </button>
            <span className="absolute inset-x-0 bottom-2 text-center text-micro font-medium uppercase text-text-tertiary">
              New
            </span>
          </div>

          {TABS.slice(2).map((tab) => (
            <TabCell key={tab.href} {...tab} active={isActivePath(pathname, tab.href)} />
          ))}

          <button
            type="button"
            onClick={() => setSheet('more')}
            className="flex flex-col items-center justify-center gap-1 text-text-tertiary"
          >
            <IconDotsCircleHorizontal size={20} />
            <span className="text-micro font-medium uppercase">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}

function TabCell({
  label,
  href,
  icon: Icon,
  active,
}: {
  label: string
  href: string
  icon: typeof IconHome
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center justify-center gap-1',
        active ? 'text-accent-500' : 'text-text-tertiary'
      )}
    >
      <Icon size={20} stroke={active ? 2 : 1.75} />
      <span className="text-micro font-medium uppercase">{label}</span>
    </Link>
  )
}

function SheetLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-2 py-3 text-subsection text-text-primary transition-colors hover:bg-surface-2"
    >
      {icon}
      {label}
    </Link>
  )
}
