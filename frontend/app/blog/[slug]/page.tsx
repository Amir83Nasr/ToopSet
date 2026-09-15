import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getAllPosts, getPost } from "@/lib/blog"
import { toPersianDigits } from "@/lib/utils"
import { SITE_URL } from "@/lib/site"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { Button } from "@/components/ui/button"
import { CalendarDays, Clock3, User2 } from "lucide-react"

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: `${post.title} | بلاگ توپ‌سِت (ToopSet)`,
      description: post.description,
      type: "article",
      locale: "fa_IR",
      url: `${SITE_URL}/blog/${slug}`,
      images: [{ url: "/icons/square.png", width: 512, height: 512 }],
    },
    robots: { index: true, follow: true },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    inLanguage: "fa-IR",
    author: { "@type": "Organization", name: "توپ‌سِت" },
    publisher: { "@id": `${SITE_URL}/#organization` },
    datePublished: post.date,
    dateModified: post.updated,
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "بلاگ",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${SITE_URL}/blog/${slug}`,
      },
    ],
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main id="main-content" className="relative flex-1 pt-16">
        <article className="mx-auto max-w-3xl px-4 py-12 md:py-16">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User2 className="size-3.5" />
              {post.author}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {post.updated}
            </span>
            <span className="flex items-center gap-1">
              <Clock3 className="size-3.5" />
              {toPersianDigits(post.readingMinutes)} دقیقه مطالعه
            </span>
          </div>

          <div
            className="blog-prose mt-8"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />

          <div className="mt-12 rounded-3xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-center md:p-8">
            <h2 className="text-xl font-bold tracking-tight">
              همین حالا سانست را رزرو کن
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">
              مجموعه‌های ورزشی قم را مقایسه کن و بدون تماس تلفنی آنلاین رزرو کن.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="h-10 px-6 text-base font-semibold"
              >
                <Link href="/vendors">مشاهده مجموعه‌ها</Link>
              </Button>
              <Button
                variant="outline"
                asChild
                size="lg"
                className="h-10 px-6 text-base font-semibold"
              >
                <Link href="/blog">همه مقالات</Link>
              </Button>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
