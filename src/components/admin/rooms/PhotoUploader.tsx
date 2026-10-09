'use client'

import { IconPhoto, IconStar, IconStarFilled, IconTrash, IconUpload } from '@tabler/icons-react'
import { useCallback, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { buildCloudinaryUrl, CLOUD_NAME } from '@/lib/cloudinary'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

type RoomPhoto = Tables<'room_photos'>

interface UploadState {
  file: File
  progress: number
  error: string | null
  done: boolean
}

interface PhotoUploaderProps {
  roomTypeId: string
  initialPhotos: RoomPhoto[]
  onPhotosChange?: (photos: RoomPhoto[]) => void
}

const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ''

export function PhotoUploader({
  roomTypeId,
  initialPhotos,
  onPhotosChange,
}: PhotoUploaderProps) {
  // All hooks must be declared before any early return.
  const [photos, setPhotos] = useState<RoomPhoto[]>(initialPhotos)
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function uploadFile(file: File, index: number) {
    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', UPLOAD_PRESET)
    form.append('folder', 'room-types')

    try {
      // Use XMLHttpRequest for progress events.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open(
          'POST',
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
        )

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 90)
            setUploads((prev) =>
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

            // Determine sort_order for the new photo.
            const nextOrder = photos.length + index

            // If this is the very first photo ever, mark as primary.
            const isPrimary = photos.length === 0 && index === 0

            const { data: inserted, error } = await supabase
              .from('room_photos')
              .insert({
                room_type_id: roomTypeId,
                url: result.secure_url,
                public_id: result.public_id,
                sort_order: nextOrder,
                is_primary: isPrimary,
              })
              .select()
              .single()

            if (error) {
              reject(new Error(error.message))
              return
            }

            setPhotos((prev) => {
              const next = [...prev, inserted]
              onPhotosChange?.(next)
              return next
            })
            setUploads((prev) =>
              prev.map((u, i) =>
                i === index ? { ...u, progress: 100, done: true } : u
              )
            )
            resolve()
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        }

        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(form)
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setUploads((prev) =>
        prev.map((u, i) => (i === index ? { ...u, error: msg } : u))
      )
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (arr.length === 0) return

    const startIndex = uploads.length
    const newStates: UploadState[] = arr.map((f) => ({
      file: f,
      progress: 0,
      error: null,
      done: false,
    }))
    setUploads((prev) => [...prev, ...newStates])

    arr.forEach((file, i) => {
      uploadFile(file, startIndex + i)
    })
  }

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uploads.length, photos.length]
  )

  async function setPrimary(photoId: string) {
    // Unset all others first.
    await supabase
      .from('room_photos')
      .update({ is_primary: false })
      .eq('room_type_id', roomTypeId)

    await supabase
      .from('room_photos')
      .update({ is_primary: true })
      .eq('id', photoId)

    setPhotos((prev) => {
      const next = prev.map((p) => ({ ...p, is_primary: p.id === photoId }))
      onPhotosChange?.(next)
      return next
    })
  }

  async function deletePhoto(photoId: string) {
    // NOTE: Cloudinary asset cleanup is manual for MVP.
    // To remove the asset from Cloudinary, use the Admin API with the public_id.
    await supabase.from('room_photos').delete().eq('id', photoId)

    setPhotos((prev) => {
      const next = prev.filter((p) => p.id !== photoId)
      // If deleted was primary and photos remain, promote first
      if (prev.find((p) => p.id === photoId)?.is_primary && next.length > 0) {
        supabase
          .from('room_photos')
          .update({ is_primary: true })
          .eq('id', next[0].id)
        next[0] = { ...next[0], is_primary: true }
      }
      onPhotosChange?.(next)
      return next
    })
  }

  // Guard: show info box if Cloudinary is not configured.
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return (
      <div className="rounded-md border-hairline border-border bg-surface-1 p-4">
        <p className="text-body font-medium text-text-primary">Photos</p>
        <p className="mt-1 text-small text-text-secondary">
          Add these environment variables to enable photo uploads:
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

  const pendingUploads = uploads.filter((u) => !u.done && !u.error)
  const hasUploads = uploads.some((u) => !u.done)

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={[
          'flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed transition-colors',
          isDragging
            ? 'border-accent-500 bg-accent-50'
            : 'border-border bg-surface-1 hover:border-border-emphasis hover:bg-surface-2',
        ].join(' ')}
      >
        <IconUpload size={20} className="text-text-tertiary" stroke={1.5} />
        <p className="text-small text-text-secondary">
          Drop images here or{' '}
          <span className="font-medium text-accent-500">browse</span>
        </p>
        <p className="text-micro text-text-tertiary">
          PNG, JPG, WEBP — multiple files supported
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* In-progress uploads */}
      {hasUploads && (
        <ul className="space-y-1.5">
          {uploads.map((u, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded border-hairline border-border bg-surface-1 px-3 py-2"
            >
              <IconPhoto size={14} className="shrink-0 text-text-tertiary" />
              <span className="flex-1 truncate text-small text-text-secondary">
                {u.file.name}
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

      {/* Existing photos grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={buildCloudinaryUrl(photo.public_id, { width: 300 })}
                alt=""
                className="aspect-video w-full rounded object-cover"
                loading="lazy"
              />
              {/* Overlay actions */}
              <div className="absolute inset-0 flex items-start justify-between gap-1 rounded bg-black/40 p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setPrimary(photo.id)}
                  title={photo.is_primary ? 'Primary photo' : 'Set as primary'}
                  className="flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
                >
                  {photo.is_primary ? (
                    <IconStarFilled size={14} className="text-warning" />
                  ) : (
                    <IconStar size={14} />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => deletePhoto(photo.id)}
                  title="Remove photo"
                  className="flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white hover:bg-danger"
                >
                  <IconTrash size={14} />
                </Button>
              </div>
              {photo.is_primary && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-micro text-white">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && pendingUploads.length === 0 && (
        <p className="text-center text-small text-text-tertiary">
          No photos yet. Upload at least one to show on the public site.
        </p>
      )}
    </div>
  )
}
