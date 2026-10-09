import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Next.js 16 proxy convention
// Gated admin routes and refreshes Supabase auth cookies
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') || pathname.startsWith('/auth')) {
    return await updateSession(request)
  }

  return undefined
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/auth/:path*',
  ],
}
