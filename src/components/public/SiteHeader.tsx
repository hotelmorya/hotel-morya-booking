"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { LocaleSwitcher } from "@/components/public/LocaleSwitcher";
import { ArrowLeft, Phone } from "lucide-react";
import { HOTEL, telHref } from "@/lib/site";

export function SiteHeader() {
  const t = useTranslations("brand");
  const tNav = useTranslations("nav");

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 group"
          aria-label={`${t("name")} — ${tNav("home")}`}
        >
          <div className="relative h-10 w-32 sm:h-11 sm:w-36 transition-transform duration-200 group-hover:scale-102">
            <Image
              src="/images/morya-logo.png"
              alt={t("name")}
              fill
              priority
              className="object-contain object-left drop-shadow"
            />
          </div>
          <span className="hidden sm:flex flex-col leading-none border-l border-border pl-3">
            <span className="font-display text-base sm:text-lg font-semibold text-foreground">
              {t("name")}
            </span>
            <span className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("tagline")}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href={telHref(HOTEL.phones[0])}
            className="hidden md:flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition font-sans tabular-nums"
          >
            <Phone className="size-4 text-primary" />
            <span>+91 {HOTEL.phones[0]}</span>
          </a>

          <LocaleSwitcher onDark={false} />

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3.5 py-2 text-sm font-bold text-foreground transition hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{tNav("home")}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
