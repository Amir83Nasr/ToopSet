export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-24 md:pb-28 md:pt-32">
      <div className="bg-grid absolute inset-0" />
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            توپ‌<span className="text-primary">سِت</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground md:text-xl">
            سامانه هوشمند رزرو آنلاین زمین‌های ورزشی
          </p>
        </div>
      </div>
    </section>
  )
}
