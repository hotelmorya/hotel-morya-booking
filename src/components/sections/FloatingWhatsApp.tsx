"use client";

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
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-3.5 py-3 sm:px-4 text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-[#20bd5a] hover:shadow-[0_10px_25px_rgba(37,211,102,0.4)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
    >
      <svg className="size-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
      </svg>
      <span className="text-xs font-bold tracking-wide hidden sm:inline-block">
        {t("whatsappUs")}
      </span>
    </a>
  );
}
