import type { Metadata } from "next"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"

export const metadata: Metadata = {
  title: "قوانین و مقررات | توپ‌سِت",
  description: "قوانین و مقررات استفاده از سامانه توپ‌سِت",
}

const sections = [
  {
    title: "۱. پذیرش قوانین",
    body: "با استفاده از سامانه توپ‌سِت، شما قوانین و مقررات زیر را می‌پذیرید. در صورت عدم موافقت با هر یک از بندها، لطفاً از سامانه استفاده نکنید.",
  },
  {
    title: "۲. ثبت‌نام و حساب کاربری",
    items: [
      "کاربران موظف به ارائه اطلاعات صحیح و کامل در هنگام ثبت‌نام هستند.",
      "مسئولیت حفظ امنیت حساب کاربری و رمز عبور بر عهده کاربر می‌باشد.",
      "هر کاربر تنها مجاز به داشتن یک حساب کاربری است.",
      "در صورت مشاهده هرگونه فعالیت مشکوک، توپ‌سِت حق مسدود کردن حساب را دارد.",
    ],
  },
  {
    title: "۳. رزرو و لغو",
    items: [
      "رزرو سانس پس از پرداخت هزینه قطعی می‌شود.",
      "لغو رزرو تا ۲۴ ساعت قبل از شروع سانس با کسر ۲۰٪ جریمه امکان‌پذیر است.",
      "لغو رزرو کمتر از ۲۴ ساعت قبل از شروع سانس امکان‌پذیر نیست.",
      "در صورت کنسل شدن سانس توسط مدیر مجموعه، مبلغ به طور کامل به کیف پول کاربر بازگردانده می‌شود.",
    ],
  },
  {
    title: "۴. مسئولیت‌ها",
    items: [
      "توپ‌سِت تنها بستر ارتباط بین کاربران و مدیران مجموعه‌های ورزشی است.",
      "کیفیت و امکانات زمین‌های ورزشی بر عهده مدیران مجموعه می‌باشد.",
      "توپ‌سِت مسئولیتی در قبال خسارت‌های جسمی یا مالی حین استفاده از زمین‌ها ندارد.",
    ],
  },
  {
    title: "۵. حریم خصوصی",
    body: "اطلاعات شخصی کاربران نزد توپ‌سِت محفوظ است و بدون رضایت کاربر در اختیار شخص ثالث قرار نمی‌گیرد، مگر به حکم قانون.",
  },
  {
    title: "۶. تغییرات",
    body: "توپ‌سِت حق تغییر قوانین را در هر زمان محفوظ می‌دارد. تغییرات در همین صفحه اعلام خواهد شد و ادامه استفاده از سامانه به معنای پذیرش تغییرات است.",
  },
]

export default function TermsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="relative flex-1">
        {/* Neon orbs */}
        <div className="neon-orb neon-orb-1 !top-[-120px] !right-[-80px]" />
        <div className="neon-orb neon-orb-cyan !bottom-[-100px] !left-[-60px]" />

        {/* Vertical side columns */}
        <div className="bg-grid-side absolute inset-y-0 left-[calc(50%+36rem)] w-12 border-x border-t border-b border-border/20 max-md:hidden" />
        <div className="bg-grid-side absolute inset-y-0 right-[calc(50%+36rem)] w-12 border-x border-t border-b border-border/20 max-md:hidden" />

        <div className="relative mx-auto max-w-3xl px-4 py-16 md:py-24">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            قوانین و مقررات
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            آخرین به‌روزرسانی: فروردین ۱۴۰۴
          </p>

          <div className="mt-12 space-y-10">
            {sections.map((section, index) => (
              <section key={index} className="space-y-3">
                <h2 className="text-lg font-semibold">{section.title}</h2>
                {section.body && (
                  <p className="leading-relaxed text-muted-foreground">
                    {section.body}
                  </p>
                )}
                {section.items && (
                  <ul className="space-y-1.5 pr-5">
                    {section.items.map((item, i) => (
                      <li
                        key={i}
                        className="leading-relaxed text-muted-foreground"
                      >
                        <span className="ml-2 text-primary/60">—</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
