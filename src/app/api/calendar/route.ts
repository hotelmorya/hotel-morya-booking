import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile, OPERATIONAL } from '@/lib/auth'
import { currentDateIST } from '@/lib/format'

type RoomTypeName = { en: string; mr?: string; hi?: string }

function getMonthWindow(dateStr: string): { from: string; to: string } {
  const [y, m] = dateStr.split('-').map(Number)
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

export async function GET(request: NextRequest) {
  // 1. Auth
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    )
  }
  const profile = await getCurrentProfile()
  if (!profile || !OPERATIONAL.includes(profile.role)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 },
    )
  }

  // 2. Parse params
  const url = request.nextUrl
  const today = currentDateIST()
  const defaultWindow = getMonthWindow(today)
  const from = url.searchParams.get('from') ?? defaultWindow.from
  const to = url.searchParams.get('to') ?? defaultWindow.to

  // 3. Room types + rooms
  const { data: roomTypesRaw, error: rtError } = await supabase
    .from('room_types')
    .select('id, name, rooms(id, room_number, floor, status, deleted_at)')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (rtError) {
    return Response.json(
      { error: { code: 'DB_ERROR', message: rtError.message } },
      { status: 500 },
    )
  }

  const roomTypes = (roomTypesRaw ?? []).map((rt) => {
    const nameObj = (
      typeof rt.name === 'object' && rt.name !== null ? rt.name : { en: String(rt.name) }
    ) as RoomTypeName
    return {
      id: rt.id as string,
      name: nameObj.en,
      rooms: (
        (
          rt.rooms as Array<{
            id: string
            room_number: string
            floor: number
            status: string
            deleted_at: string | null
          }>
        ) ?? []
      )
        .filter((r) => !r.deleted_at)
        .map((r) => ({ id: r.id, room_number: r.room_number, floor: r.floor })),
    }
  })

  // 4. Bookings overlapping window
  // Overlap: check_in < to AND check_out > from
  const { data: bookingsRaw, error: bError } = await supabase
    .from('bookings')
    .select(
      'id, booking_ref, check_in, check_out, status, stay_type, guests(fullname), booking_rooms(id, room_id, room_type_id)',
    )
    .is('deleted_at', null)
    .not('status', 'in', '(cancelled,not_arrived)')
    .lt('check_in', to)
    .gt('check_out', from)

  if (bError) {
    return Response.json(
      { error: { code: 'DB_ERROR', message: bError.message } },
      { status: 500 },
    )
  }

  // Flatten: one entry per booking_room
  const bookings: Array<{
    booking_id: string
    booking_ref: string
    room_id: string | null
    room_type_id: string
    guest_name: string
    check_in: string
    check_out: string
    status: string
    stay_type: string
  }> = []

  for (const b of bookingsRaw ?? []) {
    const guestName =
      (b.guests as unknown as { fullname: string } | null)?.fullname ?? 'Guest'
    const rooms = (
      b.booking_rooms as Array<{ id: string; room_id: string | null; room_type_id: string }>
    ) ?? []
    if (rooms.length === 0) continue
    for (const br of rooms) {
      bookings.push({
        booking_id: b.id as string,
        booking_ref: b.booking_ref as string,
        room_id: br.room_id,
        room_type_id: br.room_type_id,
        guest_name: guestName,
        check_in: b.check_in as string,
        check_out: b.check_out as string,
        status: b.status as string,
        stay_type: (b.stay_type as string) ?? 'overnight',
      })
    }
  }

  // 5. Active holds overlapping window
  const { data: holdsRaw, error: hError } = await supabase
    .from('booking_holds')
    .select('id, room_type_id, check_in, check_out, expires_at')
    .gt('expires_at', new Date().toISOString())
    .lt('check_in', to)
    .gt('check_out', from)

  if (hError) {
    return Response.json(
      { error: { code: 'DB_ERROR', message: hError.message } },
      { status: 500 },
    )
  }

  const holds = (holdsRaw ?? []).map((h) => ({
    id: h.id as string,
    room_type_id: h.room_type_id as string,
    check_in: h.check_in as string,
    check_out: h.check_out as string,
    expires_at: h.expires_at as string,
  }))

  return Response.json({
    data: {
      roomTypes,
      bookings,
      holds,
      window: { from, to },
    },
  })
}
