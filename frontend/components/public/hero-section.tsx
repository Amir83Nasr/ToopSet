"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ArrowLeft, Map } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HeroAnimatedIllustration } from "@/components/public/hero-illustration-v2"

export function HeroSection() {
  const router = useRouter()

  return (
    <section className="relative overflow-hidden py-12 md:py-24">
      <div className="relative z-10 mx-auto max-w-7xl px-4 text-right">
        {/* Split layout */}
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            {/* Top badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/4 px-4 py-2 text-[10px] font-bold text-muted-foreground backdrop-blur-sm sm:text-xs"
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              <span>سامانه هوشمند رزرو آنلاین مجموعه‌های ورزشی</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-2xl leading-tight font-extrabold text-foreground sm:text-3xl sm:leading-snug lg:text-4xl lg:leading-normal"
            >
              پلتفرم هوشمند رزرو
              <br />
              <span className="shimmer-text bg-linear-to-l from-primary via-primary/80 to-primary/60 bg-clip-text font-extrabold text-transparent dark:from-primary dark:via-primary/80 dark:to-primary/60">
                سالن‌های ورزشی
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="max-w-2xl text-sm leading-relaxed font-extrabold text-muted-foreground sm:text-base sm:leading-8"
            >
              سامانه هوشمند{" "}
              <strong className="font-extrabold text-primary">توپ‌سِت</strong>{" "}
              پلتفرم جامع رزرو آنلاین مجموعه‌های ورزشی. به راحتی سالن مورد نظر
              خود را پیدا کنید، قیمت‌ها را مقایسه کنید و سانس دلخواه را رزرو
              نمایید.
            </motion.p>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex flex-col gap-3 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5"
            >
              <Button
                onClick={() => router.push("/vendors")}
                className="w-full px-3 font-semibold sm:w-auto"
              >
                <span>شروع رزرو آنلاین</span>
                <ArrowLeft className="size-4 shrink-0" />
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push("/vendors")}
                className="w-full px-3 font-semibold sm:w-auto"
              >
                <Map className="size-4 shrink-0" />
                <span>مشاهده سالن‌های ورزشی</span>
              </Button>
            </motion.div>
          </div>

          {/* Left side illustration */}
          <div className="mt-10 mr-auto ml-25 hidden scale-125 lg:block">
            <HeroAnimatedIllustration />
          </div>
        </div>
      </div>
    </section>
  )
}
