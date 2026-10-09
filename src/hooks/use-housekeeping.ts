import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type HkRoom = {
  id: string
  room_number: string
  floor: number | null
  status: string
  updated_at: string | null
}

export type HkLock = {
  room_id: string
  locked_at: string | null
  auto_release_at: string
  rooms: HkRoom | null // joined
}

export type HkCompleted = {
  entity_id: string
  metadata: { room_number?: string } | null
  created_at: string
}

export type ReportIssueInput = {
  room_id: string
  reason: string
  category?: 'electrical' | 'plumbing' | 'furniture' | 'cleaning' | 'other'
  photo_url?: string
  from_date: string
  to_date: string
}

const HK_QUERY_KEY = ['housekeeping', 'queue'] as const

export function useHousekeepingQueue() {
  return useQuery<{ data: { queue: HkRoom[]; my_locks: HkLock[]; completed_today: HkCompleted[] } }>({
    queryKey: HK_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/housekeeping/queue')
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Failed to load housekeeping queue')
      return res.json()
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useStartCleaning() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ room_id }: { room_id: string }) => {
      const res = await fetch('/api/housekeeping/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id }),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not start cleaning')
      return (await res.json()).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: HK_QUERY_KEY }),
  })
}

export function useDoneCleaning() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ room_id }: { room_id: string }) => {
      const res = await fetch('/api/housekeeping/done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id }),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not mark room as done')
      return (await res.json()).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: HK_QUERY_KEY }),
  })
}

export function useReportIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ReportIssueInput) => {
      const res = await fetch('/api/housekeeping/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Could not report issue')
      return (await res.json()).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: HK_QUERY_KEY }),
  })
}
