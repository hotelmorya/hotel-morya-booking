// New guest creation is handled via the SideDrawer on the guest directory.
// This route redirects there so any links to /admin/guests/new work correctly.
import { redirect } from 'next/navigation'

export default function NewGuestPage() {
  redirect('/admin/guests')
}
