'use client'
import { useMutation } from '@tanstack/react-query'

export function usePlaceHold() {
  return useMutation({
    mutationFn: async (body: { room_type_id: string; check_in: string; check_out: string; session_id: string; quantity: number }) => {
      const res = await fetch('/api/holds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message ?? 'Could not hold room')
      return json
    },
  })
}

export function useReleaseHolds() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await fetch(`/api/holds?session_id=${sessionId}`, { method: 'DELETE' })
    },
  })
}

export function useCreatePublicBooking() {
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/public/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message ?? 'Could not create booking')
      return json
    },
  })
}

