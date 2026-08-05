import { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://toopset.ir",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    // اگر صفحات دیگری مثل درباره ما یا تماس با ما دارید اینجا اضافه کنید
  ]
}
