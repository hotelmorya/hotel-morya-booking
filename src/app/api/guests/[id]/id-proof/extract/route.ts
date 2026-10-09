import { createWorker } from 'tesseract.js'

import { OPERATIONAL, getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { idProofTypeSchema } from '@/schemas/guest'

// Tesseract needs the Node runtime; the first cold call fetches its wasm core +
// eng.traineddata from CDN (a few seconds) — warm calls are fast.
export const runtime = 'nodejs'
export const maxDuration = 60

type RouteContext = { params: Promise<{ id: string }> }

const BUCKET = 'id-proofs'

type IdProofType = (typeof idProofTypeSchema.options)[number]

// ── OCR inference helpers ─────────────────────────────────────────────────────

const ID_KEYWORDS = [
  'AADHAAR',
  'UIDAI',
  'PERMANENT ACCOUNT',
  'INCOME TAX',
  'PASSPORT',
  'REPUBLIC OF INDIA',
  'DRIVING LICENCE',
  'DRIVING LICENSE',
  'DL NO',
  'GOVERNMENT OF INDIA',
]

function inferIdNumber(upper: string): { id_number: string | null; matched: IdProofType | null } {
  // PAN — ABCDE1234F
  const pan = upper.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/)
  if (pan) return { id_number: pan[0], matched: 'pan' }

  // Aadhaar — 12 digits (often grouped 4-4-4)
  const aadhaar = upper.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/)
  if (aadhaar) return { id_number: aadhaar[0].replace(/\s/g, ''), matched: 'aadhaar' }

  // Passport — one letter + 7 digits
  const passport = upper.match(/\b[A-Z][0-9]{7}\b/)
  if (passport) return { id_number: passport[0], matched: 'passport' }

  // Driving licence — best-effort: state code letters + digits (e.g. MH12 20110012345)
  const dl = upper.match(/\b[A-Z]{2}[-\s]?\d{2}[-\s]?\d{4,11}\b/)
  if (dl) return { id_number: dl[0].replace(/[-\s]/g, ' ').trim(), matched: 'driving_license' }

  return { id_number: null, matched: null }
}

function inferIdType(upper: string, matched: IdProofType | null): IdProofType | null {
  // Keyword signals take precedence, then fall back to the matched-pattern type.
  if (upper.includes('PERMANENT ACCOUNT') || upper.includes('INCOME TAX')) return 'pan'
  if (upper.includes('AADHAAR') || upper.includes('UIDAI')) return 'aadhaar'
  if (upper.includes('PASSPORT') || upper.includes('REPUBLIC OF INDIA')) return 'passport'
  if (
    upper.includes('DRIVING LICENCE') ||
    upper.includes('DRIVING LICENSE') ||
    upper.includes('DL NO')
  ) {
    return 'driving_license'
  }

  const candidate = matched
  return candidate && idProofTypeSchema.options.includes(candidate) ? candidate : null
}

// Card chrome to never treat as a name (header/labels/address words). Used only
// for name filtering — kept separate from ID_KEYWORDS (which drives id_type).
const NAME_CHROME = [
  ...ID_KEYWORDS,
  'AUTHORITY',
  'UNIQUE IDENTIFICATION',
  'IDENTIFICATION',
  'ENROL', // ENROLMENT / ENROLLMENT / ENROLLED
  'YEAR OF BIRTH',
  'DATE OF BIRTH',
  'DOB',
  'MALE',
  'FEMALE',
  'ADDRESS',
  'SOCIETY',
  'ROAD',
  'NAGAR',
  'STREET',
  'DISTRICT',
  'STATE',
  'INDIA',
  'GOVERNMENT',
  'HELP',
  'WWW',
  'GOV',
  'PHONE',
  'EMAIL',
  'MOBILE',
  'DETAILS',
  'ISSUE',
  ' VID',
]

/** A real name line is 2-4 words, 6-40 chars, letters only, and case-consistent
 *  (all Title-case like Aadhaar "Pravin Jaywant Bagde", OR all-UPPER like PAN
 *  "PRAVIN JAYWANT BAGDE"). Mixed-case junk like "Por ATTY" is rejected. */
function looksLikeName(raw: string): string | null {
  const line = raw.replace(/\s+/g, ' ').trim()
  if (!line || line.length < 6 || line.length > 40) return null
  if (/\d/.test(line)) return null
  if (NAME_CHROME.some((kw) => line.toUpperCase().includes(kw))) return null
  const words = line.split(' ').filter(Boolean)
  if (words.length < 2 || words.length > 4) return null
  // Each word: 2+ chars, letters (allow apostrophe/dot/hyphen inside).
  if (!words.every((w) => /^[A-Za-z][A-Za-z'.-]+$/.test(w))) return null
  const allTitle = words.every((w) => /^[A-Z][a-z'.-]*$/.test(w))
  const allUpper = words.every((w) => /^[A-Z'.-]+$/.test(w))
  if (!allTitle && !allUpper) return null
  return line
}

function inferFullname(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  // 1. Name printed right after a "To" line (Aadhaar e-letter) — skip a possible
  //    Devanagari line and take the first English name-shaped line below it.
  const toIdx = lines.findIndex((l) => /^to\b[,.]?\s*$/i.test(l) || /^to[,.]\s*\S/i.test(l))
  if (toIdx !== -1) {
    for (const l of lines.slice(toIdx + 1, toIdx + 4)) {
      const c = looksLikeName(l)
      if (c) return c
    }
  }

  // 2. Name printed right above a "Year of Birth / DOB" line (Aadhaar card face).
  const dobIdx = lines.findIndex((l) => /year of birth|date of birth|जन्म|\bDOB\b/i.test(l))
  if (dobIdx > 0) {
    for (const l of lines.slice(Math.max(0, dobIdx - 3), dobIdx).reverse()) {
      const c = looksLikeName(l)
      if (c) return c
    }
  }

  // 3. Explicit "Name" label (same line or the next line).
  const labelIdx = lines.findIndex((l) => /(^|\s)(name|नाम|नाव)\b/i.test(l))
  if (labelIdx !== -1) {
    const sameLine = lines[labelIdx].replace(/^.*?(name|नाम|नाव)\s*[:\-]?\s*/i, '')
    const c = looksLikeName(sameLine) ?? looksLikeName(lines[labelIdx + 1] ?? '')
    if (c) return c
  }

  // 4. Fallback: first confident name-shaped line anywhere.
  for (const l of lines) {
    const c = looksLikeName(l)
    if (c) return c
  }
  return null
}

// ── POST /api/guests/[id]/id-proof/extract ────────────────────────────────────
// Read-only OCR draft. Runs Tesseract.js server-side (no egress), reads the
// guest's stored ID image, and returns best-effort { id_type, id_number, fullname }.
// Never writes the DB, never logs/persists the extracted number, no activity log.
export async function POST(_request: Request, ctx: RouteContext) {
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

  const { data: blob, error: downloadError } = await supabase.storage
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
    await worker.terminate()
  }

  const upper = text.toUpperCase()
  const { id_number, matched } = inferIdNumber(upper)
  const id_type = inferIdType(upper, matched)
  const fullname = inferFullname(text)

  return Response.json({
    data: {
      id_type,
      id_number,
      fullname,
    },
  })
}
