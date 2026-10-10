import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { TrackPage } from '@/components/public/booking/TrackPage'
import { SiteHeader } from '@/components/public/SiteHeader'
import { SiteFooter } from '@/components/sections/SiteFooter'
import { HOTEL } from '@/lib/site'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'track' })
  return {
    title: { absolute: `${t('title')} — ${HOTEL.name}` },
    description: t('subtitle'),
    robots: { index: false, follow: false },
  }
}

export default async function TrackBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ ref?: string; booked?: string }>
}) {
  const { locale } = await params
  const { ref, booked } = await searchParams
  setRequestLocale(locale)

  return (
    <>
      <SiteHeader />
      <main className="flex-1 min-h-[calc(100vh-160px)]">
        <TrackPage
          locale={locale}
          initialRef={ref}
          showSuccessBanner={!!booked}
          contactPhone={HOTEL.phones[0]}
          contactWhatsapp={HOTEL.whatsapp}
        />
      </main>
      <SiteFooter />
    </>
  )
}
