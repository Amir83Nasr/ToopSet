"use client"

import { motion } from "framer-motion"

const steps = [
  { title: "جستجو", description: "ورزش مورد نظر خود را انتخاب کنید" },
  { title: "انتخاب", description: "سانس مورد نظر خود را در تاریخ دلخواه انتخاب کنید" },
  { title: "رزرو", description: "به صورت آنلاین پرداخت کنید و رزرو را قطعی کنید" },
  { title: "بازی", description: "در ساعت مقرر در زمین حاضر شوید و از ورزش لذت ببرید" },
]

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const step = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden border-t px-4 py-16 md:py-20">
      <div className="bg-grid absolute inset-0 opacity-50" />
      <div className="relative z-10 mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            چطور کار می‌کند
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            تنها با ۴ قدم ساده، زمین ورزشی خود را رزرو کنید
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-8 md:grid-cols-4"
        >
          {steps.map((stepItem, index) => (
            <motion.div
              key={stepItem.title}
              variants={step}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 20,
                  delay: index * 0.15,
                }}
                className="mb-3 flex size-8 items-center justify-center rounded-full border text-sm font-medium text-muted-foreground"
              >
                {index + 1}
              </motion.div>
              <h3 className="mb-1 font-semibold">{stepItem.title}</h3>
              <p className="max-w-[180px] text-sm text-muted-foreground">
                {stepItem.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
