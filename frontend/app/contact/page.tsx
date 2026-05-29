"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import {
  Send,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Clock,
} from "lucide-react"

const contactInfo = [
  {
    icon: MapPin,
    label: "آدرس",
    value: "تهران، خیابان ولیعصر، مجتمع ورزشی توپ‌سِت",
  },
  { icon: Phone, label: "تلفن", value: "۰۲۱-۱۲۳۴۵۶۷۸", dir: "ltr" as const },
  { icon: Mail, label: "ایمیل", value: "info@toopset.com" },
  { icon: Clock, label: "ساعت کاری", value: "همه‌روزه ۸ صبح تا ۱۲ شب" },
]

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      await api("/api/v1/contact", {
        method: "POST",
        body: JSON.stringify(form),
      })
      setSuccess(true)
      setForm({ name: "", email: "", phone: "", subject: "", message: "" })
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ارسال پیام. لطفاً دوباره تلاش کنید."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden px-4 py-12 md:py-20">
          <div className="neon-orb neon-orb-1 !top-[-120px] !right-[-80px]" />
          <div className="neon-orb neon-orb-cyan !bottom-[-100px] !left-[-60px]" />
          <div className="bg-grid pointer-events-none absolute inset-0" />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 mx-auto max-w-5xl"
          >
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-bold md:text-4xl">ارتباط با ما</h1>
              <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
                برای سوالات، پیشنهادات و انتقادات خود با ما در تماس باشید
              </p>
            </div>

            <div className="grid gap-10 md:grid-cols-3">
              {/* Contact Info */}
              <motion.div
                variants={container}
                initial="hidden"
                animate="visible"
                className="space-y-6 md:col-span-1"
              >
                {contactInfo.map((info) => {
                  const Icon = info.icon
                  return (
                    <motion.div
                      key={info.label}
                      variants={item}
                      className="flex items-start gap-3"
                    >
                      <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div>
                        <h4 className="text-sm font-medium">{info.label}</h4>
                        <p
                          className="text-sm text-muted-foreground"
                          dir={info.dir}
                        >
                          {info.value}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>

              {/* Contact Form */}
              <div className="md:col-span-2">
                {success ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4 py-16 text-center"
                  >
                    <CheckCircle2 className="size-16 text-primary" />
                    <h3 className="text-xl font-semibold">
                      پیام شما با موفقیت ارسال شد
                    </h3>
                    <p className="max-w-sm text-muted-foreground">
                      از ارتباط شما سپاسگزاریم. در اسرع وقت با شما تماس خواهیم
                      گرفت.
                    </p>
                    <Button variant="outline" onClick={() => setSuccess(false)}>
                      ارسال پیام جدید
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onSubmit={handleSubmit}
                    className="space-y-5 rounded-xl border bg-card p-6 md:p-8"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">نام و نام خانوادگی *</Label>
                        <Input
                          id="name"
                          required
                          placeholder="نام خود را وارد کنید"
                          value={form.name}
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">ایمیل *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          placeholder="example@email.com"
                          value={form.email}
                          onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">تلفن تماس</Label>
                        <Input
                          id="phone"
                          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                          value={form.phone}
                          onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">موضوع *</Label>
                        <Input
                          id="subject"
                          required
                          placeholder="موضوع پیام"
                          value={form.subject}
                          onChange={(e) =>
                            setForm({ ...form, subject: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">متن پیام *</Label>
                      <Textarea
                        id="message"
                        required
                        rows={6}
                        placeholder="پیام خود را بنویسید..."
                        value={form.message}
                        onChange={(e) =>
                          setForm({ ...form, message: e.target.value })
                        }
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                    <Button
                      type="submit"
                      disabled={submitting}
                      size="lg"
                      className="gap-2"
                    >
                      {submitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      {submitting ? "در حال ارسال..." : "ارسال پیام"}
                    </Button>
                  </motion.form>
                )}
              </div>
            </div>
          </motion.div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
