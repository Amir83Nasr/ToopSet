"use client"

import { motion } from "framer-motion"

const orbs = [
  { size: 300, color: "bg-primary/8", blur: "blur-[100px]", x: "-15%", y: "-20%", delay: 0 },
  { size: 200, color: "bg-blue-500/6", blur: "blur-[80px]", x: "55%", y: "-10%", delay: 1.2 },
  { size: 180, color: "bg-teal-400/6", blur: "blur-[70px]", x: "20%", y: "45%", delay: 0.6 },
]

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-24 md:pb-28 md:pt-32">
      <div className="bg-grid absolute inset-0" />

      {/* Glow behind headline */}
      <div className="absolute inset-0 flex items-start justify-center pt-32 md:pt-44">
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
          className="size-[500px] rounded-full bg-primary/10 blur-[120px]"
        />
      </div>

      {/* Floating orbs */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            marginLeft: -(orb.size / 2),
            marginTop: -(orb.size / 2),
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            x: [0, 15, 0, -12, 0],
            y: [0, -12, -24, -10, 0],
          }}
          transition={{
            opacity: { duration: 0.8, delay: 0.4 + orb.delay },
            x: {
              duration: 7 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: orb.delay,
            },
            y: {
              duration: 6 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: orb.delay,
            },
          }}
        >
          <div className={`size-full rounded-full ${orb.color} ${orb.blur}`} />
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-full border bg-muted/50 px-3.5 py-1 text-xs text-muted-foreground"
        >
          سامانه هوشمند رزرو زمین ورزشی
        </motion.div>

        <div className="space-y-5">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
          >
            توپ‌
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2, type: "spring" as const, stiffness: 200 }}
              className="text-primary"
            >
              سِت
            </motion.span>
          </motion.h1>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="mx-auto h-px w-12 origin-center bg-primary/40"
          />

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mx-auto max-w-xl text-lg text-muted-foreground md:text-xl"
          >
            والیبال، بسکتبال، فوتسال و هندبال
          </motion.p>
        </div>
      </motion.div>
    </section>
  )
}
