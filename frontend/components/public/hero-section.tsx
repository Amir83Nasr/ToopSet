"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { Search, Zap, Activity, Timer } from "lucide-react"

export function HeroSection() {
  const { scrollYProgress } = useScroll({
    offset: ["start start", "end start"],
  })

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"])
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.3, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9])

  return (
    <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden md:min-h-[calc(100vh-5rem)]">
      {/* Background layers */}
      <motion.div className="bg-mesh absolute inset-0" style={{ y: bgY }} />
      <motion.div
        className="bg-grid absolute inset-0"
        style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "30%"]) }}
      />

      {/* Large background watermark text */}
      <motion.div
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
        style={{ y: bgY }}
      >
        <span className="text-[clamp(8rem,20vw,20rem)] font-black tracking-tighter text-foreground/[0.015]">
          توپ‌سِت
        </span>
      </motion.div>

      {/* Central glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="size-[700px] rounded-full bg-primary/8 blur-[140px]"
        />
      </div>

      {/* Main content */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity, scale }}
        className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col items-center justify-center gap-6 px-4 text-center md:min-h-[calc(100vh-5rem)]"
      >
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground"
          >
            <span className="size-2 rounded-full bg-primary/40" />
            آنلاین — آماده رزرو
          </motion.div>

        {/* Headline — big and bold */}
        <h1 className="flex flex-wrap items-baseline justify-center gap-x-4 text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl">
          {"توپ‌".split("").map((char, i) => (
            <motion.span
              key={`toop-${i}`}
              custom={i}
              variants={{
                hidden: { opacity: 0, y: 80, rotateX: -30 },
                visible: (i: number) => ({
                  opacity: 1,
                  y: 0,
                  rotateX: 0,
                  transition: {
                    type: "spring" as const,
                    stiffness: 180,
                    damping: 18,
                    delay: 0.3 + i * 0.15,
                  },
                }),
              }}
              initial="hidden"
              animate="visible"
              className="inline-block"
            >
              {char}
            </motion.span>
          ))}
          <motion.span
            initial={{ opacity: 0, scale: 0, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{
              type: "spring" as const,
              stiffness: 300,
              damping: 12,
              delay: 0.7,
            }}
            className="inline-block text-primary"
          >
            سِت
          </motion.span>
        </h1>

        {/* Animated divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="h-px w-32 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="max-w-md text-muted-foreground"
        >
          سامانه هوشمند رزرو آنلاین زمین‌های ورزشی
        </motion.p>

        {/* Mock search bar */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="flex w-full max-w-md items-center gap-3 rounded-2xl border bg-card/80 p-3 backdrop-blur-sm"
        >
          <Search className="size-5 text-muted-foreground/50" />
          <div className="flex-1 text-right text-sm text-muted-foreground/60">
            جستجوی سالن، ورزش، یا منطقه...
          </div>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
          >
            <Zap className="size-3.5" />
            رزرو سریع
          </motion.div>
        </motion.div>

        {/* Sport badges */}
        <motion.div
          initial="hidden"
          animate="visible"
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {[
            { label: "والیبال", icon: Activity },
            { label: "بسکتبال", icon: Timer },
            { label: "فوتسال", icon: Zap },
            { label: "هندبال", icon: Activity },
          ].map((sport, i) => {
            const Icon = sport.icon
            return (
              <motion.div
                key={sport.label}
                custom={i}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.8 },
                  visible: (i: number) => ({
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring" as const,
                      stiffness: 200,
                      damping: 16,
                      delay: 1.4 + i * 0.12,
                    },
                  }),
                }}
                className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-sm text-muted-foreground"
              >
                <Icon className="size-4 text-primary/50" />
                {sport.label}
              </motion.div>
            )
          })}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute inset-x-0 bottom-8 z-10 flex justify-center"
        style={{
          opacity: useTransform(scrollYProgress, [0, 0.15], [1, 0]),
        }}
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[10px] text-muted-foreground/40">
            اسکرول
          </span>
          <div className="h-10 w-px bg-gradient-to-b from-primary/30 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  )
}
