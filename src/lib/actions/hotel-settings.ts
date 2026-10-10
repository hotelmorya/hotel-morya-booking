'use server'

import { revalidatePath } from 'next/cache'

import { ADMIN_PLUS, getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  hotelSettingsSchema,
  hotelSettingsUpdateSchema,
  type HotelSettingsUpdate,
} from '@/schemas/hotel-settings'

export type SaveSettingsResult =
  | { success: true }
  | { success: false; error: string }

// Accepts a partial payload: each settings tab sends only the fields it edits.
// An existing row is merge-updated (only the provided keys change); the very
// first save must include all required fields to satisfy the insert.
export async function saveHotelSettings(
  raw: HotelSettingsUpdate
): Promise<SaveSettingsResult> {
  const profile = await getCurrentProfile()
  if (!profile || !ADMIN_PLUS.includes(profile.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('hotel_settings')
    .select('id')
    .maybeSingle()

  if (existing?.id) {
    // Partial update — validate only the provided keys, change only those.
    const parsed = hotelSettingsUpdateSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Validation failed',
      }
    }
    const cleanPayload = Object.fromEntries(
      Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v])
    )
    const { error } = await supabase
      .from('hotel_settings')
      .update({ ...cleanPayload, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    // No row yet — need the full required set (Hotel info tab).
    const parsed = hotelSettingsSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: 'Please complete the Hotel info tab first.' }
    }
    const cleanPayload = Object.fromEntries(
      Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v])
    )
    const { error } = await supabase.from('hotel_settings').insert(cleanPayload)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/admin/settings', 'layout')
  return { success: true }
}
