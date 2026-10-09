import { HotelSettingsForm } from '@/components/admin/settings/HotelSettingsForm'
import { createClient } from '@/lib/supabase/server'

export default async function HotelInfoPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('hotel_settings')
    .select('*')
    .maybeSingle()

  return <HotelSettingsForm initialData={data ?? null} />
}
