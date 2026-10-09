import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { BookingDetail } from '@/components/admin/bookings/BookingDetail'

export const metadata: Metadata = {
  title: 'Booking Detail',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params

  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/auth/login')
  }

  return (
    <BookingDetail id={id} role={profile.role} />
  )
}
