"use client"

import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react"
import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { SortDir } from "@/lib/use-table-sort"

// A clickable, sortable table header cell. Shows a dimmed ArrowUpDown when
// inactive and a Chevron in the active direction when sorting by this column.
// Pairs with useTableSort. Used across every list table for a consistent UX.
export function SortableHead<K extends string>({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = "left",
  className,
}: {
  label: string
  sortKey: K
  activeKey: K | null
  dir: SortDir
  onSort: (key: K) => void
  align?: "left" | "right"
  className?: string
}) {
  const isActive = activeKey === sortKey
  const Icon = isActive ? (dir === "asc" ? ChevronUp : ChevronDown) : ArrowUpDown

  return (
    <TableHead
      className={cn(
        "text-text-secondary select-none",
        align === "right" && "text-right",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 rounded px-1 -mx-1 py-0.5 transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive && "text-text-primary",
          align === "right" && "flex-row-reverse"
        )}
      >
        {label}
        <Icon className={cn("size-3.5 shrink-0", isActive ? "opacity-100" : "opacity-40")} />
      </button>
    </TableHead>
  )
}
