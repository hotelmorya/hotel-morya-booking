import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://hotel-morya-booking.vercel.app'
  ).replace(/\/$/, '')

  const lastModified = new Date()

  return [
    // 1. Homepage (Multilingual English & Marathi)
    {
      url: `${baseUrl}/en`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: {
          en: `${baseUrl}/en`,
          mr: `${baseUrl}/mr`,
          'x-default': `${baseUrl}/en`,
        },
      },
    },
    {
      url: `${baseUrl}/mr`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: {
          en: `${baseUrl}/en`,
          mr: `${baseUrl}/mr`,
          'x-default': `${baseUrl}/en`,
        },
      },
    },

    // 2. Booking Engine Page
    {
      url: `${baseUrl}/en/book`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: {
        languages: {
          en: `${baseUrl}/en/book`,
          mr: `${baseUrl}/mr/book`,
          'x-default': `${baseUrl}/en/book`,
        },
      },
    },
    {
      url: `${baseUrl}/mr/book`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: {
        languages: {
          en: `${baseUrl}/en/book`,
          mr: `${baseUrl}/mr/book`,
          'x-default': `${baseUrl}/en/book`,
        },
      },
    },
  ]
}
