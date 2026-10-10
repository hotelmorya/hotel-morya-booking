import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { BookingPage } from '@/components/public/booking/BookingPage'
import { SiteHeader } from '@/components/public/SiteHeader'
import { SiteFooter } from '@/components/sections/SiteFooter'
import { HOTEL } from '@/lib/site'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'booking' })
  return {
    title: { absolute: `${t('title')} — ${HOTEL.name}` },
    description: t('subtitle'),
    robots: { index: false, follow: true },
  }
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ room_type?: string; search?: string }>
}) {
  const { locale } = await params
  const { room_type, search } = await searchParams
  setRequestLocale(locale)

  return (
    <>
      <SiteHeader />
      <main className="flex-1 min-h-[calc(100vh-160px)]">
        <BookingPage
          locale={locale}
          preselectedRoomTypeId={room_type}
          autoSearch={search === '1'}
          contactPhone={HOTEL.phones[0]}
          contactWhatsapp={HOTEL.whatsapp}
        />
      </main>
      <SiteFooter />
    </>
  )
}
