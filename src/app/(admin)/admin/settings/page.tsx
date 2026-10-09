import { redirect } from 'next/navigation'

// /admin/settings → redirect to the Hotel Info tab
export default function SettingsIndexPage() {
  redirect('/admin/settings/hotel')
}
