"use client"

import { useCallback, useState } from "react"
import { uploadFile } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ImagePlus, Loader2, Trash2, X } from "lucide-react"

interface ImageUploadProps {
  images: string[]
  onChange: (images: string[]) => void
  maxImages?: number
}

export function ImageUpload({ images, onChange, maxImages = 5 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploading(true)
      try {
        const url = await uploadFile(file)
        onChange([...images, url])
      } catch {
        // toast is handled by the parent form
      } finally {
        setUploading(false)
        // Reset the input
        e.target.value = ""
      }
    },
    [images, onChange],
  )

  const removeImage = useCallback(
    (index: number) => {
      onChange(images.filter((_, i) => i !== index))
    },
    [images, onChange],
  )

  const canUpload = images.length < maxImages

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => (
          <div key={url} className="group relative size-24 overflow-hidden rounded-lg border">
            <img
              src={url}
              alt={`تصویر ${index + 1}`}
              className="size-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="size-5 text-white" />
            </button>
          </div>
        ))}

        {/* Upload placeholder */}
        {canUpload && (
          <label className="flex size-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            {uploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <ImagePlus className="size-6" />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>
      {images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {images.length} از {maxImages} تصویر
        </p>
      )}
    </div>
  )
}
