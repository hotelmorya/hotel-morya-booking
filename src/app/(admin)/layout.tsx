import { redirect } from 'next/navigation'

import { DesktopSidebar } from '@/components/admin/layout/DesktopSidebar'
import { MobileBottomTabs } from '@/components/admin/layout/MobileBottomTabs'
import { TopHeader } from '@/components/admin/layout/TopHeader'
import { Providers } from '@/components/providers'
import { getCurrentProfile } from '@/lib/auth'

const hotelName = process.env.NEXT_PUBLIC_HOTEL_NAME ?? 'Hotel Morya Lodging'

// Admin shell: 220px sidebar on desktop, sticky header + bottom tabs on
// mobile (design-system §5.1/5.2). Housekeeping never sees this shell —
// they are redirected to /admin/housekeeping which lives in the (hk) group.
export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/auth/login')
  }

  if (profile.role === 'housekeeping') {
    redirect('/admin/housekeeping')
  }

  return (
    <Providers>
      <DesktopSidebar role={profile.role} hotelName={hotelName} />
      <div className="lg:pl-[220px]">
        <TopHeader fullname={profile.fullname} role={profile.role} />
        <main className="mx-auto max-w-[1200px] p-4 pb-[110px] lg:p-6 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileBottomTabs role={profile.role} />
    </Providers>
  )
}
