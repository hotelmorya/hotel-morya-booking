'use client'

import * as React from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface SideDrawerProps {
  open: boolean
  onClose: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}

// Right-side drawer (480px desktop, full-width mobile) for create/edit forms.
// Canonical container for the form-drawer pattern — see .claude/skills/form-drawer.md.
export function SideDrawer({
  open,
  onClose,
  title,
  description,
  children,
}: SideDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-[480px]"
      >
        <SheetHeader className="border-b p-6">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
