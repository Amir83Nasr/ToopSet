import type { Metadata } from "next"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { CheckCircle, UserPlus, RefreshCw, Shield, Mail, Settings } from "lucide-react"

export const metadata: Metadata = {
  title: "قوانین و مقررات | توپ‌سِت",
  description: "قوانین و مقررات استفاده از سامانه توپ‌سِت",
}

const sections = [
  {
    icon: CheckCircle,
    title: "۱. پذیرش قوانین",
    body: "با استفاده از سامانه توپ‌سِت، شما قوانین و مقررات زیر را می‌پذیرید. در صورت عدم موافقت با هر یک از بندها، لطفاً از سامانه استفاده نکنید.",
  },
  {
    icon: UserPlus,
    title: "۲. ثبت‌نام و حساب کاربری",
    list: [
      "کاربران موظف به ارائه اطلاعات صحیح و کامل در هنگام ثبت‌نام هستند.",
      "مسئولیت حفظ امنیت حساب کاربری و رمز عبور بر عهده کاربر می‌باشد.",
      "هر کاربر تنها مجاز به داشتن یک حساب کاربری است.",
      "در صورت مشاهده هرگونه فعالیت مشکوک، توپ‌سِت حق مسدود کردن حساب را دارد.",
    ],
  },
  {
    icon: RefreshCw,
    title: "۳. رزرو و لغو",
    list: [
      "رزرو سانس پس از پرداخت هزینه قطعی می‌شود.",
      "لغو رزرو تا ۲۴ ساعت قبل از شروع سانس با کسر ۲۰٪ جریمه امکان‌پذیر است.",
      "لغو رزرو کمتر از ۲۴ ساعت قبل از شروع سانس امکان‌پذیر نیست.",
      "در صورت کنسل شدن سانس توسط مدیر مجموعه، مبلغ به طور کامل به کیف پول کاربر بازگردانده می‌شود.",
    ],
  },
  {
    icon: Shield,
    title: "۴. مسئولیت‌ها",
    list: [
      "توپ‌سِت تنها بستر ارتباط بین کاربران و مدیران مجموعه‌های ورزشی است.",
      "کیفیت و امکانات زمین‌های ورزشی بر عهده مدیران مجموعه می‌باشد.",
      "توپ‌سِت مسئولیتی در قبال خسارت‌های جسمی یا مالی حین استفاده از زمین‌ها ندارد.",
    ],
  },
  {
    icon: Mail,
    title: "۵. حریم خصوصی",
    body: "اطلاعات شخصی کاربران نزد توپ‌سِت محفوظ است و بدون رضایت کاربر در اختیار شخص ثالث قرار نمی‌گیرد، مگر به حکم قانون.",
  },
  {
    icon: Settings,
    title: "۶. تغییرات",
    body: "توپ‌سِت حق تغییر قوانین را در هر زمان محفوظ می‌دارد. تغییرات در همین صفحه اعلام خواهد شد و ادامه استفاده از سامانه به معنای پذیرش تغییرات است.",
  },
]

export default function TermsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="relative">
          {/* Full-screen diagonal hash */}
          <div className="bg-grid pointer-events-none absolute inset-0" />

          {/* Vertical hash side columns — like tailwindcss.com */}
          <div className="bg-fixed bg-[image:repeating-linear-gradient(315deg,hsl(var(--border)/.05)_0,hsl(var(--border)/.05)_1px,transparent_0,transparent_50%)] bg-[size:10px_10px] max-md:hidden absolute inset-y-0 left-[calc(50%+36rem)] w-12 border-l border-border/20" />
          <div className="bg-fixed bg-[image:repeating-linear-gradient(315deg,hsl(var(--border)/.05)_0,hsl(var(--border)/.05)_1px,transparent_0,transparent_50%)] bg-[size:10px_10px] max-md:hidden absolute inset-y-0 right-[calc(50%+36rem)] w-12 border-r border-border/20" />

          <div className="relative mx-auto max-w-3xl px-4 py-12 md:py-16">
            <div className="text-center">
              <div className="mb-6 inline-flex items-center justify-center rounded-2xl border bg-card p-3 shadow-xs">
                <CheckCircle className="size-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                قوانین و مقررات
              </h1>
              <p className="mt-2 text-muted-foreground">
                آخرین به‌روزرسانی: فروردین ۱۴۰۴
              </p>
            </div>

            <div className="mt-12 space-y-6">
              {sections.map((section, index) => {
                const Icon = section.icon
                return (
                  <div
                    key={index}
                    className="rounded-xl border bg-card p-6 shadow-xs transition-shadow hover:shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="size-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <h2 className="text-xl font-semibold">
                          {section.title}
                        </h2>
                        {section.body && (
                          <p className="text-muted-foreground leading-relaxed">
                            {section.body}
                          </p>
                        )}
                        {section.list && (
                          <ul className="space-y-2 pr-5">
                            {section.list.map((item, i) => (
                              <li
                                key={i}
                                className="text-muted-foreground leading-relaxed"
                              >
                                <span className="ml-2 text-primary/60">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
