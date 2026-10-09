import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

export function InfoNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-dashed px-4 py-3 flex items-start gap-2.5", className)}>
      <Info className="h-4 w-4 text-text-secondary shrink-0 mt-0.5" aria-hidden="true" />
      <p className="flex-1 text-sm text-text-secondary leading-relaxed">{children}</p>
    </div>
  )
}
