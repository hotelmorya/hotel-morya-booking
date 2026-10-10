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
  const isMr = locale === "mr";

  const title = isMr
    ? "हॉटेल मोरया लॉजिंग आदमापूर | बाळूमामा मंदिरा जवळ"
    : "Hotel Morya Lodging Admapur | Near Balumama Temple";

  const description = isMr
    ? "श्री संत बाळूमामा मंदिरापासून फक्त २०० मीटर अंतरावर स्वच्छ AC व नॉन-AC खोल्या आणि ग्रुप हॉल. २४ तास गरम पाणी, लिफ्ट व पार्किंग. कॉल करा: ९०२२३९७०९५."
    : "Clean AC & Non-AC rooms and pilgrim dormitory in Admapur, just 200m from Shri Balumama Temple. 24/7 hot water, lift & parking. Call 9022397095 to book.";

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
