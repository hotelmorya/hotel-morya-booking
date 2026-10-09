'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  IconRocket,
  IconCircleCheck,
  IconCircle,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export interface ChecklistItem {
  label: string
  done: boolean
  href: string
  optional?: boolean
}

interface SetupChecklistProps {
  items: ChecklistItem[]
}

export function SetupChecklist({ items }: SetupChecklistProps) {
  const doneCount = items.filter((i) => i.done).length
  const total = items.length
  const allDone = doneCount === total
  const [expanded, setExpanded] = useState(false)

  // Hide card entirely when all 7 done
  if (allDone) return null

  // Find the first incomplete item for the hint line
  const nextIncomplete = items.find((i) => !i.done)

  return (
    <div className="rounded border-hairline border-accent-100 bg-accent-50 px-[14px] py-[14px] dark:border-accent-900/60 dark:bg-accent-900/30">
      {/* Main flex row: icon + body */}
      <div className="flex items-start gap-3">
        {/* 32×32 indigo square with rocket */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-accent-500 text-white">
          <IconRocket size={16} stroke={1.75} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-[13px] font-medium leading-tight text-accent-900 dark:text-accent-100">
            Finish setup · {doneCount} of {total} done
          </p>

          {/* Hint: next incomplete item */}
          {nextIncomplete && (
            <p className="mt-0.5 text-[12px] text-accent-700 dark:text-accent-100/70">
              {nextIncomplete.label}
            </p>
          )}

          {/* 7-segment progress bar */}
          <div className="mt-2.5 flex gap-[3px]">
            {items.map((item, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-sm transition-colors ${
                  item.done ? 'bg-accent-500' : 'bg-accent-100 dark:bg-accent-900/60'
                }`}
              />
            ))}
          </div>

          {/* Show/hide steps toggle */}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 h-auto gap-1 p-0 text-[11px] text-accent-700 hover:bg-transparent hover:text-accent-900 dark:text-accent-100/70 dark:hover:text-accent-100"
          >
            {expanded ? (
              <>
                <IconChevronUp size={12} stroke={2} />
                Hide steps
              </>
            ) : (
              <>
                <IconChevronDown size={12} stroke={2} />
                Show steps
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible item list */}
      {expanded && (
        <ul className="mt-3 space-y-0.5">
          {items.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="flex items-center gap-2.5 rounded px-2 py-1.5 text-[13px] transition-colors hover:bg-accent-100/60 dark:hover:bg-accent-900/40"
              >
                {item.done ? (
                  <IconCircleCheck
                    size={15}
                    className="flex-shrink-0 text-accent-500"
                    stroke={1.75}
                  />
                ) : (
                  <IconCircle
                    size={15}
                    className="flex-shrink-0 text-accent-700/50 dark:text-accent-100/40"
                    stroke={1.75}
                  />
                )}
                <span
                  className={
                    item.done
                      ? 'flex-1 text-accent-700/60 line-through dark:text-accent-100/40'
                      : 'flex-1 text-accent-900 dark:text-accent-100/90'
                  }
                >
                  {item.label}
                  {item.optional && (
                    <span className="ml-1 text-[11px] text-accent-700/60 dark:text-accent-100/40">
                      (optional)
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
