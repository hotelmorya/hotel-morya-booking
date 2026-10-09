import { useQuery } from '@tanstack/react-query'
import type { ReportsData } from '@/app/api/reports/route'

export type { ReportsData }

export type UseReportsParams = {
  from?: string // YYYY-MM-DD
  to?: string   // YYYY-MM-DD
}

export function useReports({ from, to }: UseReportsParams = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()

  return useQuery<{ data: ReportsData }>({
    queryKey: ['reports', { from, to }],
    queryFn: async () => {
      const res = await fetch(`/api/reports${qs ? `?${qs}` : ''}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? 'Failed to load reports')
      }
      return res.json()
    },
    staleTime: 60_000,
  })
}
