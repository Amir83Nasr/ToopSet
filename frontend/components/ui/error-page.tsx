"use client"

import { useEffect, useRef, type ReactNode } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ErrorIllustration } from "@/components/ui/error-illustration"

/* ── Constants ───────────────────────────────────── */

const DEFAULT_TITLE = "خطایی رخ داد"
const DEFAULT_DESCRIPTION = "لطفاً مجدداً تلاش کنید."
const DEFAULT_RETRY_LABEL = "تلاش مجدد"
const DEFAULT_HOME_LABEL = "صفحه اصلی"
const DEFAULT_BACK_LABEL = "بازگشت به صفحه قبل"

/* ── Props ───────────────────────────────────────── */

export interface ErrorPageProps {
  title?: string
  description?: string
  compact?: boolean
  onRetry?: () => void
  retryLabel?: string
  showHome?: boolean
  homeHref?: string
  homeLabel?: string
  className?: string
  children?: ReactNode

  /* Enhanced-mode props (ignored when compact) */
  statusCode?: string
  showIllustration?: boolean
  /** Custom icon replaces illustration when provided (status code still shows) */
  icon?: ReactNode
  showBackButton?: boolean
  backLabel?: string
}

/* ── Component ───────────────────────────────────── */

export function ErrorPage({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  compact = false,
  onRetry,
  retryLabel = DEFAULT_RETRY_LABEL,
  showHome = false,
  homeHref = "/",
  homeLabel = DEFAULT_HOME_LABEL,
  className,
  children,
  statusCode,
  showIllustration,
  icon,
  showBackButton,
  backLabel = DEFAULT_BACK_LABEL,
}: ErrorPageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  /* ── Shared content ── */

  const actions = (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {onRetry && (
        <Button variant="default" onClick={onRetry}>
          <RefreshCw className="me-1.5 size-4" />
          {retryLabel}
        </Button>
      )}

      {showHome && (
        <Button variant="outline" asChild>
          <Link href={homeHref}>
            <Home className="me-1.5 size-4" />
            {homeLabel}
          </Link>
        </Button>
      )}

      {showBackButton && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.history.back()}
        >
          <ChevronRight className="me-1.5 size-4" />
          {backLabel}
        </Button>
      )}
    </div>
  )

  /* ── Compact mode ── */

  if (compact) {
    return (
      <div
        className={cn(
          "flex min-h-[60vh] w-full flex-1 items-center justify-center p-4",
          className
        )}
      >
        <div
          role="alert"
          aria-live="assertive"
          className="flex w-full max-w-sm flex-col items-center gap-3 text-center"
        >
          <div
            className="mb-3 flex size-16 items-center justify-center rounded-full bg-muted"
            aria-hidden="true"
          >
            <AlertTriangle className="size-8 text-muted-foreground" />
          </div>

          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold text-foreground outline-none"
          >
            {title}
          </h2>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          {children}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            {onRetry && (
              <Button variant="default" onClick={onRetry}>
                <RefreshCw className="me-1.5 size-4" />
                {retryLabel}
              </Button>
            )}
            {showHome && (
              <Button variant="outline" asChild>
                <Link href={homeHref}>
                  <Home className="me-1.5 size-4" />
                  {homeLabel}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── Full-screen enhanced mode ── */

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn("relative z-10 w-full max-w-md", className)}
      >
        <div className="glass-card rounded-2xl px-6 py-10 sm:px-10 sm:py-12">
          <div
            role="alert"
            aria-live="assertive"
            className="flex flex-col items-center gap-4 text-center"
          >
            {/* Illustration / Icon */}
            {showIllustration && !icon && (
              <div className="mb-1">
                <ErrorIllustration size="lg" />
              </div>
            )}
            {icon && <div className="mb-1 flex justify-center">{icon}</div>}

            {/* Status code */}
            {statusCode && (
              <h1 className="text-gradient-primary mb-1 text-7xl leading-none font-black sm:text-8xl">
                {statusCode}
              </h1>
            )}

            {/* Title */}
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-semibold text-foreground outline-none sm:text-2xl"
            >
              {title}
            </h2>

            {/* Description */}
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
              {description}
            </p>

            {/* Children — used for dev-mode error details */}
            {children}

            {/* Actions */}
            <div className="mt-2">{actions}</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
