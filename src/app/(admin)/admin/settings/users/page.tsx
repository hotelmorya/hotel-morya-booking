import { StaffUsersTable } from '@/components/admin/settings/StaffUsersTable'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export default async function UsersPage() {
  const [supabase, profile] = await Promise.all([
    createClient(),
    getCurrentProfile(),
  ])

  // Fetch staff users — exclude super_admin (HARD RULE)
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .neq('role', 'super_admin')
    .order('created_at', { ascending: true })

  // Email lives in auth.users, not public.users — resolve it via the service-role
  // client (auth.admin) and merge by auth_user_id.
  const admin = createAdminClient()
  const { data: authList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  const emailByAuthId = new Map(
    (authList?.users ?? []).map((u) => [u.id, u.email ?? null])
  )

  const usersWithEmail = (users ?? []).map((u) => ({
    ...u,
    email: u.auth_user_id ? emailByAuthId.get(u.auth_user_id) ?? null : null,
  }))

  return (
    <StaffUsersTable
      users={usersWithEmail}
      currentUserId={profile?.id ?? ''}
    />
  )
}
