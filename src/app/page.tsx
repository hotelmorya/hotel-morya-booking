import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { HomePageClient } from "@/components/home/HomePageClient";

// Revalidate public landing page every 60 seconds (ISR)
export const revalidate = 60;

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";
  return createSupabaseClient(url, key);
}

export default async function HomePage() {
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
