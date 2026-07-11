"use client"

import { useCallback, useState } from "react"
import Image from "next/image"
import { toast } from "@/lib/toast"
import {
  buildAvatarUrl,
  uploadFile,
  type UploadResult,
  ApiError,
} from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
  maxImages = 10,
  minImages = 3,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

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
        {images.map((url, index) => {
          const normalizedUrl = buildAvatarUrl(url) || url
          const hasFailed = failedImages.has(url)
          return (
            <div
              key={url}
              className="group relative size-24 overflow-hidden rounded-lg border"
            >
              {hasFailed ? (
                <div className="flex size-full items-center justify-center bg-muted">
                  <span className="text-xs text-muted-foreground/50">خطا</span>
                </div>
              ) : (
                <Image
                  src={normalizedUrl}
                  alt={`تصویر ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="96px"
                  unoptimized
                  onError={() => {
                    setFailedImages((prev) => new Set(prev).add(url))
                  }}
                />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removeImage(index)}
                className="absolute inset-0 flex size-full items-center justify-center rounded-none bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="size-5 text-white" />
              </Button>
            </div>
          )
        })}

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
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {toPersianDigits(images.length)} از {toPersianDigits(maxImages)}{" "}
            تصویر
          </p>
          {canUpload && (
            <p className="text-xs text-muted-foreground">
              {toPersianDigits(maxImages - images.length)} تصویر قابل آپلود
            </p>
          )}
        </div>
      )}
      {minImages && images.length < minImages && (
        <p className="text-xs text-destructive">
          حداقل {toPersianDigits(minImages)} تصویر الزامی است (
          {toPersianDigits(minImages - images.length)} تصویر دیگر)
        </p>
      )}
    </div>
  )
}
