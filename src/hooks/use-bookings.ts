import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { BookingInput, VehicleType } from '@/schemas/booking'
import type { PaymentInput } from '@/schemas/payment'

export type BookingListFilters = {
  page?: number
  status?: string
  search?: string
  source?: string
  checkInFrom?: string
  checkInTo?: string
  checkOutFrom?: string
  checkOutTo?: string
  departingFrom?: string
  departingTo?: string
  balance?: string
  sort?: string
  dir?: string
}

export function useBookings(filters: BookingListFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.status) params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  if (filters.source) params.set('source', filters.source)
  if (filters.checkInFrom) params.set('checkInFrom', filters.checkInFrom)
  if (filters.checkInTo) params.set('checkInTo', filters.checkInTo)
  if (filters.checkOutFrom) params.set('checkOutFrom', filters.checkOutFrom)
  if (filters.checkOutTo) params.set('checkOutTo', filters.checkOutTo)
  if (filters.departingFrom) params.set('departingFrom', filters.departingFrom)
  if (filters.departingTo) params.set('departingTo', filters.departingTo)
  if (filters.balance) params.set('balance', filters.balance)
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.dir) params.set('dir', filters.dir)
  const qs = params.toString()

  return useQuery<{
    data: unknown[]
    meta: { total: number; page: number; pageSize: number; counts?: Record<string, number> }
  }>({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      const res = await fetch(`/api/bookings${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Failed to load bookings')
      return res.json()
    },
  })
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ['bookings', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${id}`)
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Failed to load booking')
      return (await res.json()).data
    },
  })
}

export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: BookingInput) => {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not create booking')
      return (await res.json()).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })
}

type BookingActionArgs = {
  id: string
  updated_at: string
  action: 'confirm' | 'cancel' | 'not_arrived' | 'discount'
  cancellation_reason?: string
  discount_amount?: number
  discount_reason?: string
}

// Synchronously refresh the cached booking detail's optimistic-lock token
// (updated_at) + status from a mutation response, so the NEXT action on the
// same booking doesn't 409 on a stale value while the refetch is still in flight.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patchBookingDetail(qc: ReturnType<typeof useQueryClient>, id: string, patch: any) {
  if (!patch?.updated_at) return
  qc.setQueryData(['bookings', 'detail', id], (old: unknown) =>
    old && typeof old === 'object' ? { ...old, ...patch } : old
  )
}

export function useBookingAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: BookingActionArgs) => {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Action failed')
      return (await res.json()).data
    },
    onSuccess: (data, vars) => {
      patchBookingDetail(qc, vars.id, { status: data?.status, updated_at: data?.updated_at })
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

// Edit the vehicle on a booking after check-in (set_vehicle PATCH action).
export function useSetVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      updated_at,
      vehicle_type,
      vehicle_number,
    }: {
      id: string
      updated_at: string
      vehicle_type: VehicleType
      vehicle_number?: string
    }) => {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_vehicle',
          updated_at,
          vehicle_type,
          vehicle_number,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not update vehicle')
      return (await res.json()).data
    },
    onSuccess: (data, vars) => {
      patchBookingDetail(qc, vars.id, { updated_at: data?.updated_at })
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

export function useAddPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookingId, ...body }: { bookingId: string } & Omit<PaymentInput, 'booking_id'>) => {
      const res = await fetch(`/api/bookings/${bookingId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not record payment')
      return await res.json()
    },
    onSuccess: (json, vars) => {
      patchBookingDetail(qc, vars.bookingId, {
        status: json?.booking?.status,
        updated_at: json?.booking?.updated_at,
      })
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

// Void a mistaken payment (soft delete). The server recalcs advance_paid.
export function useVoidPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookingId, paymentId }: { bookingId: string; paymentId: string }) => {
      const res = await fetch(`/api/bookings/${bookingId}/payments/${paymentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not void payment')
      return await res.json()
    },
    onSuccess: (json, vars) => {
      patchBookingDetail(qc, vars.bookingId, { updated_at: json?.booking?.updated_at })
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

// Record a refund on a successful payment (success → refunded).
export function useRefundPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      bookingId,
      paymentId,
      reference_note,
    }: {
      bookingId: string
      paymentId: string
      reference_note?: string
    }) => {
      const res = await fetch(`/api/bookings/${bookingId}/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_note }),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not record refund')
      return await res.json()
    },
    onSuccess: (json, vars) => {
      patchBookingDetail(qc, vars.bookingId, { updated_at: json?.booking?.updated_at })
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

// Move an in-house guest to a different free room of the same type.
export function useReassignRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      bookingId,
      bookingRoomId,
      new_room_id,
      old_room_disposition,
      updated_at,
    }: {
      bookingId: string
      bookingRoomId: string
      new_room_id: string
      old_room_disposition: 'cleaning' | 'maintenance'
      updated_at: string
    }) => {
      const res = await fetch(`/api/bookings/${bookingId}/rooms/${bookingRoomId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_room_id, old_room_disposition, updated_at }),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not change room')
      return (await res.json()).data
    },
    onSuccess: (data, vars) => {
      patchBookingDetail(qc, vars.bookingId, { updated_at: data?.updated_at })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['rooms', 'available'] })
    },
  })
}

export function useCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      updated_at,
      assignments,
      actual_check_in,
      vehicle_type,
      vehicle_number,
    }: {
      id: string
      updated_at: string
      assignments: { booking_room_id: string; room_id: string }[]
      actual_check_in?: string
      vehicle_type: VehicleType
      vehicle_number?: string
    }) => {
      const res = await fetch(`/api/bookings/${id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updated_at,
          assignments,
          actual_check_in,
          vehicle_type,
          vehicle_number,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Check-in failed')
      return (await res.json()).data
    },
    onSuccess: (data, vars) => {
      patchBookingDetail(qc, vars.id, { status: data?.status, updated_at: data?.updated_at })
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

export function useCheckOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      updated_at,
      actual_check_out,
    }: {
      id: string
      updated_at: string
      actual_check_out?: string
    }) => {
      const res = await fetch(`/api/bookings/${id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updated_at, actual_check_out }),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Check-out failed')
      return (await res.json()).data
    },
    onSuccess: (data, vars) => {
      patchBookingDetail(qc, vars.id, { status: data?.status, updated_at: data?.updated_at })
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

export function useDeleteBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updated_at }: { id: string; updated_at: string }) => {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updated_at }),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not delete booking')
      return (await res.json()).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })
}
