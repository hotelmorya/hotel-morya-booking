import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { GuestInput } from '@/schemas/guest'

export type GuestLite = {
  id: string
  fullname: string
  phone: string
  email: string | null
  city: string | null
  total_stays: number | null
  tags: string[] | null
  updated_at?: string
}

export type GuestRow = {
  id: string
  fullname: string
  phone: string
  email: string | null
  city: string | null
  total_stays: number | null
  lifetime_value: number | string | null
  last_stayed_at: string | null
  tags: string[] | null
  created_at: string
  id_type: string | null
  id_proof_url: string | null
}

export type GuestBookingHistory = {
  id: string
  booking_ref: string
  check_in: string
  check_out: string
  status: string
  total_amount: number
}

export type GuestDetail = GuestRow & {
  address: string | null
  notes: string | null
  preferred_language: string
  id_number: string | null
  phone_verified: boolean
  updated_at: string
  bookings: GuestBookingHistory[]
}

// ── Existing exports (unchanged) ────────────────────────────────────────────

export function useGuestSearch(query: string) {
  return useQuery<GuestLite[]>({
    queryKey: ['guests', 'search', query],
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const res = await fetch(`/api/guests?search=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Search failed')
      return (await res.json()).data
    },
    staleTime: 30_000,
  })
}

export function useCreateGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: GuestInput): Promise<GuestLite> => {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not save guest')
      return (await res.json()).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guests'] }),
  })
}

// ── New exports ──────────────────────────────────────────────────────────────

export type GuestListFilters = {
  page?: number
  search?: string
}

export function useGuests(filters: GuestListFilters = {}) {
  const params = new URLSearchParams()
  // Always include page to trigger list mode in the API (vs typeahead mode)
  params.set('page', String(filters.page ?? 1))
  if (filters.search) params.set('search', filters.search)
  const qs = params.toString()

  return useQuery<{ data: GuestRow[]; meta: { total: number; page: number; pageSize: number } }>({
    queryKey: ['guests', 'list', filters],
    queryFn: async () => {
      const res = await fetch(`/api/guests${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Failed to load guests')
      return res.json()
    },
    staleTime: 30_000,
  })
}

export function useGuest(id: string | undefined) {
  return useQuery<GuestDetail>({
    queryKey: ['guests', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/guests/${id}`)
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Failed to load guest')
      return (await res.json()).data
    },
  })
}

export function useUpdateGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & GuestInput & { updated_at: string }) => {
      const res = await fetch(`/api/guests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not update guest')
      return (await res.json()).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guests'] }),
  })
}

export function useDeleteGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; updated_at?: string }) => {
      const res = await fetch(`/api/guests/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not delete guest')
      return (await res.json()).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guests'] }),
  })
}

export function useMergeGuests() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ keep_id, merge_id }: { keep_id: string; merge_id: string }) => {
      const res = await fetch('/api/guests/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keep_id, merge_id }),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not merge guests')
      return (await res.json()).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guests'] }),
  })
}

export function useGuestIdProofUrl(guestId: string | undefined, hasProof: boolean) {
  return useQuery<{ signedUrl: string; expiresAt: string }>({
    queryKey: ['guests', 'id-proof', guestId],
    enabled: !!guestId && hasProof,
    queryFn: async () => {
      const res = await fetch(`/api/guests/${guestId}/id-proof`)
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not fetch ID proof URL')
      return (await res.json()).data
    },
    staleTime: 50 * 60 * 1000, // 50 min — signed URL lasts 60 min
  })
}
