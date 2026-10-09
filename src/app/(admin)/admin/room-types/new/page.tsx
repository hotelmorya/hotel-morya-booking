import { IconChevronLeft } from '@tabler/icons-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { RoomTypeForm } from '@/components/admin/rooms/RoomTypeForm'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'New room type',
}

export default async function NewRoomTypePage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/auth/login')

  // Resolve the internal users.id (profile.id comes from getCurrentProfile which
  // already queries the users table — but it only selects id, fullname, role, is_active).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const userId = userRow?.id ?? ''

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/admin/room-types"
          className="flex items-center gap-1 text-small text-text-tertiary hover:text-text-primary"
        >
          <IconChevronLeft size={14} />
          Room types
        </Link>
      </div>

      <h1 className="text-section font-semibold text-text-primary">
        New room type
      </h1>

      <RoomTypeForm userId={userId} />
    </div>
  )
}
