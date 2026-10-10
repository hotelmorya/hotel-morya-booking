"use client";

import { MessageSquare } from "lucide-react";
import { waHref } from "@/lib/site";
import { useTranslations } from "next-intl";

export function FloatingWhatsApp() {
  const t = useTranslations("common");

  return (
    <a
      href={waHref("Namaskar, I would like to inquire about booking a room at Hotel Morya Lodging Admapur.")}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Direct WhatsApp pilgrim assistance"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-[#20bd5a] hover:shadow-[0_10px_25px_rgba(37,211,102,0.4)]"
    >
      <MessageSquare className="size-5" />
      <span className="text-xs font-bold tracking-wide hidden sm:inline-block">
        {t("whatsappUs")}
      </span>
    </a>
  );
}
