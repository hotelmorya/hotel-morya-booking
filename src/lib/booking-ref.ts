// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any

/**
 * Next BK-YYYY-NNNN reference for the current IST year.
 *
 * Allocation is atomic and lives in the database — `public.next_booking_ref()`.
 * This function is a thin wrapper over that RPC and holds no logic of its own,
 * deliberately: the year rollover and the sequence format are stated once, in
 * SQL, next to the counter.
 *
 * It used to be `SELECT max(booking_ref) + 1` here, in a round-trip separate
 * from the INSERT that consumed the result — so two concurrent bookings could
 * read the same maximum and compute the same reference, and one of them lost to
 * the unique constraint. The callers' retry loops exist because of that. They
 * are kept as a backstop but should no longer fire on a reference collision.
 *
 * MUST be called with the service-role client. The RPC's EXECUTE grant is
 * revoked from `anon` and `authenticated`.
 */
export async function nextBookingRef(admin: AnySupabaseClient): Promise<string> {
  const { data, error } = await admin.rpc('next_booking_ref')

  // Fail loudly. Falling back to the old max()+1 walk when the RPC is missing
  // would silently restore the race on any deployment whose database has not had
  // the migration applied — which is the deployment least likely to notice.
  if (error) {
    throw new Error(
      `booking reference allocation failed: ${error.message}. ` +
        'Has the race_safe_booking_ref migration been applied to this database?'
    )
  }
  if (typeof data !== 'string' || !data) {
    throw new Error('booking reference allocation returned no reference')
  }

  return data
}
