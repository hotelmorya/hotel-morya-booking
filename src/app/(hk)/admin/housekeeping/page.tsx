import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { HousekeepingClient } from '@/components/hk/HousekeepingClient'
import { HkHeader } from '@/components/hk/HkHeader'

export const metadata = { title: 'Housekeeping' }

export default async function HousekeepingPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/auth/login')

  return (
    <main className="min-h-screen bg-bg pb-6">
      <HkHeader fullname={profile.fullname} />
      <div className="mx-auto max-w-[720px] px-4 py-4 space-y-6">
        <HousekeepingClient />
      </div>
    </main>
  )
}
