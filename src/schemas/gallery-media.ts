import { z } from 'zod'

/**
 * Schema for creating a gallery_media row.
 * Uses discriminatedUnion to enforce field presence per media_type.
 */
export const galleryMediaCreateSchema = z.discriminatedUnion('media_type', [
  // Image: must supply public_id + url (from Cloudinary upload)
  z.object({
    media_type: z.literal('image'),
    public_id: z.string().min(1, 'public_id is required for image'),
    url: z.string().url('url must be a valid URL'),
    alt_text: z.string().default(''),
    sort_order: z.coerce.number().int().min(0).default(0),
    is_active: z.boolean().default(true),
  }),
  // Video: either an uploaded Cloudinary file or an external YouTube/Vimeo URL
  z.object({
    media_type: z.literal('video'),
    video_kind: z.enum(['upload', 'external']),
    // For upload: public_id + url required; for external: external_url required
    public_id: z.string().min(1).optional(),
    url: z.string().url().optional(),
    external_url: z.string().url('external_url must be a valid URL').optional(),
    alt_text: z.string().default(''),
    sort_order: z.coerce.number().int().min(0).default(0),
    is_active: z.boolean().default(true),
  }).refine(
    (val) => {
      if (val.video_kind === 'upload') return !!val.public_id && !!val.url
      if (val.video_kind === 'external') return !!val.external_url
      return false
    },
    {
      message:
        'video upload requires public_id + url; external video requires external_url',
    }
  ),
])

/**
 * Schema for PATCH reorder / visibility toggle.
 * Includes updated_at for optimistic locking.
 */
export const galleryMediaReorderSchema = z.object({
  sort_order: z.coerce.number().int().min(0),
  updated_at: z.string(), // ISO timestamp — optimistic lock
})

/**
 * Schema for toggling is_active visibility.
 */
export const galleryMediaVisibilitySchema = z.object({
  is_active: z.boolean(),
  updated_at: z.string(), // optimistic lock
})

export type GalleryMediaCreate = z.infer<typeof galleryMediaCreateSchema>
export type GalleryMediaReorder = z.infer<typeof galleryMediaReorderSchema>
export type GalleryMediaVisibility = z.infer<typeof galleryMediaVisibilitySchema>
