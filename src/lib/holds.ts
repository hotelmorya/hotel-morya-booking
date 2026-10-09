// Booking holds — server-only helpers.
// Holds are 5-minute soft locks during the public booking flow.
// Lazy expiry: rows are never auto-deleted; queries always filter expires_at > now().
//
// RLS allows public INSERT + SELECT + DELETE on booking_holds (§6, schema.sql).
// This file does NOT require auth — called from public API routes.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any

export interface CreateHoldParams {
  supabase: AnySupabaseClient
  roomTypeId: string
  checkIn: string    // YYYY-MM-DD
  checkOut: string   // YYYY-MM-DD
  sessionId: string  // client-generated session identifier (UUID or nanoid)
  quantity?: number  // default 1; creates this many hold rows
}

export interface HoldRow {
  id: string
  room_type_id: string
  check_in: string
  check_out: string
  session_id: string
  expires_at: string
  created_at: string
}

/**
 * Insert `quantity` hold rows for a session.
 * Returns the created hold rows. The caller should have already verified
 * availability before calling this (availability route re-checks on create).
 */
export async function createHolds({
  supabase,
  roomTypeId,
  checkIn,
  checkOut,
  sessionId,
  quantity = 1,
}: CreateHoldParams): Promise<HoldRow[]> {
  const rows = Array.from({ length: quantity }, () => ({
    room_type_id: roomTypeId,
    check_in: checkIn,
    check_out: checkOut,
    session_id: sessionId,
    // expires_at defaults to now()+5min in the DB — do not pass it here so the
    // DB sets it atomically. We re-select after insert.
  }))

  const { data, error } = await supabase
    .from('booking_holds')
    .insert(rows)
    .select('id, room_type_id, check_in, check_out, session_id, expires_at, created_at')

  if (error) throw new Error(`hold insert failed: ${error.message}`)
  return (data ?? []) as HoldRow[]
}

/**
 * Release all active holds for a session (DELETE).
 * Returns the count of rows deleted.
 */
export async function releaseHolds(
  supabase: AnySupabaseClient,
  sessionId: string
): Promise<number> {
  const { error, count } = await supabase
    .from('booking_holds')
    .delete({ count: 'exact' })
    .eq('session_id', sessionId)

  if (error) throw new Error(`hold release failed: ${error.message}`)
  return count ?? 0
}

/**
 * Fetch all active (non-expired) holds for a session.
 */
export async function getActiveHolds(
  supabase: AnySupabaseClient,
  sessionId: string
): Promise<HoldRow[]> {
  const { data, error } = await supabase
    .from('booking_holds')
    .select('id, room_type_id, check_in, check_out, session_id, expires_at, created_at')
    .eq('session_id', sessionId)
    .gt('expires_at', new Date().toISOString())

  if (error) throw new Error(`holds fetch failed: ${error.message}`)
  return (data ?? []) as HoldRow[]
}
