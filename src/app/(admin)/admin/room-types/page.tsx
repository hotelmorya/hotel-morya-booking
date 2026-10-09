import { IconPlus } from '@tabler/icons-react'
import Link from 'next/link'

import { RoomTypesList } from '@/components/admin/rooms/RoomTypesList'

export const metadata = {
  title: 'Room types',
}

export default function RoomTypesPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-3">
        <Link
          href="/admin/room-types/new"
          className="flex items-center gap-1.5 rounded bg-accent-500 px-4 py-2.5 text-body font-medium text-white hover:bg-accent-700"
        >
          <IconPlus size={16} />
          <span className="hidden sm:inline">New room type</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      <RoomTypesList />
    </div>
  )
}
