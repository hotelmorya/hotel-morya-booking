import { OPERATIONAL, getCurrentProfile } from '@/lib/auth'
import { recordActivity } from '@/lib/activity-log/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { guestSchema } from '@/schemas/guest'

// Escape PostgREST metacharacters in ilike patterns.
function escapeIlike(s: string): string {
  return s.replace(/[(),*\\%_]/g, '\\$&')
}

// GET /api/guests
//
// Typeahead mode: ?search=<query> (no ?page). Returns up to 10 matches.
//   Requires search >= 2 chars (existing behaviour unchanged).
//
// List mode: ?page=<n> (or no params). Returns paginated 25/page with full
//   directory columns. Also supports ?search=<query> for filtering.
export async function GET(request: Request) {
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

  const url = new URL(request.url)
  const search = (url.searchParams.get('search') ?? '').trim()
  const pageParam = url.searchParams.get('page')

  // ── Typeahead mode ────────────────────────────────────────────────────────
  if (!pageParam && search.length >= 2) {
    const { data, error } = await supabase
      .from('guests')
      .select('id, fullname, phone, email, city, total_stays, tags')
      .is('deleted_at', null)
      .or(`fullname.ilike.%${search}%,phone.ilike.%${search}%`)
      .order('last_stayed_at', { ascending: false, nullsFirst: false })
      .limit(10)

    if (error) {
      return Response.json(
        { error: { code: 'INTERNAL', message: error.message } },
        { status: 500 }
      )
    }
    return Response.json({ data, meta: { total: data?.length ?? 0 } })
  }

  // Guard: typeahead with too-short query (no page param, short/empty search)
  if (!pageParam) {
    return Response.json({ data: [], meta: { total: 0 } })
  }

  // ── List mode ─────────────────────────────────────────────────────────────
  const PAGE_SIZE = 25
  const page = Math.max(1, parseInt(pageParam, 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('guests')
    .select(
      'id, fullname, phone, email, city, total_stays, lifetime_value, last_stayed_at, tags, created_at, id_type, id_proof_url',
      { count: 'exact' }
    )
    .is('deleted_at', null)

  if (search.length >= 2) {
    const safe = escapeIlike(search)
    query = query.or(`fullname.ilike.%${safe}%,phone.ilike.%${safe}%`)
  }

  const { data, error, count } = await query
    .order('last_stayed_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    return Response.json(
      { error: { code: 'INTERNAL', message: error.message } },
      { status: 500 }
    )
  }

  return Response.json({
    data,
    meta: { total: count ?? 0, page, pageSize: PAGE_SIZE },
  })
}

// POST /api/guests — quick-create a guest from the walk-in form.
export async function POST(request: Request) {
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

  const parsed = guestSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: parsed.error.issues,
        },
      },
      { status: 400 }
    )
  }

  // Phone is unique — return the existing guest instead of erroring on a dup.
  const { data: existing } = await supabase
    .from('guests')
    .select('id, fullname, phone, email, city, total_stays, tags, updated_at')
    .eq('phone', parsed.data.phone)
    .is('deleted_at', null)
    .maybeSingle()
  if (existing) {
    return Response.json({ data: existing, meta: { existing: true } }, { status: 200 })
  }

  const payload = {
    ...parsed.data,
    email: parsed.data.email || null,
  }
  const { data, error } = await supabase
    .from('guests')
    .insert(payload)
    .select('id, fullname, phone, email, city, total_stays, tags, updated_at')
    .single()
  if (error) {
    return Response.json(
      { error: { code: 'INTERNAL', message: error.message } },
      { status: 500 }
    )
  }

  const adminClient = createAdminClient()
  await recordActivity(adminClient, {
    action: 'guest.created',
    entity_type: 'guest',
    entity_id: data.id,
    actor: profile,
    metadata: { fullname: data.fullname },
  })

  return Response.json({ data }, { status: 201 })
}
