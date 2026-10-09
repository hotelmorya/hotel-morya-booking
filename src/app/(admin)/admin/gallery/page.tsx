import { notFound } from 'next/navigation'

import { GalleryManager } from '@/components/admin/gallery/GalleryManager'
import { getCurrentProfile } from '@/lib/auth'
import { MANAGER_PLUS } from '@/lib/auth'

export const metadata = {
  title: 'Gallery',
}

// Server Component — auth guard + role gate.
// The (admin) layout already redirects unauthenticated users to /auth/login.
// This page additionally restricts access to MANAGER_PLUS roles.
export default async function GalleryPage() {
  const profile = await getCurrentProfile()

  if (!profile || !MANAGER_PLUS.includes(profile.role)) {
    notFound()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-heading font-semibold text-text-primary">Gallery</h1>
          <p className="mt-0.5 text-small text-text-secondary">
            Upload images and videos or link external content. Drag to reorder.
          </p>
        </div>
      </div>

      <GalleryManager />
    </div>
  )
}
