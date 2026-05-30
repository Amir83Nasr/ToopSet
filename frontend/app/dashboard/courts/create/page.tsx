"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { courtCreateSchema, type CourtCreateInput } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api"
import { AmenityCheckboxes } from "@/components/courts/amenity-checkboxes"
import { ImageUpload } from "@/components/courts/image-upload"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { motion } from "framer-motion"
import dynamic from "next/dynamic"
const LocationPicker = dynamic(
  () =>
    import("@/components/courts/location-picker").then((m) => ({
      default: m.LocationPicker,
    })),
  { ssr: false }
)
import {
  Building2,
  MapPin,
  Image as ImageIcon,
  Users,
  Settings2,
  ArrowRight,
  CheckCircle2,
  Trophy,
} from "lucide-react"
import { PersianInput } from "@/components/ui/persian-input"

const sportTypes = [
  { value: "volleyball", label: "والیبال" },
  { value: "basketball", label: "بسکتبال" },
  { value: "futsal", label: "فوتسال" },
  { value: "handball", label: "هندبال" },
]

const sportColors: Record<string, string> = {
  volleyball:
    "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20 has-checked:border-blue-500 has-checked:bg-blue-50 dark:has-checked:bg-blue-950/40",
  basketball:
    "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20 has-checked:border-orange-500 has-checked:bg-orange-50 dark:has-checked:bg-orange-950/40",
  futsal:
    "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20 has-checked:border-green-500 has-checked:bg-green-50 dark:has-checked:bg-green-950/40",
  handball:
    "border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20 has-checked:border-purple-500 has-checked:bg-purple-50 dark:has-checked:bg-purple-950/40",
}

const sportIndicator: Record<string, string> = {
  volleyball: "bg-blue-500",
  basketball: "bg-orange-500",
  futsal: "bg-green-500",
  handball: "bg-purple-500",
}

interface SectionProps {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  delay?: number
}

function FormSection({
  icon,
  title,
  description,
  children,
  delay = 0,
}: SectionProps) {
  return (
    <ScrollReveal>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
        className="rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="flex items-start gap-4 border-b p-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </ScrollReveal>
  )
}

