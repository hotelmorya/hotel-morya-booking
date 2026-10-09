import * as React from "react"

/**
 * ReadOnlyField — display a settings value as a label + formatted text.
 * Used on settings (and similar) pages when the current user cannot edit.
 * Matches the surrounding Card content spacing and warm theme tokens.
 */
export function ReadOnlyField({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  )
}
