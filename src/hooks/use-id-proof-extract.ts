'use client'

import { useMutation } from '@tanstack/react-query'

// Best-effort OCR draft returned by the extract route. Any field may be null;
// the UI pre-fills whatever returned and never auto-saves.
export type ExtractedId = {
  id_type: string | null
  id_number: string | null
  fullname: string | null
}

// useExtractIdProof — read-only OCR scan of a guest's on-file ID image.
// Returns a draft only (no cache invalidation; the route never writes the DB).
export function useExtractIdProof() {
  return useMutation<ExtractedId, Error, string>({
    mutationFn: async (guestId: string) => {
      const res = await fetch(`/api/guests/${guestId}/id-proof/extract`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error?.message ?? 'Could not scan ID')
      }
      return json.data as ExtractedId
    },
  })
}
