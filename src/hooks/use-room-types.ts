'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import type { Tables } from '@/types/database'

export type RoomTypeRow = Tables<'room_types'>

export function useRoomTypes() {
  return useQuery<{ data: RoomTypeRow[]; meta: { total: number } }>({
    queryKey: ['room-types'],
    queryFn: async () => {
      const res = await fetch('/api/room-types')
      if (!res.ok) throw new Error((await res.json())?.error?.message)
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useDeleteRoomType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updated_at }: { id: string; updated_at: string }) => {
      const res = await fetch(`/api/room-types/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updated_at }),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['room-types'] }),
  })
}
