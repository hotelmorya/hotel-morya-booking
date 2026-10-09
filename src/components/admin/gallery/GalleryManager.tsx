'use client'

import {
  IconArrowDown,
  IconArrowUp,
  IconEye,
  IconEyeOff,
  IconPhoto,
  IconTrash,
  IconUpload,
  IconVideo,
  IconWorld,
} from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  buildCloudinaryUrl,
  buildCloudinaryVideoThumbnail,
  CLOUD_NAME,
} from '@/lib/cloudinary'
import {
  useCreateGalleryMedia,
  useDeleteGalleryMedia,
  useGalleryMedia,
  useReorderGalleryMedia,
  useToggleGalleryMediaVisibility,
} from '@/hooks/use-gallery-media'
import type { GalleryMedia } from '@/types/database'

const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ''

interface UploadState {
  name: string
  progress: number
  error: string | null
  done: boolean
}

// Parse YouTube ID from standard URL formats
function parseYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  )
  return match?.[1] ?? null
}

// Parse Vimeo ID from standard URL formats
function parseVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return match?.[1] ?? null
}

export function GalleryManager() {
  const { data, isPending } = useGalleryMedia()
  const createMedia = useCreateGalleryMedia()
  const reorderMedia = useReorderGalleryMedia()
  const toggleVisibility = useToggleGalleryMediaVisibility()
  const deleteMedia = useDeleteGalleryMedia()

  const [imageUploads, setImageUploads] = useState<UploadState[]>([])
  const [videoUploads, setVideoUploads] = useState<UploadState[]>([])
  const [isImageDragging, setIsImageDragging] = useState(false)
  const [isVideoDragging, setIsVideoDragging] = useState(false)
  const [externalUrl, setExternalUrl] = useState('')
  const [externalAlt, setExternalAlt] = useState('')
  const [externalError, setExternalError] = useState('')
  const [externalSubmitting, setExternalSubmitting] = useState(false)
  const [deletingItem, setDeletingItem] = useState<GalleryMedia | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const items: GalleryMedia[] = data?.data ?? []

  // Guard: Cloudinary not configured
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return (
      <div className="rounded-md border-hairline border-border bg-surface-1 p-6">
        <p className="text-body font-medium text-text-primary">Gallery</p>
        <p className="mt-1 text-small text-text-secondary">
          Add these environment variables to enable media uploads:
        </p>
        <ul className="mt-2 space-y-0.5 text-small text-text-tertiary">
          <li>
            <code className="rounded bg-surface-2 px-1 py-0.5 text-micro">
              NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
            </code>
          </li>
          <li>
            <code className="rounded bg-surface-2 px-1 py-0.5 text-micro">
              NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
            </code>
          </li>
        </ul>
      </div>
    )
  }

  async function uploadImageFile(file: File, index: number) {
    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', UPLOAD_PRESET)
    form.append('folder', 'gallery')

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 90)
            setImageUploads((prev) =>
              prev.map((u, i) => (i === index ? { ...u, progress: pct } : u))
            )
          }
        }

        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const result = JSON.parse(xhr.responseText) as {
              secure_url: string
              public_id: string
            }
            try {
              await createMedia.mutateAsync({
                media_type: 'image',
                public_id: result.public_id,
                url: result.secure_url,
                alt_text: file.name.replace(/\.[^.]+$/, ''),
                sort_order: items.length + index,
                is_active: true,
              })
              setImageUploads((prev) =>
                prev.map((u, i) => (i === index ? { ...u, progress: 100, done: true } : u))
              )
              resolve()
            } catch (err) {
              reject(err)
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        }

        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.send(form)
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setImageUploads((prev) =>
        prev.map((u, i) => (i === index ? { ...u, error: msg } : u))
      )
      toast.error(msg)
    }
  }

  async function uploadVideoFile(file: File, index: number) {
    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', UPLOAD_PRESET)
    form.append('folder', 'gallery')

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 90)
            setVideoUploads((prev) =>
              prev.map((u, i) => (i === index ? { ...u, progress: pct } : u))
            )
          }
        }

        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const result = JSON.parse(xhr.responseText) as {
              secure_url: string
              public_id: string
            }
            try {
              await createMedia.mutateAsync({
                media_type: 'video',
                video_kind: 'upload',
                public_id: result.public_id,
                url: result.secure_url,
                alt_text: file.name.replace(/\.[^.]+$/, ''),
                sort_order: items.length + index,
                is_active: true,
              })
              setVideoUploads((prev) =>
                prev.map((u, i) => (i === index ? { ...u, progress: 100, done: true } : u))
              )
              resolve()
            } catch (err) {
              reject(err)
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        }

        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.send(form)
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setVideoUploads((prev) =>
        prev.map((u, i) => (i === index ? { ...u, error: msg } : u))
      )
      toast.error(msg)
    }
  }

  function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (arr.length === 0) return
    const startIndex = imageUploads.length
    const newStates: UploadState[] = arr.map((f) => ({
      name: f.name,
      progress: 0,
      error: null,
      done: false,
    }))
    setImageUploads((prev) => [...prev, ...newStates])
    arr.forEach((file, i) => uploadImageFile(file, startIndex + i))
  }

  function handleVideoFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const arr = Array.from(files).filter((f) => f.type.startsWith('video/'))
    if (arr.length === 0) return
    const startIndex = videoUploads.length
    const newStates: UploadState[] = arr.map((f) => ({
      name: f.name,
      progress: 0,
      error: null,
      done: false,
    }))
    setVideoUploads((prev) => [...prev, ...newStates])
    arr.forEach((file, i) => uploadVideoFile(file, startIndex + i))
  }

  function onImageDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsImageDragging(false)
    handleImageFiles(e.dataTransfer.files)
  }

  function onVideoDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsVideoDragging(false)
    handleVideoFiles(e.dataTransfer.files)
  }

  async function handleAddExternal(e: React.FormEvent) {
    e.preventDefault()
    setExternalError('')

    const url = externalUrl.trim()
    if (!url) {
      setExternalError('Please enter a URL')
      return
    }

    // Validate it's a proper URL
    try {
      new URL(url)
    } catch {
      setExternalError('Please enter a valid URL')
      return
    }

    // Verify it's YouTube or Vimeo
    const isYouTube = parseYouTubeId(url) !== null
    const isVimeo = parseVimeoId(url) !== null
    if (!isYouTube && !isVimeo) {
      setExternalError('Only YouTube and Vimeo URLs are supported')
      return
    }

    setExternalSubmitting(true)
    try {
      await createMedia.mutateAsync({
        media_type: 'video',
        video_kind: 'external',
        external_url: url,
        alt_text: externalAlt.trim(),
        sort_order: items.length,
        is_active: true,
      })
      setExternalUrl('')
      setExternalAlt('')
      toast.success('External video added')
    } catch (err) {
      setExternalError(err instanceof Error ? err.message : 'Failed to add video')
    } finally {
      setExternalSubmitting(false)
    }
  }

  async function handleReorderUp(item: GalleryMedia, idx: number) {
    if (idx === 0) return
    const prev = items[idx - 1]
    try {
      // Swap sort_order values
      await reorderMedia.mutateAsync({
        id: item.id,
        sort_order: prev.sort_order,
        updated_at: item.updated_at,
      })
      // Also update the item above — use its own updated_at
      await reorderMedia.mutateAsync({
        id: prev.id,
        sort_order: item.sort_order,
        updated_at: prev.updated_at,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reorder failed')
    }
  }

  async function handleReorderDown(item: GalleryMedia, idx: number) {
    if (idx === items.length - 1) return
    const next = items[idx + 1]
    try {
      await reorderMedia.mutateAsync({
        id: item.id,
        sort_order: next.sort_order,
        updated_at: item.updated_at,
      })
      await reorderMedia.mutateAsync({
        id: next.id,
        sort_order: item.sort_order,
        updated_at: next.updated_at,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reorder failed')
    }
  }

  async function handleToggleVisibility(item: GalleryMedia) {
    try {
      await toggleVisibility.mutateAsync({
        id: item.id,
        is_active: !item.is_active,
        updated_at: item.updated_at,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update visibility')
    }
  }

  async function confirmDelete() {
    if (!deletingItem) return
    try {
      await deleteMedia.mutateAsync({
        id: deletingItem.id,
        updated_at: deletingItem.updated_at,
      })
      setDeletingItem(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const imageHasUploads = imageUploads.some((u) => !u.done)
  const videoHasUploads = videoUploads.some((u) => !u.done)

  return (
    <div className="space-y-6">
      {/* Upload zones row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Image upload zone */}
        <div className="space-y-3">
          <h2 className="text-body font-medium text-text-primary">
            <IconPhoto size={16} className="mr-1.5 inline-block text-text-tertiary" />
            Upload Images
          </h2>
          <div
            role="button"
            tabIndex={0}
            onClick={() => imageInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') imageInputRef.current?.click()
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setIsImageDragging(true)
            }}
            onDragLeave={() => setIsImageDragging(false)}
            onDrop={onImageDrop}
            className={[
              'flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed transition-colors',
              isImageDragging
                ? 'border-accent-500 bg-accent-50'
                : 'border-border bg-surface-1 hover:border-border-emphasis hover:bg-surface-2',
            ].join(' ')}
          >
            <IconUpload size={20} className="text-text-tertiary" stroke={1.5} />
            <p className="text-small text-text-secondary">
              Drop images here or{' '}
              <span className="font-medium text-accent-500">browse</span>
            </p>
            <p className="text-micro text-text-tertiary">PNG, JPG, WEBP</p>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleImageFiles(e.target.files)}
          />
          {imageHasUploads && (
            <ul className="space-y-1.5">
              {imageUploads.map((u, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded border-hairline border-border bg-surface-1 px-3 py-2"
                >
                  <IconPhoto size={14} className="shrink-0 text-text-tertiary" />
                  <span className="flex-1 truncate text-small text-text-secondary">
                    {u.name}
                  </span>
                  {u.error ? (
                    <span className="text-micro text-danger">{u.error}</span>
                  ) : u.done ? (
                    <span className="text-micro text-success">Done</span>
                  ) : (
                    <div className="h-1 w-20 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full bg-accent-500 transition-all"
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Video upload zone */}
        <div className="space-y-3">
          <h2 className="text-body font-medium text-text-primary">
            <IconVideo size={16} className="mr-1.5 inline-block text-text-tertiary" />
            Upload Videos (MP4)
          </h2>
          <div
            role="button"
            tabIndex={0}
            onClick={() => videoInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') videoInputRef.current?.click()
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setIsVideoDragging(true)
            }}
            onDragLeave={() => setIsVideoDragging(false)}
            onDrop={onVideoDrop}
            className={[
              'flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed transition-colors',
              isVideoDragging
                ? 'border-accent-500 bg-accent-50'
                : 'border-border bg-surface-1 hover:border-border-emphasis hover:bg-surface-2',
            ].join(' ')}
          >
            <IconUpload size={20} className="text-text-tertiary" stroke={1.5} />
            <p className="text-small text-text-secondary">
              Drop video here or{' '}
              <span className="font-medium text-accent-500">browse</span>
            </p>
            <p className="text-micro text-text-tertiary">MP4 — video/* accepted</p>
          </div>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleVideoFiles(e.target.files)}
          />
          {videoHasUploads && (
            <ul className="space-y-1.5">
              {videoUploads.map((u, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded border-hairline border-border bg-surface-1 px-3 py-2"
                >
                  <IconVideo size={14} className="shrink-0 text-text-tertiary" />
                  <span className="flex-1 truncate text-small text-text-secondary">
                    {u.name}
                  </span>
                  {u.error ? (
                    <span className="text-micro text-danger">{u.error}</span>
                  ) : u.done ? (
                    <span className="text-micro text-success">Done</span>
                  ) : (
                    <div className="h-1 w-20 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full bg-accent-500 transition-all"
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add external video URL */}
      <div className="rounded-md border-hairline border-border bg-surface-1 p-4">
        <h2 className="mb-3 text-body font-medium text-text-primary">
          <IconWorld size={16} className="mr-1.5 inline-block text-text-tertiary" />
          Add External Video (YouTube / Vimeo)
        </h2>
        <form onSubmit={handleAddExternal} className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              value={externalUrl}
              onChange={(e) => {
                setExternalUrl(e.target.value)
                setExternalError('')
              }}
              className="flex-1 rounded-md border-hairline border-border bg-surface-2 px-3 py-2 text-small text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
            <input
              type="text"
              placeholder="Caption / alt text (optional)"
              value={externalAlt}
              onChange={(e) => setExternalAlt(e.target.value)}
              className="rounded-md border-hairline border-border bg-surface-2 px-3 py-2 text-small text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:w-52"
            />
            <Button
              type="submit"
              disabled={externalSubmitting}
              className="whitespace-nowrap"
            >
              {externalSubmitting ? 'Adding…' : 'Add Video'}
            </Button>
          </div>
          {externalError && (
            <p className="text-small text-danger">{externalError}</p>
          )}
        </form>
      </div>

      {/* Gallery items grid */}
      <div>
        <h2 className="mb-3 text-body font-medium text-text-primary">
          Gallery Items{' '}
          {items.length > 0 && (
            <span className="ml-1 text-small font-normal text-text-tertiary">
              ({items.length})
            </span>
          )}
        </h2>

        {isPending ? (
          /* Loading skeleton */
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-video animate-pulse rounded-lg bg-surface-2"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-hairline border-border bg-surface-1 py-16 text-center">
            <IconPhoto size={36} className="text-text-tertiary opacity-50" />
            <p className="text-small text-text-secondary">
              No gallery items yet. Upload an image or video above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {items.map((item, idx) => (
              <GalleryItemCard
                key={item.id}
                item={item}
                idx={idx}
                total={items.length}
                onReorderUp={() => handleReorderUp(item, idx)}
                onReorderDown={() => handleReorderDown(item, idx)}
                onToggleVisibility={() => handleToggleVisibility(item)}
                onDelete={() => setDeletingItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm — AlertDialog */}
      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this item from the gallery?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the gallery permanently. To temporarily take it off
              the public site instead, use Hide.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMedia.isPending}
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMedia.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Card sub-component for individual gallery items
interface GalleryItemCardProps {
  item: GalleryMedia
  idx: number
  total: number
  onReorderUp: () => void
  onReorderDown: () => void
  onToggleVisibility: () => void
  onDelete: () => void
}

function GalleryItemCard({
  item,
  idx,
  total,
  onReorderUp,
  onReorderDown,
  onToggleVisibility,
  onDelete,
}: GalleryItemCardProps) {
  const youtubeId =
    item.video_kind === 'external' && item.external_url
      ? parseYouTubeId(item.external_url)
      : null

  return (
    <div className={['group relative', !item.is_active ? 'opacity-50' : ''].join(' ')}>
      {/* Thumbnail */}
      {item.media_type === 'image' && item.public_id ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={buildCloudinaryUrl(item.public_id, { width: 300 })}
          alt={item.alt_text || 'Gallery image'}
          className="aspect-video w-full rounded-lg object-cover"
          loading="lazy"
        />
      ) : item.video_kind === 'upload' && item.public_id ? (
        /* Cloudinary video — first-frame thumbnail */
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={buildCloudinaryVideoThumbnail(item.public_id, { width: 300 })}
            alt={item.alt_text || 'Video thumbnail'}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <IconVideo size={24} className="text-white" />
          </div>
        </div>
      ) : (
        /* External video (YouTube/Vimeo) */
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface-2">
          {youtubeId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
              alt={item.alt_text || 'YouTube video'}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <IconVideo size={28} className="text-text-tertiary" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <IconVideo size={24} className="text-white" />
          </div>
        </div>
      )}

      {/* Hover action overlay */}
      <div className="absolute inset-0 flex flex-col items-stretch justify-between rounded-lg bg-black/50 p-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {/* Top row: reorder */}
        <div className="flex justify-between gap-1">
          <button
            type="button"
            onClick={onReorderUp}
            disabled={idx === 0}
            title="Move up"
            className="flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={onReorderDown}
            disabled={idx === total - 1}
            title="Move down"
            className="flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconArrowDown size={14} />
          </button>
        </div>

        {/* Bottom row: visibility + delete */}
        <div className="flex justify-between gap-1">
          <button
            type="button"
            onClick={onToggleVisibility}
            title={item.is_active ? 'Hide from gallery' : 'Show in gallery'}
            className="flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
          >
            {item.is_active ? <IconEye size={14} /> : <IconEyeOff size={14} />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Remove from gallery"
            className="flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white hover:bg-danger"
          >
            <IconTrash size={14} />
          </button>
        </div>
      </div>

      {/* Status badges */}
      {!item.is_active && (
        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-micro text-white">
          Hidden
        </span>
      )}
      {item.media_type === 'video' && (
        <span className="absolute top-1 right-1 rounded bg-black/60 px-1 py-0.5 text-micro text-white">
          {item.video_kind === 'external' ? 'Ext' : 'Vid'}
        </span>
      )}
    </div>
  )
}
