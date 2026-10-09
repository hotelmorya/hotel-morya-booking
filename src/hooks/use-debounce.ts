import { useEffect, useState } from 'react'

/**
 * Debounce a value — returns the stable value only after `delay` ms of no
 * changes. Used to avoid triggering API calls on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
