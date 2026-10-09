import type { UserRole } from '@/types/database'

// Pure role groups — safe to import from client components (no server-only deps).
// `lib/auth.ts` re-exports these alongside the server-only getCurrentProfile().
export const MANAGER_PLUS: UserRole[] = ['super_admin', 'admin', 'manager']
export const ADMIN_PLUS: UserRole[] = ['super_admin', 'admin']
export const OPERATIONAL: UserRole[] = [
  'super_admin',
  'admin',
  'manager',
  'receptionist',
]
