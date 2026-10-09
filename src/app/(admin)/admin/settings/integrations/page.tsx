import { redirect } from 'next/navigation'
import { IconCheck, IconX } from '@tabler/icons-react'
import { getCurrentProfile } from '@/lib/auth'

// Integration status is determined server-side by checking env vars.
// Keys are never sent to the client — only a boolean "configured" flag.
function getIntegrationStatus() {
  return {
    supabase: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    cloudinary: !!(
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY
    ),
    turnstile: !!(
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY
    ),
    resend: !!(process.env.RESEND_API_KEY),
  }
}

interface IntegrationCardProps {
  name: string
  description: string
  configured: boolean
  docsUrl?: string
}

function IntegrationCard({
  name,
  description,
  configured,
  docsUrl,
}: IntegrationCardProps) {
  return (
    <div className="flex items-start gap-4 rounded border border-border bg-surface-1 p-4">
      <div
        className={[
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          configured
            ? 'bg-[#dcfce7] text-[#14532d]'
            : 'bg-surface-2 text-text-disabled',
        ].join(' ')}
      >
        {configured ? <IconCheck size={16} /> : <IconX size={16} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-body font-medium text-text-primary">{name}</p>
          <span
            className={[
              'pill',
              configured
                ? 'bg-[#dcfce7] text-[#14532d]'
                : 'bg-surface-2 text-text-tertiary',
            ].join(' ')}
          >
            {configured ? 'Configured' : 'Not configured'}
          </span>
        </div>
        <p className="mt-0.5 text-small text-text-secondary">{description}</p>
        {docsUrl && !configured && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-small text-accent-500 hover:underline"
          >
            Setup guide →
          </a>
        )}
      </div>
    </div>
  )
}

export default async function IntegrationsPage() {
  // Entire Integrations tab is developer-level — super_admin only. Block direct
  // URL access for everyone else (the tab is also hidden in SettingsTabs).
  const profile = await getCurrentProfile()
  if (profile?.role !== 'super_admin') redirect('/admin/settings/hotel')

  const status = getIntegrationStatus()

  return (
    <div className="space-y-6">
      <div className="rounded border border-border bg-surface-1 px-4 py-3">
        <p className="text-small text-text-secondary">
          Keys are configured via environment variables on the server. Contact your developer to add or change them.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
          Infrastructure
        </h3>

        <IntegrationCard
          name="Supabase"
          description="Database, authentication, and realtime. Always required."
          configured={status.supabase}
        />

        <IntegrationCard
          name="Cloudinary"
          description="Room photos and hotel logo uploads. Required for image management."
          configured={status.cloudinary}
          docsUrl="https://cloudinary.com/documentation"
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
          Notifications
        </h3>

        <IntegrationCard
          name="Cloudflare Turnstile"
          description="Bot/spam protection for the public booking flow. Required for online bookings."
          configured={status.turnstile}
          docsUrl="https://developers.cloudflare.com/turnstile/get-started/"
        />

        <IntegrationCard
          name="Resend"
          description="Transactional email for booking confirmations, pre-arrival reminders, and weekly reports."
          configured={status.resend}
          docsUrl="https://resend.com/docs/send-with-nextjs"
        />
      </div>
    </div>
  )
}
