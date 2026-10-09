/**
 * Cloudinary helpers (lib/cloudinary.ts)
 *
 * Public images use Cloudinary with f_auto + q_auto transformations.
 * Private files (ID proofs, receipts) use Supabase Storage — not this file.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ''

/**
 * Build a Cloudinary delivery URL for a given public_id and width.
 * Always applies f_auto (format) and q_auto (quality) for best CDN delivery.
 *
 * @param publicId - The Cloudinary public ID of the asset.
 * @param width    - Responsive width bucket (e.g. 300, 768, 1200).
 */
export function buildCloudinaryUrl(
  publicId: string,
  { width }: { width: number }
): string {
  if (!CLOUD_NAME) {
    // Return a placeholder if the env var is not configured. This prevents a
    // blank string URL from causing 404 errors in development.
    return `https://placehold.co/${width}x${Math.round(width * 0.67)}`
  }
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/${publicId}`
}

/**
 * Build a Cloudinary delivery URL for a video public_id.
 *
 * Forces an explicit H.264 MP4 (`.mp4` extension + `vc_h264`) rather than
 * `f_auto`. `<video>`/`<source>` requests don't send a useful Accept header, so
 * `f_auto` can serve the ORIGINAL upload — e.g. an iPhone `.mov`/HEVC clip that
 * browsers can't decode, leaving playback stuck while the poster still shows.
 * Transcoding to H.264 MP4 guarantees universal `<video>` playback.
 *
 * @param publicId - The Cloudinary video public ID.
 * @param width    - Responsive width bucket (e.g. 800, 1200).
 */
export function buildCloudinaryVideoUrl(
  publicId: string,
  { width }: { width: number }
): string {
  if (!CLOUD_NAME) {
    return `https://placehold.co/${width}x${Math.round(width * 0.56)}`
  }
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/vc_h264,q_auto,w_${width}/${publicId}.mp4`
}

/**
 * Build the first-frame thumbnail URL for a Cloudinary video.
 * Returns a JPEG image at the given width.
 *
 * @param publicId - The Cloudinary video public ID.
 * @param width    - Width bucket for the thumbnail.
 */
export function buildCloudinaryVideoThumbnail(
  publicId: string,
  { width }: { width: number }
): string {
  if (!CLOUD_NAME) {
    return `https://placehold.co/${width}x${Math.round(width * 0.56)}`
  }
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/f_auto,q_auto,w_${width},so_0/${publicId}.jpg`
}

/**
 * `next/image` custom loader that delivers through Cloudinary's own transforms.
 *
 * Pass a Cloudinary public_id as the `<Image src>` and this loader as `loader`.
 * next/image then builds the responsive srcset by calling this for each width —
 * so resizing/format is done by Cloudinary's CDN (f_auto,q_auto,w_N), NOT
 * re-optimized a second time by Vercel's image optimizer. Keeps fill/priority/
 * lazy-loading working as usual.
 */
export function cloudinaryLoader({ src, width }: { src: string; width: number }): string {
  return buildCloudinaryUrl(src, { width })
}

export { CLOUD_NAME }
