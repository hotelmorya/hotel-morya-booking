import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { Providers } from '@/components/providers'
import { locales } from '@/lib/i18n'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hotel-morya-booking.vercel.app'
  const base = appUrl.replace(/\/$/, '')

  const languages: Record<string, string> = {
    en: `${base}/en`,
    mr: `${base}/mr`,
    'x-default': `${base}/en`,
  }

  return {
    alternates: {
      canonical: `${base}/${locale}`,
      languages,
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
          {children}
        </div>
      </Providers>
    </NextIntlClientProvider>
  )
}
