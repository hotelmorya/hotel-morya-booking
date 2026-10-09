import { IconHammer } from '@tabler/icons-react'

// Temporary stand-in for routes whose real page arrives in a later phase.
export function PagePlaceholder({
  title,
  phase,
}: {
  title: string
  phase: string
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-xl border-hairline border-border bg-surface-1 p-8 text-center">
      <IconHammer size={40} className="text-text-disabled" stroke={1.5} />
      <h2 className="text-section font-medium text-text-primary">{title}</h2>
      <p className="max-w-sm text-body text-text-secondary">
        This page is built in {phase}. The navigation is wired up so the shell
        can be reviewed end to end.
      </p>
    </div>
  )
}
