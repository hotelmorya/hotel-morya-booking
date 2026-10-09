import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BookingsList } from '@/components/admin/bookings/BookingsList'

export const metadata: Metadata = {
  title: 'Bookings',
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Re-key on the URL query so BookingsList remounts (and re-seeds its filters
  // from the URL) when a dashboard/nav deep-link changes the params.
  const sp = await searchParams
  const key = JSON.stringify(sp)

  return (
    <div className="p-4 sm:p-6">
      {/* Suspense: BookingsList reads useSearchParams to honor dashboard deep-links */}
      <Suspense>
        <BookingsList key={key} />
      </Suspense>
    </div>
  )
}
