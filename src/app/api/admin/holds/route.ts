// DELETE /api/admin/holds — staff release of active booking holds.
//
// Lets reception/admin clear a stuck "online booking in progress" hold from the
// dashboard instead of waiting out the 5-minute lazy expiry (e.g. a guest who
// abandoned the flow but is still holding the only room). Deletes the specific
// hold rows by id (the dashboard groups holds by type+dates and passes every row
// id in the group). Uses the admin (service-role) client so the delete is
// reliable regardless of RLS, gated behind an authenticated operational role.

import { z } from 'zod'
import { OPERATIONAL, getCurrentProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const releaseHoldsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one hold id is required'),
})

export async function DELETE(request: Request) {
  // 1. Authenticate
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }
  const profile = await getCurrentProfile()
  if (!profile || !OPERATIONAL.includes(profile.role)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 }
    )
  }

  // 2. Validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: { code: 'BAD_REQUEST', message: 'Request body must be valid JSON' } },
      { status: 400 }
    )
  }
  const parsed = releaseHoldsSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.issues,
        },
      },
      { status: 400 }
    )
  }

  // 3. Delete the hold rows (hard delete — booking_holds is a transient table
  //    with no soft-delete columns; lazy expiry already removes them logically).
  const admin = createAdminClient()
  const { data, error, count } = await admin
    .from('booking_holds')
    .delete({ count: 'exact' })
    .in('id', parsed.data.ids)
    .select('id')

  if (error) {
    return Response.json(
      { error: { code: 'INTERNAL', message: error.message } },
      { status: 500 }
    )
  }

  const released = count ?? data?.length ?? 0

  // No activity_log entry: its entity_type CHECK doesn't cover holds, and holds
  // are a transient table (lazy 5-min expiry) that nothing else audits — adding a
  // hold to the audit enum isn't worth a migration for a routine staff release.

  return Response.json({ data: { released } })
}
