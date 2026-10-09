'use client'
import { useQuery } from '@tanstack/react-query'

export type AvailabilityRoomType = {
  id: string
  name: Record<string, string> | string
  max_guests: number
  available_count: number
  /** Sold out only because an in-progress day-use is vacating later today */
  day_use_freeing?: boolean
  pricing: { breakdown: unknown; subtotal: number; override_label?: string }
}

export type AvailabilityData = {
  room_types: AvailabilityRoomType[]
  gst: { enabled: boolean; rate: number }
  payment: { upi_qr_url: string | null; upi_id: string | null }
  contact?: { phone: string; whatsapp: string }
}

export function useAvailability(params: { check_in: string; check_out: string; guests: number } | null) {
  return useQuery<{ data: AvailabilityData }>({
    queryKey: ['availability', params],
    queryFn: async () => {
      if (!params) throw new Error('No params')
      const sp = new URLSearchParams({ check_in: params.check_in, check_out: params.check_out, guests: String(params.guests) })
      const res = await fetch(`/api/availability?${sp}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message ?? 'Failed to check availability')
      return json
    },
    enabled: !!params,
    staleTime: 30_000,
    retry: 1,
  })
}
