import type { Metadata } from 'next'
import { GuestsList } from '@/components/admin/guests/GuestsList'

export const metadata: Metadata = {
  title: 'Guests',
}

export default function GuestsPage() {
  return (
    <div className="p-4 sm:p-6">
      <GuestsList />
    </div>
  )
}
