"use client"

import * as React from "react"

export type SortDir = "asc" | "desc"

// Shared client-side table sorting. Click a column to sort asc; click again to
// flip to desc; click a different column to switch. `sortKey === null` means the
// list is shown in its incoming (default) order.
export function useTableSort<K extends string>(
  initialKey: K | null = null,
  initialDir: SortDir = "asc"
) {
  const [sortKey, setSortKey] = React.useState<K | null>(initialKey)
  const [sortDir, setSortDir] = React.useState<SortDir>(initialDir)

  const onSort = React.useCallback((key: K) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        return prevKey
      }
      setSortDir("asc")
      return key
    })
  }, [])

  return { sortKey, sortDir, onSort }
}

// Compare two cell values. Numbers sort numerically; everything else by
// locale-aware string compare (numeric: true so "Flat 2" < "Flat 10"); nulls
// always sort last regardless of direction.
export function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  const m = dir === "asc" ? 1 : -1
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "number" && typeof b === "number") return m * (a - b)
  return m * String(a).localeCompare(String(b), undefined, { numeric: true })
}

// Sort a copy of `rows` by a key, using an accessor to pull the comparable value.
// Returns the original array unchanged when no key is active (stable default order).
export function sortRows<T, K extends string>(
  rows: T[],
  sortKey: K | null,
  sortDir: SortDir,
  accessor: (row: T, key: K) => unknown
): T[] {
  if (!sortKey) return rows
  return [...rows].sort((a, b) => compareValues(accessor(a, sortKey), accessor(b, sortKey), sortDir))
}
