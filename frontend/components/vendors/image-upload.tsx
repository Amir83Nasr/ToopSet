"use client"

import { useCallback, useState } from "react"
import Image from "next/image"
import { toast } from "@/lib/toast"
import {
  buildVendorImageUrl,
  uploadFile,
  type UploadResult,
  ApiError,
} from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react"

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

  const setMainImage = useCallback(
    (index: number) => {
      if (index === 0) return
      const nextImages = [...images]
      const [selectedImage] = nextImages.splice(index, 1)
      onChange([selectedImage, ...nextImages])
      if (onTempIdsChange && tempIds?.length === images.length) {
        const nextTempIds = [...tempIds]
        const [selectedTempId] = nextTempIds.splice(index, 1)
        onTempIdsChange([selectedTempId, ...nextTempIds])
      }
    },
    [images, onChange, tempIds, onTempIdsChange]
  )

  const canUpload = images.length < maxImages

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {images.map((url, index) => {
          const normalizedUrl = buildVendorImageUrl(url)
          const hasFailed = failedImages.has(url)
          return (
            <div
              key={url}
              className={`group relative aspect-square overflow-hidden rounded-xl border-2 bg-muted/40 transition-all ${
                index === 0 ? "border-primary shadow-md ring-2 ring-primary/20" : "border-border hover:border-primary/50"
              }`}
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
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 200px"
                  unoptimized
                  onError={() => {
                    setFailedImages((prev) => new Set(prev).add(url))
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-80 group-hover:opacity-100 transition-opacity" />
              {index === 0 ? (
                <span className="absolute inset-x-2 bottom-2 flex h-7 items-center justify-center gap-1.5 rounded-lg bg-primary px-2 text-xs font-bold text-primary-foreground shadow-md">
                  <Star className="size-3.5 fill-current" />
                  عکس اصلی
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={`انتخاب تصویر ${toPersianDigits(index + 1)} به عنوان عکس اصلی`}
                  onClick={() => setMainImage(index)}
                  className="absolute inset-x-2 bottom-2 flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-black/75 px-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-primary"
                >
                  <Star className="size-3.5" />
                  انتخاب اصلی
                </button>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label={`حذف تصویر ${toPersianDigits(index + 1)}`}
                onClick={() => removeImage(index)}
                className="absolute end-2 top-2 z-10 size-8 rounded-lg bg-black/70 text-white shadow-md backdrop-blur-sm transition-transform hover:scale-110 hover:bg-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )
        })}

        {/* Upload placeholder */}
        {canUpload && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary">
            {uploading ? (
              <Loader2 className="size-8 animate-spin text-primary" />
            ) : (
              <>
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ImagePlus className="size-6" />
                </div>
                <span className="text-xs font-medium">افزودن تصویر</span>
              </>
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
