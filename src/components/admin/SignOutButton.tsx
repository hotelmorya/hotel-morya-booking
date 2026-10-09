'use client'

import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/auth/login')
    router.refresh()
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleSignOut}
      className="h-9 border-border text-text-primary hover:bg-surface-2"
    >
      Sign out
    </Button>
  )
}
