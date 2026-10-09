'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function HkHeader({ fullname }: { fullname: string }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/auth/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-3 flex items-center justify-between">
      <h1 className="font-heading text-section font-medium text-text-primary">
        Housekeeping
      </h1>
      <div className="flex items-center gap-3">
        <span className="text-small text-text-tertiary font-body">{fullname}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          title="Sign out"
          className="h-8 w-8 text-text-tertiary hover:text-text-primary"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
