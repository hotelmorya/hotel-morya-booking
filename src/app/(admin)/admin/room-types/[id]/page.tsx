import { IconChevronLeft } from '@tabler/icons-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { RoomTypeForm } from '@/components/admin/rooms/RoomTypeForm'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Edit room type',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditRoomTypePage({ params }: Props) {
  const { id } = await params

  const profile = await getCurrentProfile()
  if (!profile) redirect('/auth/login')

  const supabase = await createClient()

  // Resolve the internal users.id.
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

  // Fetch the room type.
  const { data: roomType, error } = await supabase
    .from('room_types')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !roomType) notFound()

  // Fetch photos for this room type.
  const { data: photos } = await supabase
    .from('room_photos')
    .select('*')
    .eq('room_type_id', id)
    .order('sort_order')
    .order('created_at')

  function getRoomTypeName(name: unknown): string {
    if (!name) return 'Untitled'
    if (typeof name === 'string') return name
    const n = name as Record<string, string>
    return n.en ?? Object.values(n)[0] ?? 'Untitled'
  }

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
        {getRoomTypeName(roomType.name)}
      </h1>

      <RoomTypeForm
        initialData={roomType}
        initialPhotos={photos ?? []}
        userId={userId}
      />
    </div>
  )
}
