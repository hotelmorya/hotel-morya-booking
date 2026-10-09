import type { Metadata } from 'next'
import { CalendarView } from '@/components/admin/calendar/CalendarView'

export const metadata: Metadata = {
  title: 'Calendar',
}

export default function CalendarPage() {
  return (
    <div className="p-4 sm:p-6">
      <CalendarView />
    </div>
  )
}
