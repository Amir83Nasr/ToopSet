"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { Send, CheckCircle2, Loader2, MapPin, Phone, Mail, Clock } from "lucide-react"

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" })
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
    } catch (err: any) {
      setError(err?.message || "خطا در ارسال پیام. لطفاً دوباره تلاش کنید.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="px-4 py-12 md:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-bold md:text-4xl">ارتباط با ما</h1>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
                برای سوالات، پیشنهادات و انتقادات خود با ما در تماس باشید
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Contact Info Sidebar */}
              <div className="space-y-6 md:col-span-1">
                <Card>
                  <CardContent className="pt-6 space-y-5">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 size-5 text-primary" />
                      <div>
                        <h4 className="text-sm font-medium">آدرس</h4>
                        <p className="text-sm text-muted-foreground">
                          تهران، خیابان ولیعصر، مجتمع ورزشی توپ سِت
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 size-5 text-primary" />
                      <div>
                        <h4 className="text-sm font-medium">تلفن</h4>
                        <p className="text-sm text-muted-foreground" dir="ltr">۰۲۱-۱۲۳۴۵۶۷۸</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 size-5 text-primary" />
                      <div>
                        <h4 className="text-sm font-medium">ایمیل</h4>
                        <p className="text-sm text-muted-foreground">info@toopset.com</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="mt-0.5 size-5 text-primary" />
                      <div>
                        <h4 className="text-sm font-medium">ساعت کاری</h4>
                        <p className="text-sm text-muted-foreground">همه‌روزه ۸ صبح تا ۱۲ شب</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Form */}
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>فرم تماس</CardTitle>
                    <CardDescription>
                      پیام خود را بنویسید، تیم پشتیبانی در اسرع وقت پاسخ خواهد داد
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {success ? (
                      <div className="flex flex-col items-center gap-4 py-12 text-center">
                        <CheckCircle2 className="size-16 text-primary" />
                        <h3 className="text-xl font-semibold">پیام شما با موفقیت ارسال شد</h3>
                        <p className="text-muted-foreground">
                          از ارتباط شما سپاسگزاریم. در اسرع وقت با شما تماس خواهیم گرفت.
                        </p>
                        <Button variant="outline" onClick={() => setSuccess(false)}>
                          ارسال پیام جدید
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="name">نام و نام خانوادگی *</Label>
                            <Input
                              id="name"
                              required
                              placeholder="نام خود را وارد کنید"
                              value={form.name}
                              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="phone">تلفن تماس</Label>
                            <Input
                              id="phone"
                              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                              value={form.phone}
                              onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="subject">موضوع *</Label>
                            <Input
                              id="subject"
                              required
                              placeholder="موضوع پیام"
                              value={form.subject}
                              onChange={(e) => setForm({ ...form, subject: e.target.value })}
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
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                          />
                        </div>
                        {error && (
                          <p className="text-sm text-destructive">{error}</p>
                        )}
                        <Button type="submit" disabled={submitting} className="gap-2">
                          {submitting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Send className="size-4" />
                          )}
                          {submitting ? "در حال ارسال..." : "ارسال پیام"}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
