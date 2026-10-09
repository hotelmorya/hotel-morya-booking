import { PoliciesForm } from '@/components/admin/settings/PoliciesForm'
import { createClient } from '@/lib/supabase/server'

export default async function PoliciesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('hotel_settings')
    .select('*')
    .maybeSingle()

  return <PoliciesForm initialData={data ?? null} />
}
