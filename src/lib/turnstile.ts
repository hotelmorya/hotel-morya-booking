/**
 * Cloudflare Turnstile — server-side token verification helper.
 *
 * This is a server-only module. It must never be imported from client components.
 * The TURNSTILE_SECRET_KEY is read lazily (at call time) so importing this module
 * during the build (when env is unset) does not crash the build (lazy-read pattern).
 *
 * Turnstile docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

// ── Config error ──────────────────────────────────────────────────────────────

export class TurnstileConfigError extends Error {
  constructor() {
    super('Turnstile not configured: TURNSTILE_SECRET_KEY is missing')
    this.name = 'TurnstileConfigError'
  }
}

// Sentinel token the client widget emits when NEXT_PUBLIC_TURNSTILE_SITE_KEY is
// absent (local dev / CI without keys). See components/public/booking/TurnstileWidget.tsx.
// The server accepts it ONLY outside production (see verifyTurnstileToken).
const DEV_BYPASS_TOKEN = 'dev-bypass'

// ── Server verify ─────────────────────────────────────────────────────────────

/**
 * Verify a Turnstile token server-side.
 *
 * Posts to the Cloudflare siteverify endpoint with the secret key and the
 * token produced by the client widget. Returns true if Cloudflare confirms
 * the challenge was solved, false otherwise (including network errors).
 *
 * Fail-safe: if TURNSTILE_SECRET_KEY is absent, throws TurnstileConfigError.
 * Callers should catch it and return 503 (misconfiguration), not 403 (user error).
 *
 * @throws TurnstileConfigError if the secret key env var is missing
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  if (!secretKey) {
    // Local dev / CI without Turnstile keys: the client widget emits the
    // 'dev-bypass' sentinel, so accept it and skip verification — but ONLY
    // outside production. In production a missing secret is a real
    // misconfiguration and must fail loudly (→ 503) so bots are never let
    // through unverified.
    if (process.env.NODE_ENV !== 'production' && token === DEV_BYPASS_TOKEN) {
      return true
    }
    throw new TurnstileConfigError()
  }

  try {
    const body = new URLSearchParams()
    body.append('secret', secretKey)
    body.append('response', token)

    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
    )

    if (!res.ok) {
      console.error(`[turnstile] siteverify HTTP error: ${res.status}`)
      return false
    }

    const json = (await res.json()) as { success: boolean }
    return json.success === true
  } catch (err) {
    console.error('[turnstile] siteverify network error:', err)
    return false
  }
}
