'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ExternalLinkIcon,
  EyeIcon,
  Loader2,
  UploadIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react'

import { useGuestIdProofUrl } from '@/hooks/use-guests'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

// ── Props ─────────────────────────────────────────────────────────────────────

interface IdProofUploadProps {
  guestId: string
  existingPath: string | null
  onUploaded?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IdProofUpload({ guestId, existingPath, onUploaded }: IdProofUploadProps) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [zoom, setZoom] = useState(1) // image preview zoom (1 = fit width)

  const hasProof = !!existingPath
  const isPdf = !!existingPath && existingPath.toLowerCase().endsWith('.pdf')
  const { data: proofUrl, isLoading: proofLoading } = useGuestIdProofUrl(guestId, hasProof)

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  function handleChooseFile() {
    fileInputRef.current?.click()
  }

  async function handleUpload() {
    if (!selectedFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      const res = await fetch(`/api/guests/${guestId}/id-proof`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message ?? 'Upload failed')
      toast.success('ID proof uploaded')
      onUploaded?.()
      qc.invalidateQueries({ queryKey: ['guests'] })
      setSelectedFile(null)
      setShowReplace(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleCancelSelect() {
    setSelectedFile(null)
    setShowReplace(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">ID Proof</p>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="sr-only"
        onChange={handleFileChange}
      />

      {hasProof && !showReplace && !selectedFile ? (
        /* Existing proof — view + replace */
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewerOpen(true)}
            disabled={proofLoading || !proofUrl}
          >
            {proofLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <EyeIcon className="size-4" />
            )}
            View ID Proof
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setShowReplace(true)}
          >
            Replace
          </Button>
        </div>
      ) : selectedFile ? (
        /* File selected — show name + upload action */
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="flex-1 truncate text-foreground">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {(selectedFile.size / 1024).toFixed(0)} KB
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              {uploading && <Loader2 className="size-4 animate-spin" />}
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleCancelSelect}
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* No proof / replace mode — choose file */
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleChooseFile}>
            <UploadIcon className="size-4" />
            {showReplace ? 'Choose new file' : 'Upload ID proof'}
          </Button>
          {showReplace && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setShowReplace(false)}
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Accepted formats: JPEG, PNG, PDF · Max 5 MB · Stored securely, visible to staff only.
      </p>

      {/* In-app preview drawer — wider than the 480px form drawer to fit a document */}
      <Sheet
        open={viewerOpen}
        onOpenChange={(o) => {
          setViewerOpen(o)
          setZoom(1) // reset zoom whenever the viewer opens/closes
        }}
      >
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-2xl"
        >
          <SheetHeader className="border-b p-4">
            <SheetTitle>ID Proof</SheetTitle>
            <SheetDescription className="sr-only">
              Guest identity document preview
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-auto bg-muted/30 p-4">
            {proofLoading || !proofUrl ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : isPdf ? (
              <iframe
                src={proofUrl.signedUrl}
                title="ID proof"
                className="h-full w-full rounded-md border bg-background"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- private signed URL, not an optimizable asset
              <img
                src={proofUrl.signedUrl}
                alt="ID proof"
                style={{ width: `${zoom * 100}%` }}
                className="mx-auto h-auto max-w-none rounded-md transition-[width] duration-150"
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t p-4">
            {/* Zoom controls (images only — PDFs use the iframe's native zoom) */}
            {!isPdf ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Zoom out"
                  onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                  disabled={!proofUrl || zoom <= 0.5}
                >
                  <ZoomOutIcon className="size-4" />
                </Button>
                <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Zoom in"
                  onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                  disabled={!proofUrl || zoom >= 4}
                >
                  <ZoomInIcon className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setZoom(1)}
                  disabled={zoom === 1}
                >
                  Reset
                </Button>
              </div>
            ) : (
              <span />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                proofUrl?.signedUrl && window.open(proofUrl.signedUrl, '_blank')
              }
              disabled={!proofUrl}
            >
              <ExternalLinkIcon className="size-4" />
              Open in new tab
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
