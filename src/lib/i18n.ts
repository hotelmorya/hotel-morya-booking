import { getRequestConfig } from 'next-intl/server'

export const locales = ['en', 'mr'] as const
export const defaultLocale = 'en' as const

export type AppLocale = (typeof locales)[number]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dict = Record<string, any>

// Deep-merge locale messages over English so missing keys gracefully fallback to English
function deepMerge(base: Dict, override: Dict): Dict {
  const out: Dict = { ...base }
  for (const key of Object.keys(override)) {
    const b = base[key]
    const o = override[key]
    out[key] =
      b && o && typeof b === 'object' && typeof o === 'object' && !Array.isArray(b)
        ? deepMerge(b, o)
        : o
  }
  return out
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = locales.includes(requested as AppLocale)
    ? (requested as AppLocale)
    : defaultLocale

  const en = (await import('../../messages/en.json')).default as Dict
  const messages =
    locale === 'en'
      ? en
      : deepMerge(en, (await import(`../../messages/${locale}.json`)).default as Dict)

  return { locale, messages }
})
