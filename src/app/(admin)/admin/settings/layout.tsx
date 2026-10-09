import { redirect } from 'next/navigation'

import { SettingsTabs } from '@/components/admin/settings/SettingsTabs'
import { ADMIN_PLUS, getCurrentProfile } from '@/lib/auth'

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()
  if (!profile || !ADMIN_PLUS.includes(profile.role)) {
    redirect('/admin')
  }

  return (
    <div className="space-y-6">
      <SettingsTabs isSuperAdmin={profile.role === 'super_admin'} />

      <div className="max-w-[720px]">{children}</div>
    </div>
  )
}
