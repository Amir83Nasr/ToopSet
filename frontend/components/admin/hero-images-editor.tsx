"use client"

import { useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { getCookie } from "@/lib/cookies"
import { toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "@/lib/toast"
import { ImagePlus, Loader2, Trash2, Image } from "lucide-react"
import { Card } from "../ui/card"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface Props {
  settingId: number
  className?: string
}

export function HeroImagesEditor({ settingId, className }: Props) {
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  async function loadImages() {
    try {
      const all = await api<
        { id: number; key: string; value: string; description?: string }[]
      >("/api/v1/admin/settings")
      const hero = all.find((s) => s.key === "login_hero_slides")
      if (hero?.value) {
        try {
          const parsed = JSON.parse(hero.value)
          if (Array.isArray(parsed)) {
            setImages(
              parsed.filter(
                (s): s is string =>
                  typeof s === "string" &&
                  (s.startsWith("http") || s.startsWith("/"))
              )
            )
          }
        } catch {
          setImages([])
        }
      } else {
        setImages([])
      }
    } catch {
      toast.error("خطا در دریافت تصاویر")
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await loadImages()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`${API_BASE}/api/v1/admin/hero-images/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getCookie("access_token")}`,
        },
        body: formData,
      })

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ detail: "خطا در آپلود تصویر" }))
        throw new Error(err.detail || "خطا در آپلود تصویر")
      }

      await loadImages()
      toast.success("تصویر با موفقیت آپلود شد")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در آپلود تصویر")
    } finally {
      setUploading(false)
      // Reset the input so the same file can be selected again
      e.target.value = ""
    }
  }

  async function handleDelete(index: number) {
    try {
      await api<{ urls: string[] }>(
        `/api/v1/admin/settings/${settingId}/hero-images/${index}`,
        { method: "DELETE" }
      )
      await loadImages()
      toast.success("تصویر حذف شد")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در حذف تصویر")
    }
  }

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center py-8 ${className ?? ""}`}
      >
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="size-4 text-primary" />
          <h3 className="font-medium">تصاویر صفحات ورود و ثبت‌نام</h3>
        </div>
      </div>

      {/* Image grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((url, i) => (
            <div
              key={i}
              className="group relative aspect-4/3 overflow-hidden rounded-lg border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`تصویر ${i + 1}`}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleDelete(i)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                {toPersianDigits(i + 1)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
          <Image className="size-10 text-muted-foreground/50" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              هنوز تصویری آپلود نشده
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              تصاویر با نسبت ۴:۳ و حداقل ۸۰۰px عرض توصیه می‌شود — فرمت SVG نیز
              پشتیبانی می‌شود
            </p>
          </div>
        </Card>
      )}

      {/* Upload button — with background */}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="button"
          variant="outline"
          size={"sm"}
          disabled={uploading}
          className="relative"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          {uploading ? "در حال آپلود..." : "افزودن تصویر"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={handleUpload}
            disabled={uploading}
          />
        </Button>
        <p className="text-xs text-muted-foreground">
          فرمت‌های مجاز: JPEG, PNG, WebP, SVG — حداکثر ۵ مگابایت
        </p>
      </div>
    </div>
  )
}
