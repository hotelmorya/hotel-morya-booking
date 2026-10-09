'use client'

import { Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'

// Print / save-as-PDF trigger for server-rendered printable pages (e.g. booking
// receipts). Admin is English-only, so the label is inline (no i18n).
export function PrintButton({ label = 'Print / Save PDF' }: { label?: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="no-print"
    >
      <Printer className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  )
}
