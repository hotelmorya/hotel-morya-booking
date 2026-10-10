"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/lib/navigation";
import { routing } from "@/lib/navigation";
import { type AppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LABELS: Record<AppLocale, string> = {
  en: "EN",
  mr: "मराठी",
};

/**
 * Clean, tactile English <-> Marathi language toggle.
 * onDark prop adjusts background and border contrast when positioned over dark hero elements.
 */
export function LocaleSwitcher({ onDark = false }: { onDark?: boolean }) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: AppLocale) {
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div
      role="group"
      aria-label="Language selection"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border p-1 backdrop-blur-md transition-colors shadow-2xs",
        onDark
          ? "border-white/20 bg-black/40 text-white"
          : "border-border/80 bg-zinc-100/90 dark:bg-white/10 text-foreground"
      )}
    >
      {routing.locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => !active && switchTo(l)}
            aria-pressed={active}
            disabled={isPending}
            className={cn(
              "rounded-full px-3 py-1 text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 disabled:opacity-50",
              active
                ? "bg-primary text-white shadow-xs"
                : onDark
                ? "text-white/80 hover:text-white"
                : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
            )}
          >
            {LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
