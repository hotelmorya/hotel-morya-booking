import type { Metadata } from 'next'
import { ReportsView } from '@/components/admin/reports/ReportsView'

export const metadata: Metadata = {
  title: 'Reports',
}

export default function ReportsPage() {
  return (
    <div className="p-4 sm:p-6">
      <ReportsView />
    </div>
  )
}
