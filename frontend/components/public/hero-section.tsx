"use client"

import { motion } from "framer-motion"
import { Search } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden md:min-h-[calc(100vh-5rem)]">
      {/* Background layers */}
      <div className="bg-mesh absolute inset-0" />
      <div className="bg-grid absolute inset-0" />

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
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col items-center justify-center gap-6 px-4 text-center md:min-h-[calc(100vh-5rem)]">
        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground"
        >
          <span className="size-2 rounded-full bg-primary/40" />
          آنلاین — آماده رزرو
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl"
        >
          <span>توپ‌</span>
          <span className="text-primary">سِت</span>
        </motion.h1>

        {/* Animated divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="h-px w-32 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="max-w-md text-muted-foreground"
        >
          سامانه هوشمند رزرو آنلاین زمین‌های ورزشی
        </motion.p>

        {/* Mock search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="flex w-full max-w-md items-center gap-3 rounded-2xl border bg-card/80 p-3"
        >
          <Search className="size-5 text-muted-foreground/50" />
          <div className="flex-1 text-right text-sm text-muted-foreground/60">
            جستجوی سالن، ورزش، یا منطقه...
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            رزرو سریع
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute inset-x-0 bottom-8 z-10 flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
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
