"use client"

import { ErrorPage } from "@/components/ui/error-page"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorPage
      error={error}
      digest={error.digest}
      onRetry={reset}
      showBack
      showHome
    />
  )
}
