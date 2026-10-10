import { type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { updateSession } from '@/lib/supabase/middleware'
import { defaultLocale, locales } from '@/lib/i18n'

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
})

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin + auth routes are English-only and session-gated — never localized.
  if (pathname.startsWith('/admin') || pathname.startsWith('/auth')) {
    return await updateSession(request)
  }

  // Public site: locale-prefixed routing (/ → /en, /mr, etc.).
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|manifest|api/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html|txt|xml|json|webmanifest)$).*)',
  ],
}
