import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { HomePageClient } from "@/components/home/HomePageClient";

// 60-second ISR for high performance and live DB sync
export const revalidate = 60;

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";
  return createSupabaseClient(url, key);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brand" });
  const title = `${t("name")} | ${t("tagline")}`;
  const description =
    locale === "mr"
      ? "श्री संत बाळूमामा मंदिरापासून फक्त २०० मीटर अंतरावर स्वच्छ AC खोल्या, नॉन-AC खोल्या आणि ५०+ भाविकांचा ग्रुप हॉल. हॉटेल मोरया लॉजिंग, आदमापूर."
      : "Stay at Hotel Morya Lodging in Admapur, Kolhapur, just 200 metres from Shri Sant Balumama Temple. AC rooms, non-AC rooms, and group dormitory.";

  return {
    title: { absolute: title },
    description,
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = getPublicClient();

  const [
    { data: roomTypes },
    { data: galleryMedia },
    { data: hotelSettings },
  ] = await Promise.all([
    supabase
      .from("room_types")
      .select("*, room_photos(*)")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
    supabase
      .from("gallery_media")
      .select("id, media_type, public_id, url, alt_text, sort_order")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
    supabase
      .from("hotel_settings")
      .select("*")
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <HomePageClient
      roomTypes={roomTypes ?? []}
      galleryMedia={galleryMedia ?? []}
      hotelSettings={hotelSettings}
    />
  );
}
