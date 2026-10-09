import type { Metadata } from 'next'

import { BookingForm } from '@/components/admin/bookings/BookingForm'

export const metadata: Metadata = {
  title: 'New Booking – Hotel Morya Lodging',
}

export default function NewBookingPage() {
  return <BookingForm />
}
