import { RoomStatusGrid } from '@/components/admin/rooms/RoomStatusGrid'

export const metadata = {
  title: 'Rooms',
}

export default function RoomsPage() {
  return (
    <div className="space-y-5">
      <RoomStatusGrid />
    </div>
  )
}
