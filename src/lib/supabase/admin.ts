import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS entirely.
// Use ONLY for:
//   - activity_log inserts (append-only, no user context)
//   - soft-delete UPDATEs (row becomes invisible to RLS client after update)
//   - auth.admin operations (create/delete auth users)
//   - webhook / cron handlers acting outside a user session
// NEVER import this into client components or expose to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
