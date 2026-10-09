import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { GuestDetail } from '@/components/admin/guests/GuestDetail'

export const metadata: Metadata = {
  title: 'Guest Profile',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GuestDetailPage({ params }: PageProps) {
  const { id } = await params

  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/auth/login')
  }

  return (
    <GuestDetail id={id} role={profile.role} />
  )
}
