"use client"

import { useCallback, useState } from "react"
import Image from "next/image"
import { toast } from "@/lib/toast"
import { uploadFile, type UploadResult, ApiError } from "@/lib/api"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"

interface ImageUploadProps {
  images: string[]
  onChange: (images: string[]) => void
  tempIds?: string[]
  onTempIdsChange?: (ids: string[]) => void
  maxImages?: number
  minImages?: number
}

export function ImageUpload({
  images,
  onChange,
  tempIds,
  onTempIdsChange,
  maxImages = 5,
  minImages = 3,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploading(true)
      try {
        const result: UploadResult = await uploadFile(file)
        onChange([...images, result.url])
        if (onTempIdsChange && tempIds) {
          onTempIdsChange([...tempIds, result.temp_id])
        }
      } catch (err) {
        console.error("Upload error:", err)
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof TypeError
              ? "خطا در اتصال به سرور"
              : "خطا در آپلود تصویر"
        toast.error(message)
      } finally {
        setUploading(false)
        e.target.value = ""
      }
    },
    [images, onChange, tempIds, onTempIdsChange]
  )

  const removeImage = useCallback(
    (index: number) => {
      onChange(images.filter((_, i) => i !== index))
      if (onTempIdsChange && tempIds) {
        onTempIdsChange(tempIds.filter((_, i) => i !== index))
      }
    },
    [images, onChange, tempIds, onTempIdsChange]
  )

  const canUpload = images.length < maxImages

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => (
          <div
            key={url}
            className="group relative size-24 overflow-hidden rounded-lg border"
          >
            <Image
              src={url}
              alt={`تصویر ${index + 1}`}
              fill
              className="object-cover"
              sizes="96px"
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
      {minImages && images.length < minImages && (
        <p className="text-xs text-destructive">
          حداقل {minImages} تصویر الزامی است ({minImages - images.length} تصویر
          دیگر)
        </p>
      )}
    </div>
  )
}
