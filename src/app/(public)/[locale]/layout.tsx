import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { Providers } from '@/components/providers'
import { locales } from '@/lib/i18n'

import { HotelJsonLd } from '@/components/seo/HotelJsonLd'
import { HOTEL } from '@/lib/site'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isMr = locale === 'mr'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hotel-morya-booking.vercel.app'
  const base = appUrl.replace(/\/$/, '')

  const languages: Record<string, string> = {
    en: `${base}/en`,
    mr: `${base}/mr`,
    'x-default': `${base}/en`,
  }

  const title = isMr
    ? 'हॉटेल मोरया लॉजिंग आदमापूर | बाळूमामा मंदिरा जवळ'
    : 'Hotel Morya Lodging Admapur | Stay Near Balumama Temple'

  const description = isMr
    ? 'श्री संत बाळूमामा मंदिरापासून फक्त २०० मीटर अंतरावर स्वच्छ AC व नॉन-AC खोल्या आणि ग्रुप हॉल. २४ तास गरम पाणी, लिफ्ट व पार्किंग. कॉल करा: ९०२२३९७०९५.'
    : 'Clean AC & Non-AC rooms and pilgrim dormitory in Admapur, just 200m from Shri Balumama Temple. 24/7 hot water, lift & parking. Call 9022397095 to book.'

  const keywords = isMr
    ? [
        'हॉटेल मोरया आदमापूर',
        'हॉटेल मोरया लॉजिंग',
        'मोरया लॉजिंग आदमापूर',
        'मोरया लॉज आदमापूर',
        'बाळूमामा मंदिर जवळ हॉटेल',
        'बाळूमामा मंदिर जवळ लॉज',
        'बाळूमामा मंदिर जवळ रूम्स',
        'आदमापूर रूम बुकिंग',
        'आदमापूर लॉज',
        'आदमापूर हॉटेल',
        'आदमापूर डॉर्मिटरी',
        'Hotel Morya Admapur',
        'Hotels near Balumama Temple',
        'Hotels near Balumama Mandir',
        'Hotel in Admapur',
        'Hotel in Adamapur',
      ]
    : [
        'Hotel Morya Admapur',
        'Hotel Morya Lodging',
        'Morya Lodge Admapur',
        'Morya Lodging Admapur',
        'Hotel in Admapur',
        'Hotel in Adamapur',
        'Hotels near Admapur',
        'Hotels near Adamapur',
        'Hotels near Balumama Temple',
        'Hotels near Balumama Mandir',
        'Lodge near Shri Balumama Temple',
        'Lodge near Balumama Mandir',
        'Rooms near Balumama Temple Admapur',
        'Rooms near Balumama Temple Adamapur',
        'Dharamshala near Balumama Temple',
        'Budget Hotels in Admapur',
        'Dormitory in Admapur',
        'Stay near Balumama Mandir',
        'Admapur Room Booking',
      ]

  return {
    metadataBase: new URL(base),
    title,
    description,
    keywords,
    alternates: {
      canonical: `${base}/${locale}`,
      languages,
    },
    openGraph: {
      type: 'website',
      locale: isMr ? 'mr_IN' : 'en_IN',
      alternateLocale: isMr ? ['en_IN'] : ['mr_IN'],
      url: `${base}/${locale}`,
      siteName: HOTEL.name,
      title,
      description,
      images: [
        {
          url: `${base}/images/hotel-morya-exterior-02.png`,
          width: 1672,
          height: 941,
          alt: isMr
            ? 'हॉटेल मोरया लॉजिंग इमारत, आदमापूर'
            : 'Hotel Morya Lodging Building in Admapur',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${base}/images/hotel-morya-exterior-02.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
      : {}),
    other: {
      'geo.region': `${HOTEL.address.country}-MH`,
      'geo.placename': `Admapur, ${HOTEL.address.district}`,
      'geo.position': `${HOTEL.geo.lat};${HOTEL.geo.lng}`,
      ICBM: `${HOTEL.geo.lat}, ${HOTEL.geo.lng}`,
    },
  }
}

export default async function PublicLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(locales, locale)) notFound()

  setRequestLocale(locale)

  return (
    <NextIntlClientProvider>
      <Providers>
        <div
          className="light-scope flex min-h-dvh flex-col bg-background text-foreground [color-scheme:light]"
          data-locale={locale}
        >
          <HotelJsonLd locale={locale} />
          {children}
        </div>
      </Providers>
    </NextIntlClientProvider>
  )
}
