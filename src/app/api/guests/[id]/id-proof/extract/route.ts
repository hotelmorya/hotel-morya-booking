import { createWorker } from 'tesseract.js'

import { OPERATIONAL, getCurrentProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { extractIdDetails } from '@/lib/ocr/id-inference'

// Tesseract needs the Node runtime; the first cold call fetches its wasm core +
// eng.traineddata from CDN (a few seconds) — warm calls are fast.
export const runtime = 'nodejs'
export const maxDuration = 60

type RouteContext = { params: Promise<{ id: string }> }

const BUCKET = 'id-proofs'

// ── POST /api/guests/[id]/id-proof/extract ────────────────────────────────────
// Read-only OCR draft. Runs Tesseract.js server-side (no egress), reads the
// guest's stored ID image, and returns best-effort { id_type, id_number, fullname }.
// Never writes the DB, never logs/persists the extracted number, no activity log.
export async function POST(_request: Request, ctx: RouteContext) {
  try {
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

    const path = guest.id_proof_url
    if (!path) {
      return Response.json(
        { error: { code: 'NO_ID_IMAGE', message: 'Upload an ID image before scanning' } },
        { status: 400 }
      )
    }

    if (path.toLowerCase().endsWith('.pdf')) {
      return Response.json(
        {
          error: {
            code: 'OCR_IMAGE_ONLY',
            message: 'OCR supports image uploads only; enter manually',
          },
        },
        { status: 422 }
      )
    }

    const admin = createAdminClient()
    const { data: blob, error: downloadError } = await admin.storage
      .from(BUCKET)
      .download(path)

    if (downloadError || !blob) {
      return Response.json(
        { error: { code: 'INTERNAL', message: downloadError?.message ?? 'Could not read image' } },
        { status: 500 }
      )
    }

    const buffer = Buffer.from(await blob.arrayBuffer())

    const worker = await createWorker('eng')
    let text = ''
    try {
      const { data } = await worker.recognize(buffer)
      text = data.text ?? ''
    } finally {
      await worker.terminate().catch(() => {})
    }

    const extracted = extractIdDetails(text)

    return Response.json({
      data: extracted,
    })
  } catch (err) {
    console.error('[id-proof/extract route error]:', err)
    return Response.json(
      {
        error: {
          code: 'OCR_FAILED',
          message:
            err instanceof Error
              ? err.message
              : 'Could not scan ID automatically. Please enter details manually.',
        },
      },
      { status: 500 }
    )
  }
}