export default function CreateCourtPage() {
  const router = useRouter()
  const [courtImages, setCourtImages] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CourtCreateInput>({
    resolver: zodResolver(courtCreateSchema) as any,
    defaultValues: {
      name: "",
      sport_types: [],
      address: "",
      latitude: undefined as any,
      longitude: undefined as any,
      capacity: 10,
      amenities: {},
      images: [],
    },
  })
  const selectedSports: string[] =
    (useWatch({ control, name: "sport_types" }) as string[]) || []
  const amenitiesValue = useWatch({ control, name: "amenities" }) || {}

  async function onSubmit(data: CourtCreateInput) {
    try {
      await api("/api/v1/courts", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          sport_types: data.sport_types,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          capacity: data.capacity,
          amenities: data.amenities || {},
          images: courtImages,
        }),
      })
      toast.success("مجموعه ورزشی با موفقیت ایجاد شد")
      router.push("/dashboard/courts")
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "خطا در ایجاد مجموعه"
      toast.error(message)
    }
  }

  function toggleSport(value: string) {
    const current = selectedSports
    if (current.includes(value)) {
      setValue(
        "sport_types",
        current.filter((s) => s !== value) as never,
        { shouldValidate: true }
      )
    } else {
      setValue("sport_types", [...current, value] as never, { shouldValidate: true })
    }
  }

  return (
    <div className="relative pb-12">
      {/* Floating glow */}
      <div className="neon-orb neon-orb-1 pointer-events-none" />
      <div className="neon-orb neon-orb-cyan pointer-events-none max-lg:hidden" />

      <div className="relative">
        {/* ── Hero ─────────────────────────────────── */}
        <ScrollReveal>
          <div className="relative mb-10 overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background">
            <div className="bg-mesh absolute inset-0" />
            <div className="bg-grid absolute inset-0 opacity-[0.03]" />
            <div className="relative px-8 py-12 md:py-16 md:px-12">
              <Button
                variant="ghost"
                className="mb-6"
                onClick={() => router.back()}
              >
                <ArrowRight className="ml-2 size-4" />
                بازگشت
              </Button>
              <div className="flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                  <Building2 className="size-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                    ثبت مجموعه ورزشی جدید
                  </h1>
                  <p className="mt-2 max-w-xl text-base text-muted-foreground">
                    اطلاعات مجموعه ورزشی خود را وارد کنید تا پس از تأیید، در
                    دسترس کاربران قرار گیرد.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>ثبت رایگان</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>مدیریت آنلاین زمان‌ها</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>دریافت بازخورد از کاربران</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mx-auto max-w-4xl space-y-8"
        >
          {/* ── Basic Info ──────────────────────────── */}
          <FormSection
            icon={<Building2 className="size-6" />}
            title="اطلاعات پایه"
            description="نام و مشخصات اصلی مجموعه ورزشی"
            delay={0.1}
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base">
                  نام مجموعه
                </Label>
                <Input
                  id="name"
                  placeholder="مثلاً مجموعه ورزشی آزادی"
                  className="h-12 text-base"
                  {...register("name")}
                />
                {errors.name?.message && (
                  <p className="text-sm text-destructive">
                    {String(errors.name.message)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-base">نوع ورزش‌های موجود</Label>
                <p className="text-sm text-muted-foreground">
                  حداقل یک نوع ورزش را انتخاب کنید
                </p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {sportTypes.map((sport) => {
                    const checked = selectedSports.includes(sport.value)
                    return (
                      <label
                        key={sport.value}
                        className={`group relative flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all has-checked:shadow-sm ${
                          checked
                            ? sportColors[sport.value] +
                              " shadow-primary/5"
                            : "border-border hover:border-primary/30 hover:bg-accent/30"
                        }`}
                      >
                        <span
                          className={`size-10 rounded-full ${sportIndicator[sport.value]} flex items-center justify-center shadow-sm transition-transform group-has-checked:scale-110`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleSport(sport.value)}
                            className="border-white/60 text-white data-[state=checked]:bg-white/20 data-[state=checked]:text-white"
                          />
                        </span>
                        <span className="text-sm font-medium">
                          {sport.label}
                        </span>
                      </label>
                    )
                  })}
                </div>
                {errors.sport_types?.message && (
                  <p className="text-sm text-destructive">
                    {String(errors.sport_types.message)}
                  </p>
                )}
              </div>
            </div>
          </FormSection>

          {/* ── Location ───────────────────────────── */}
          <FormSection
            icon={<MapPin className="size-6" />}
            title="موقعیت و آدرس"
            description="مکان دقیق مجموعه را روی نقشه مشخص کنید"
            delay={0.2}
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-base">
                  آدرس کامل
                </Label>
                <Textarea
                  id="address"
                  placeholder="استان، شهر، خیابان، پلاک"
                  className="min-h-[80px] text-base"
                  {...register("address")}
                />
                {errors.address?.message && (
                  <p className="text-sm text-destructive">
                    {String(errors.address.message)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-base">موقعیت روی نقشه</Label>
                <p className="text-sm text-muted-foreground">
                  روی نقشه کلیک کنید یا نشانگر را بکشید — آدرس به‌صورت خودکار
                  تکمیل می‌شود
                </p>
                <LocationPicker
                  latitude={useWatch({ control, name: "latitude" }) ?? null}
                  longitude={useWatch({ control, name: "longitude" }) ?? null}
                  onLocationChange={(lat, lng, address) => {
                    setValue("latitude", lat, { shouldValidate: true })
                    setValue("longitude", lng, { shouldValidate: true })
                    if (address) {
                      setValue("address", address, { shouldValidate: true })
                    }
                  }}
                />
                {(errors.latitude?.message ||
                  errors.longitude?.message) && (
                  <p className="text-sm text-destructive">
                    {String(
                      errors.latitude?.message || errors.longitude?.message
                    )}
                  </p>
                )}
              </div>
            </div>
          </FormSection>

          {/* ── Capacity ───────────────────────────── */}
          <FormSection
            icon={<Users className="size-6" />}
            title="ظرفیت"
            description="تعداد نفراتی که می‌توانند هم‌زمان از مجموعه استفاده کنند"
            delay={0.3}
          >
            <div className="space-y-2">
              <Label htmlFor="capacity" className="text-base">
                ظرفیت مجموعه
              </Label>
              <PersianInput
                id="capacity"
                placeholder="۱۰"
                className="h-12 max-w-[140px] text-base [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                {...register("capacity", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                حداکثر تعداد نفراتی که هم‌زمان می‌توانند در مجموعه حضور داشته
                باشند
              </p>
              {errors.capacity?.message && (
                <p className="text-sm text-destructive">
                  {String(errors.capacity.message)}
                </p>
              )}
            </div>
          </FormSection>

          {/* ── Amenities ──────────────────────────── */}
          <FormSection
            icon={<Settings2 className="size-6" />}
            title="امکانات"
            description="امکانات موجود در مجموعه را انتخاب کنید"
            delay={0.4}
          >
            <AmenityCheckboxes
               value={amenitiesValue as Record<string, boolean>}
              onChange={(v) => setValue("amenities", v)}
            />
          </FormSection>

          {/* ── Images ─────────────────────────────── */}
          <FormSection
            icon={<ImageIcon className="size-6" />}
            title="تصاویر"
            description="تصاویر مجموعه را آپلود کنید (حداقل ۳ تصویر الزامی)"
            delay={0.5}
          >
            <ImageUpload images={courtImages} onChange={setCourtImages} />
            {errors.images && (
              <p className="mt-2 text-sm text-destructive">
                {String(errors.images.message || errors.images.root?.message)}
              </p>
            )}
          </FormSection>

          {/* ── Submit ─────────────────────────────── */}
          <ScrollReveal>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
              className="rounded-2xl border bg-gradient-to-r from-primary/5 via-primary/[0.02] to-background p-6 shadow-sm md:p-8"
            >
              <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-right">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/20">
                  <Trophy className="size-7 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    آماده ثبت مجموعه هستید؟
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    پس از ثبت، مجموعه شما توسط مدیریت بررسی و تأیید خواهد شد.
                  </p>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="h-14 min-w-[200px] gap-2 text-base shadow-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="size-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      در حال ثبت...
                    </>
                  ) : (
                    <>
                      <Trophy className="size-5" />
                      ثبت مجموعه
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </ScrollReveal>
        </form>
      </div>
    </div>
  )
}
