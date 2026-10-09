import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

export type StaffProfile = {
  id: string
  fullname: string
  role: UserRole
  is_active: boolean
}

// Current staff profile for server components inside (admin)/(hk) layouts.
// Returns null when there is no session or no provisioned users row.
export async function getCurrentProfile(): Promise<StaffProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('id, fullname, role, is_active')
    .eq('auth_user_id', user.id)
    .single()

  if (!data || data.is_active === false) return null
  return data as StaffProfile
}

// Re-exported from the client-safe module so server code can keep importing
// role groups from '@/lib/auth' while client components import '@/lib/roles'.
export { MANAGER_PLUS, ADMIN_PLUS, OPERATIONAL } from '@/lib/roles'
