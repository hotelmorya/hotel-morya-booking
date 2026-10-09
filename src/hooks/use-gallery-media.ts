'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { GalleryMedia } from '@/types/database'
import type { GalleryMediaCreate } from '@/schemas/gallery-media'

const QUERY_KEY = ['gallery-media'] as const

// Fetch all active, non-deleted gallery media items ordered by sort_order.
// staleTime: 30s — gallery changes are infrequent; avoid hammering the API.
export function useGalleryMedia() {
  return useQuery<{ data: GalleryMedia[] }>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/gallery-media')
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? 'Failed to fetch gallery media')
      }
      return res.json()
    },
    staleTime: 30_000,
  })
}

// Create a new gallery media item (image or video).
export function useCreateGalleryMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: GalleryMediaCreate) => {
      const res = await fetch('/api/gallery-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? 'Failed to create gallery item')
      }
      return res.json() as Promise<{ data: GalleryMedia }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

// Reorder a gallery media item by updating its sort_order.
// Requires updated_at for optimistic locking.
export function useReorderGalleryMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      sort_order,
      updated_at,
    }: {
      id: string
      sort_order: number
      updated_at: string
    }) => {
      const res = await fetch(`/api/gallery-media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order, updated_at }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? 'Failed to reorder gallery item')
      }
      return res.json() as Promise<{ data: GalleryMedia }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

// Toggle is_active visibility on a gallery media item.
export function useToggleGalleryMediaVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      is_active,
      updated_at,
    }: {
      id: string
      is_active: boolean
      updated_at: string
    }) => {
      const res = await fetch(`/api/gallery-media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active, updated_at }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? 'Failed to toggle gallery item visibility')
      }
      return res.json() as Promise<{ data: GalleryMedia }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

// Soft-delete a gallery media item. Optionally pass updated_at for optimistic lock.
export function useDeleteGalleryMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      updated_at,
    }: {
      id: string
      updated_at?: string
    }) => {
      const res = await fetch(`/api/gallery-media/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updated_at }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? 'Failed to delete gallery item')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
