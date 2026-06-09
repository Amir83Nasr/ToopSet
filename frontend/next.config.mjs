import withBundleAnalyzer from "@next/bundle-analyzer"
import { withSentryConfig } from "@sentry/nextjs"

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/uploads/**",
      },
    ],
  },
}

const sentryConfig = {
  silent: !process.env.NEXT_PUBLIC_SENTRY_DSN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: false,
}

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(analyzer(nextConfig), sentryConfig)
  : analyzer(nextConfig)
