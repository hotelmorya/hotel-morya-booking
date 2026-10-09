// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any

// Actor shape — resolve this from getCurrentProfile() before calling.
export type ActivityActor = {
  id: string
  fullname: string
  role: string
}

export type ActivityEntry = {
  action: string        // e.g. 'booking.created', 'room.status_changed'
  entity_type: string   // e.g. 'booking', 'room', 'guest', 'payment'
  entity_id?: string    // UUID of the affected row
  actor?: ActivityActor
  metadata?: Record<string, unknown>
}

// Insert an activity_log row using the admin (service-role) client so the
// write is never blocked by RLS. Non-throwing — a failed log write must never
// roll back the primary operation.
export async function recordActivity(
  adminClient: AnySupabaseClient,
  entry: ActivityEntry
): Promise<void> {
  try {
    const { error } = await adminClient.from('activity_log').insert({
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      user_id: entry.actor?.id ?? null,
      metadata: entry.metadata
        ? {
            ...entry.metadata,
            actor_name: entry.actor?.fullname,
            actor_role: entry.actor?.role,
          }
        : null,
    })

    if (error) {
      // Log but do NOT throw — activity log is never load-bearing.
      console.error('[activity-log] write failed:', error.message, entry)
    }
  } catch (e) {
    // A transport-level rejection (network error, aborted fetch) must also never
    // propagate — a failed audit write may not 500 an already-committed mutation.
    console.error('[activity-log] write threw:', e, entry)
  }
}
