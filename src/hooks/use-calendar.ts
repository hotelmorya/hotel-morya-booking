'use client'

import { useQuery } from '@tanstack/react-query'

export type CalendarRoomType = {
  id: string
  name: string
  rooms: Array<{ id: string; room_number: string; floor: number }>
}

export type CalendarBooking = {
  booking_id: string
  booking_ref: string
  room_id: string | null
  room_type_id: string
  guest_name: string
  check_in: string
  check_out: string
  status: string
  stay_type: string
}

export type CalendarHold = {
  id: string
  room_type_id: string
  check_in: string
  check_out: string
  expires_at: string
}

export type CalendarData = {
  roomTypes: CalendarRoomType[]
  bookings: CalendarBooking[]
  holds: CalendarHold[]
  window: { from: string; to: string }
}

export function useCalendar({ from, to }: { from: string; to: string }) {
  const params = new URLSearchParams({ from, to })
  return useQuery<{ data: CalendarData }>({
    queryKey: ['calendar', from, to],
    queryFn: async () => {
      const res = await fetch(`/api/calendar?${params}`)
      if (!res.ok)
        throw new Error((await res.json())?.error?.message ?? 'Failed to load calendar')
      return res.json()
    },
    staleTime: 30_000,
  })
}
