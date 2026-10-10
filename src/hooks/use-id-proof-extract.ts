'use client'

import { useMutation } from '@tanstack/react-query'
import { extractIdDetails, type ExtractedId } from '@/lib/ocr/id-inference'

export type { ExtractedId }

// useExtractIdProof — read-only OCR scan of a guest's on-file ID image.
// Uses fast client-side OCR first to bypass serverless timeouts,
// with graceful fallback to the server extract route.
export function useExtractIdProof() {
  return useMutation<ExtractedId, Error, string>({
    mutationFn: async (guestId: string) => {
      // 1. Try client-side OCR first (runs in Web Worker, no Vercel serverless timeouts)
      try {
        const urlRes = await fetch(`/api/guests/${guestId}/id-proof`)
        if (urlRes.ok) {
          const urlJson = await urlRes.json().catch(() => null)
          const signedUrl = urlJson?.data?.signedUrl
          if (signedUrl && typeof window !== 'undefined') {
            const { createWorker } = await import('tesseract.js')
            const worker = await createWorker('eng')
            try {
              const { data } = await worker.recognize(signedUrl)
              if (data?.text) {
                return extractIdDetails(data.text)
              }
            } finally {
              await worker.terminate().catch(() => {})
            }
          }
        }
      } catch (clientErr) {
        console.warn('[useExtractIdProof] Client-side OCR fallback:', clientErr)
      }

      // 2. Fallback to server route if client-side OCR could not run
      const res = await fetch(`/api/guests/${guestId}/id-proof/extract`, {
        method: 'POST',
      })
      let json: { error?: { message?: string }; data?: ExtractedId } | null = null
      try {
        json = await res.json()
      } catch {
        // Non-JSON response (e.g. 504 Gateway Timeout or deployment error)
      }

      if (!res.ok) {
        throw new Error(
          json?.error?.message ??
            'Could not scan ID automatically. Please enter details manually.'
        )
      }

      return (json?.data ?? { id_type: null, id_number: null, fullname: null }) as ExtractedId
    },
  })
}
