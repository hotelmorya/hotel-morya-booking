import { redirect } from 'next/navigation'
import { IconInfoCircle } from '@tabler/icons-react'

import { BaseRatesSection } from '@/components/admin/rates/BaseRatesSection'
import { RateOverridesSection } from '@/components/admin/rates/RateOverridesSection'
import { MANAGER_PLUS, getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function RatesPage() {
  const profile = await getCurrentProfile()
  if (!profile || !MANAGER_PLUS.includes(profile.role)) {
    redirect('/admin')
  }

  const supabase = await createClient()

  const [{ data: roomTypes }, { data: overrides }] = await Promise.all([
    supabase
      .from('room_types')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
    supabase
      .from('rate_overrides')
      .select('*')
      .order('start_date', { ascending: false }),
  ])

  return (
    <div className="space-y-8">
      {/* Snapshot-safe callout */}
      <div className="flex items-start gap-2 rounded border border-border bg-surface-1 px-4 py-3">
        <IconInfoCircle size={16} className="shrink-0 mt-0.5 text-info" />
        <p className="text-small text-text-secondary">
          <strong>Existing bookings are never affected</strong> — the rate is snapshotted into each booking at the time it is created. Changes here only apply to new bookings.
        </p>
      </div>

      {/* Base rates */}
      <section className="space-y-3">
        <h2 className="text-subsection font-semibold text-text-primary">Base rates</h2>
        <p className="text-small text-text-secondary">
          The default nightly rate for each room type. Click the pencil icon to edit inline.
        </p>
        <BaseRatesSection roomTypes={roomTypes ?? []} />
      </section>

      {/* Festival overrides */}
      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="text-subsection font-semibold text-text-primary">
          Festival &amp; seasonal overrides
        </h2>
        <p className="text-small text-text-secondary">
          Override the base rate for specific date ranges (festivals, long weekends, peak season).
        </p>
        <RateOverridesSection
          overrides={overrides ?? []}
          roomTypes={roomTypes ?? []}
        />
      </section>
    </div>
  )
}
