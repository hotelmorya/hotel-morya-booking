import { OPERATIONAL, getCurrentProfile } from '@/lib/auth'
import { recordActivity } from '@/lib/activity-log/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

const BUCKET = 'id-proofs'
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

// ── POST /api/guests/[id]/id-proof ────────────────────────────────────────────
// Upload an ID proof for a guest. Accepts multipart/form-data with field "file".
// Stores in the private "id-proofs" Supabase Storage bucket (RLS-protected).
export async function POST(request: Request, ctx: RouteContext) {
  const { id } = await ctx.params
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

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Expected multipart/form-data' } },
      { status: 400 }
    )
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No file provided' } },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'File must be smaller than 5 MB' } },
      { status: 400 }
    )
  }

  const isAllowedType =
    file.type.startsWith('image/') || file.type === 'application/pdf'
  if (!isAllowedType) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Only images (jpg, png, webp) and PDF files are accepted',
        },
      },
      { status: 400 }
    )
  }

  const path = `${id}/${Date.now()}-${file.name}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    const isMissingBucket =
      uploadError.message.toLowerCase().includes('bucket not found') ||
      uploadError.message.toLowerCase().includes('does not exist')

    if (isMissingBucket) {
      return Response.json(
        {
          error: {
            code: 'BUCKET_NOT_FOUND',
            message:
              'The id-proofs storage bucket has not been created yet. Please ask your administrator to create it in Supabase Storage.',
          },
        },
        { status: 503 }
      )
    }

    return Response.json(
      { error: { code: 'INTERNAL', message: uploadError.message } },
      { status: 500 }
    )
  }

  // Save the storage path on the guest row (path only, not a full URL).
  const { error: updateError } = await supabase
    .from('guests')
    .update({ id_proof_url: path })
    .eq('id', id)
    .is('deleted_at', null)

  if (updateError) {
    return Response.json(
      { error: { code: 'INTERNAL', message: updateError.message } },
      { status: 500 }
    )
  }

  const adminClient = createAdminClient()
  await recordActivity(adminClient, {
    action: 'guest.id_proof_uploaded',
    entity_type: 'guest',
    entity_id: id,
    actor: profile,
  })

  return Response.json({ data: { path } }, { status: 201 })
}

// ── GET /api/guests/[id]/id-proof ─────────────────────────────────────────────
// Generate a 1-hour signed URL for the guest's ID proof.
export async function GET(_request: Request, ctx: RouteContext) {
  const { id } = await ctx.params
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

  const { data: guest, error: guestError } = await supabase
    .from('guests')
    .select('id_proof_url')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (guestError || !guest) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Guest not found' } },
      { status: 404 }
    )
  }

  if (!guest.id_proof_url) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'No ID proof on file for this guest' } },
      { status: 404 }
    )
  }

  const EXPIRY_SECONDS = 3600 // 1 hour
  const { data: signedData, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(guest.id_proof_url, EXPIRY_SECONDS)

  if (signError || !signedData) {
    return Response.json(
      { error: { code: 'INTERNAL', message: signError?.message ?? 'Could not sign URL' } },
      { status: 500 }
    )
  }

  const expiresAt = new Date(Date.now() + EXPIRY_SECONDS * 1000).toISOString()

  return Response.json({ data: { signedUrl: signedData.signedUrl, expiresAt } })
}
