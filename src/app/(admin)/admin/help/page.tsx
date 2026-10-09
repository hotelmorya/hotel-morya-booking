import type { Metadata } from 'next'
import { HelpContent } from '@/components/admin/help/HelpContent'

export const metadata: Metadata = {
  title: 'Help',
}

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <HelpContent />
    </div>
  )
}
