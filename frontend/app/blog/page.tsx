import type { Metadata } from "next"
import Link from "next/link"
import { getAllPosts } from "@/lib/blog"
import { toPersianDigits } from "@/lib/utils"
import { SITE_URL } from "@/lib/site"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { CalendarDays, Clock3 } from "lucide-react"

export const metadata: Metadata = {
  title: "بلاگ توپ‌سِت",
  description:
    "راهنمای رزرو سالن فوتسال، زمین چمن مصنوعی و مجموعه‌های ورزشی قم؛ قیمت‌ها، قوانین لغو و چک‌لیست انتخاب سالن در بلاگ توپ‌سِت (ToopSet).",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "بلاگ توپ‌سِت (ToopSet)",
    description: "راهنمای رزرو ورزش در قم",
    type: "website",
    locale: "fa_IR",
    url: `${SITE_URL}/blog`,
    images: [{ url: "/icons/square.png", width: 512, height: 512 }],
  },
  robots: { index: true, follow: true },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()

  const itemListJsonLd =
    posts.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: posts.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}/blog/${p.slug}`,
            name: p.title,
          })),
        }
      : null

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <main id="main-content" className="relative flex-1 pt-16">
        <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              بلاگ توپ‌سِت
            </h1>
            <p className="mt-2 text-muted-foreground">
              راهنمای رزرو ورزش در قم؛ از قیمت سانس تا انتخاب سالن
            </p>
          </div>

          {posts.length === 0 ? (
            <p className="text-center text-muted-foreground">
              هنوز مقاله‌ای منتشر نشده است.
            </p>
          ) : (
            <div className="grid gap-5">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block"
                >
                  <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                    <CardHeader>
                      <CardTitle className="leading-8 group-hover:text-primary">
                        {post.title}
                      </CardTitle>
                      <CardDescription className="leading-7">
                        {post.description}
                      </CardDescription>
                      <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          {post.updated}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock3 className="size-3.5" />
                          {toPersianDigits(post.readingMinutes)} دقیقه مطالعه
                        </span>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
