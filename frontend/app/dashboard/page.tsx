import {
  Building2,
  CalendarCheck,
  CreditCard,
  Users,
} from "lucide-react"

const stats = [
  {
    title: "زمین‌های فعال",
    value: "۱۲",
    icon: Building2,
    description: "زمین فعال در سیستم",
  },
  {
    title: "رزروهای امروز",
    value: "۸",
    icon: CalendarCheck,
    description: "رزرو فعال امروز",
  },
  {
    title: "پرداخت‌های امروز",
    value: "۳,۴۵۰,۰۰۰",
    icon: CreditCard,
    description: "تومان",
  },
  {
    title: "کاربران",
    value: "۴۲",
    icon: Users,
    description: "کاربر ثبت‌نام کرده",
  },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">داشبورد</h1>
        <p className="text-muted-foreground">
          خلاصه فعالیت‌های ورزشی امروز
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="size-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 text-right">
              <p className="text-sm text-muted-foreground">{stat.title}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">رزروهای اخیر</h2>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            در حال توسعه...
          </div>
        </div>
        <div className="col-span-3 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">زمین‌های محبوب</h2>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            در حال توسعه...
          </div>
        </div>
      </div>
    </div>
  )
}
