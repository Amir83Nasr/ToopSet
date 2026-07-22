"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Map } from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"
import { useAuth } from "@/hooks/use-auth"

const DynamicHeroIllustration = dynamic(
  () =>
    import("@/components/public/hero-illustration-v2").then((m) => ({
      default: m.HeroAnimatedIllustration,
    })),
  { ssr: false }
)

const RegisterComplexDialog = dynamic(
  () =>
    import("@/components/public/register-complex-dialog").then((m) => ({
      default: m.RegisterComplexDialog,
    })),
  { ssr: false }
)

export function HeroSection() {
  const router = useRouter()
  const { user, isAuthenticated, loading } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleRegisterClick() {
    if (loading) return

    if (!isAuthenticated) {
      router.push("/login?reason=login_required&redirect=/")
      return
    }

    if (user?.role === "manager" || user?.role === "admin") {
      router.push("/dashboard/vendors/create")
      return
    }

    setDialogOpen(true)
  }

  return (
    <section className="relative overflow-hidden py-12 md:py-24">
      <div className="relative z-10 mx-auto max-w-7xl px-4 text-right">
        {/* Split layout */}
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            {/* Top badge — mounted entrance via CSS */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/4 px-4 py-2 text-[10px] font-bold text-muted-foreground backdrop-blur-sm sm:text-xs">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              <span>سامانه هوشمند رزرو آنلاین مجموعه‌های ورزشی</span>
            </div>

            <h1 className="text-3xl leading-tight font-extrabold text-foreground sm:text-4xl sm:leading-snug lg:text-5xl lg:leading-normal">
              پلتفرم هوشمند رزرو
              <br />
              <span className="font-extrabold text-primary">
                سالن‌های ورزشی
              </span>
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed font-medium text-muted-foreground sm:text-base sm:leading-8">
              سامانه هوشمند{" "}
              <strong className="font-extrabold text-primary">توپ‌سِت</strong>{" "}
              پلتفرم جامع رزرو آنلاین مجموعه‌های ورزشی. به راحتی سالن مورد نظر
              خود را پیدا کنید، قیمت‌ها را مقایسه کنید و سانس دلخواه را رزرو
              نمایید.
            </p>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
              <Button
                onClick={handleRegisterClick}
                className="w-full px-3 font-semibold sm:w-auto"
              >
                <Building2 className="size-4 shrink-0" />
                <span>ثبت مجموعه جدید</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push("/vendors")}
                className="w-full px-3 font-semibold sm:w-auto"
              >
                <Map className="size-4 shrink-0" />
                <span>مشاهده سالن‌های ورزشی</span>
              </Button>
            </div>
          </div>

          {/* Left side illustration */}
          <div className="me-0 hidden justify-self-end lg:block">
            <div className="scale-125">
              <DynamicHeroIllustration />
            </div>
          </div>
        </div>
      </div>

      <RegisterComplexDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  )
}
