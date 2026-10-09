export const dynamic = 'force-dynamic'

import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = request.headers.get('authorization') ?? ''
  const xCronHeader = request.headers.get('x-cron-secret') ?? ''
  const candidate = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : xCronHeader
  if (!candidate) return false
  try {
    const a = Buffer.from(secret, 'utf8')
    const b = Buffer.from(candidate, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!verifyCronSecret(request)) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } },
      { status: 401 }
    )
  }

  const supabase = createAdminClient()
  await supabase.from('rooms').select('id').limit(1)

  // Sweep expired cleaning locks — DELETE WHERE auto_release_at < now().
  // Uses admin client so it deletes across ALL housekeepers (not RLS-scoped).
  // Fire-and-forget: a failed sweep is logged but never changes the 200 response.
  let sweptLocks = 0
  try {
    const { count, error: sweepError } = await supabase
      .from('cleaning_locks')
      .delete({ count: 'exact' })
      .lt('auto_release_at', new Date().toISOString())
    if (sweepError) {
      console.error('[keepalive] cleaning_locks sweep error:', sweepError.message)
    } else {
      sweptLocks = count ?? 0
    }
  } catch (err) {
    console.error('[keepalive] cleaning_locks sweep threw:', err)
  }

  return Response.json({ data: { ok: true, swept_locks: sweptLocks } }, { status: 200 })
}

export const POST = GET
