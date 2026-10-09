// Safe UUID v4 generator.
//
// `crypto.randomUUID()` only exists in a SECURE CONTEXT (HTTPS or localhost).
// When the app is opened over a plain-http LAN origin (e.g. http://192.168.x.x:3000
// while testing the dev server from a phone), `crypto.randomUUID` is undefined and
// calling it throws — which, at module/render init, aborts React hydration and
// leaves the page non-interactive. Production (HTTPS on Vercel) is unaffected, but
// this helper makes both paths robust.
//
// Prefers crypto.randomUUID, then crypto.getRandomValues (available in non-secure
// contexts), then Math.random as a last resort.
export function uuid(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined

  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }

  if (c && typeof c.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16))
    b[6] = (b[6] & 0x0f) | 0x40 // version 4
    b[8] = (b[8] & 0x3f) | 0x80 // variant 10
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'))
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`
  }

  // Last resort — not cryptographically strong, but never throws.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    const v = ch === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
