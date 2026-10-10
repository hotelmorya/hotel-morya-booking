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

export interface VerifyTurnstileOptions {
  action?: string
  remoteip?: string
  expectedHostnames?: string[]
}

/**
 * Verify a Turnstile token server-side per Cloudflare canonical specifications.
 *
 * Posts to the Cloudflare siteverify endpoint with the secret key and the
 * token produced by the client widget. Returns true if Cloudflare confirms
 * the challenge was solved, false otherwise (including network errors).
 *
 * Checks:
 *   1. Token format & length (<= 2048 chars)
 *   2. Response success === true
 *   3. Action matching (if action specified)
 *   4. Hostname validation against allowed deployment hostnames
 *
 * Fail-safe: if secret key is absent, throws TurnstileConfigError.
 * Callers should catch it and return 503 (misconfiguration), not 403 (user error).
 *
 * @throws TurnstileConfigError if the secret key env var is missing
 */
export async function verifyTurnstileToken(
  token: string,
  options?: VerifyTurnstileOptions
): Promise<boolean> {
  const secretKey =
    process.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET

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

  // Basic format defense per Cloudflare guidelines
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return false
  }

  try {
    const body = new URLSearchParams()
    body.append('secret', secretKey)
    body.append('response', token)
    if (options?.remoteip) {
      body.append('remoteip', options.remoteip)
    }

    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(10_000),
        body: body.toString(),
      },
    )

    if (!res.ok) {
      console.error(`[turnstile] siteverify HTTP error: ${res.status}`)
      return false
    }

    const json = (await res.json()) as {
      success: boolean
      action?: string
      hostname?: string
      'error-codes'?: string[]
    }

    if (!json.success) {
      console.warn('[turnstile] verification failed:', json['error-codes'])
      return false
    }

    // Action validation: verify token was created for the expected user action
    if (options?.action && json.action && json.action !== options.action) {
      console.warn(
        `[turnstile] action mismatch: expected "${options.action}", got "${json.action}"`
      )
      return false
    }

    // Hostname validation: prevent cross-site token reuse
    const configuredHostnames = (process.env.TURNSTILE_HOSTNAMES ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean)

    const allowedHostnames = new Set<string>(
      configuredHostnames.length > 0
        ? configuredHostnames
        : [
            'hotelmoryaadmapur.in',
            'www.hotelmoryaadmapur.in',
            'hotel-morya-booking.vercel.app',
            ...(process.env.NODE_ENV !== 'production'
              ? ['localhost', '127.0.0.1']
              : []),
          ]
    )

    if (json.hostname && !allowedHostnames.has(json.hostname.toLowerCase())) {
      console.warn(
        `[turnstile] hostname mismatch: unexpected origin "${json.hostname}"`
      )
      return false
    }

    return true
  } catch (err) {
    console.error('[turnstile] siteverify network error:', err)
    return false
  }
}
