import type { Metadata } from "next"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"

export const metadata: Metadata = {
  title: "حریم خصوصی | توپ‌سِت",
  description: "سیاست حفظ حریم خصوصی کاربران در سامانه توپ‌سِت",
}

const sections = [
  {
    title: "۱. اطلاعاتی که جمع‌آوری می‌کنیم",
    body: "ما اطلاعات زیر را برای ارائه خدمات بهتر جمع‌آوری می‌کنیم:",
    items: [
      "اطلاعات هویتی: نام و نام خانوادگی، شماره تلفن همراه، ایمیل",
      "اطلاعات مربوط به رزرو: تاریخ، ساعت، نوع ورزش و مکان",
      "اطلاعات مربوط به تراکنش‌های مالی",
    ],
  },
  {
    title: "۲. نحوه استفاده از اطلاعات",
    body: "اطلاعات شما برای اهداف زیر استفاده می‌شود:",
    items: [
      "ایجاد و مدیریت حساب کاربری",
      "پردازش رزروها و تراکنش‌ها",
      "ارسال اعلان‌های مربوط به رزروها",
      "بهبود خدمات و تجربه کاربری",
      "پشتیبانی و پاسخگویی به سوالات",
    ],
  },
  {
    title: "۳. اشتراک‌گذاری اطلاعات",
    body: "توپ‌سِت اطلاعات شخصی شما را با اشخاص ثالث به اشتراک نمی‌گذارد، مگر در موارد زیر:",
    items: [
      "با مدیران مجموعه‌های ورزشی برای انجام رزرو",
      "با درخواست مراجع قانونی و قضایی",
      "برای جلوگیری از تقلب یا سوءاستفاده",
    ],
  },
  {
    title: "۴. امنیت اطلاعات",
    body: "ما از پروتکل‌های امنیتی استاندارد برای محافظت از اطلاعات شما استفاده می‌کنیم. تمام تراکنش‌های مالی از طریق درگاه‌های امن انجام می‌شود.",
  },
  {
    title: "۵. حقوق شما",
    body: "شما حق دارید:",
    items: [
      "در هر زمان اطلاعات خود را مشاهده و ویرایش کنید",
      "درخواست حذف حساب کاربری خود را دهید",
      "از دریافت اعلان‌ها انصراف دهید",
      "به اطلاعات خود اعتراض کنید",
    ],
  },
  {
    title: "۶. تماس با ما",
    body: "برای هرگونه سوال درباره حریم خصوصی، می‌توانید از طریق صفحه تماس با ما یا ایمیل privacy@toopset.com با ما در ارتباط باشید.",
  },
]

export default function PrivacyPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="relative flex-1">
        {/* Neon orbs */}
        <div className="neon-orb neon-orb-1 !top-[-120px] !right-[-80px]" />
        <div className="neon-orb neon-orb-cyan !bottom-[-100px] !left-[-60px]" />

        {/* Vertical side columns */}
        <div className="bg-grid-side max-md:hidden absolute inset-y-0 left-[calc(50%+36rem)] w-12 border-x border-t border-b border-border/20" />
        <div className="bg-grid-side max-md:hidden absolute inset-y-0 right-[calc(50%+36rem)] w-12 border-x border-t border-b border-border/20" />

        <div className="relative mx-auto max-w-3xl px-4 py-16 md:py-24">
          <div className="page-entrance">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              حریم خصوصی
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              آخرین به‌روزرسانی: فروردین ۱۴۰۴
            </p>
          </div>

          <div className="mt-12 space-y-10">
            {sections.map((section, index) => (
              <section key={index} className="page-entrance space-y-3">
                <h2 className="text-lg font-semibold">{section.title}</h2>
                <p className="leading-relaxed text-muted-foreground">
                  {section.body}
                </p>
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
