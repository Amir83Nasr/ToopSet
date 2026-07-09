"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import {
  RefreshCw,
  ArrowRight,
  Home,
  Copy,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ErrorIllustration } from "@/components/ui/error-illustration"

/* ── Constants ───────────────────────────────────── */

const DEFAULT_TITLE = "خطایی رخ داد"
const DEFAULT_DESCRIPTION =
  "متأسفانه در پردازش درخواست شما خطایی رخ داده است. لطفاً مجدداً تلاش کنید."
const DEFAULT_RETRY_LABEL = "تلاش مجدد"
const DEFAULT_BACK_LABEL = "بازگشت"
const DEFAULT_HOME_LABEL = "صفحه اصلی"
const DEFAULT_COPY_LABEL = "رونوشت جزئیات خطا"
const DEFAULT_COPIED_LABEL = "رونوشت شد"

/* ── Props ───────────────────────────────────────── */

export interface ErrorPageProps {
  /** Error title (shown in heading) */
  title?: string
  /** Short, friendly description */
  description?: string
  /** The error object — details shown only in development */
  error?: Error | null
  /** Component stack trace — shown only in development */
  componentStack?: string
  /** Next.js error digest for correlation */
  digest?: string
  /** Custom illustration node — defaults to ErrorIllustration */
  illustration?: React.ReactNode

  /** Compact card mode (for inline ErrorBoundary) */
  compact?: boolean

  /** Primary action — retry */
  onRetry?: () => void
  /** Custom label for retry button */
  retryLabel?: string

  /** Show "Back" button */
  showBack?: boolean
  /** Custom back handler — defaults to window.history.back() */
  onBack?: () => void
  /** Custom label for back button */
  backLabel?: string

  /** Show "Home" link */
  showHome?: boolean
  /** Home URL — defaults to "/" */
  homeHref?: string
  /** Custom label for home button */
  homeLabel?: string

  /** Extra action buttons rendered in the actions row */
  actions?: React.ReactNode

  /** Additional classes for the root element */
  className?: string
}

/* ── Animation variants ──────────────────────────── */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
}

/* ── Dev-mode helpers ────────────────────────────── */

const isDev = process.env.NODE_ENV === "development"

function buildErrorDetails(
  error: Error | null | undefined,
  componentStack: string | undefined,
  digest: string | undefined
): string {
  const parts: string[] = []
  parts.push(`Error: ${error?.message ?? "(no message)"}`)
  parts.push(`Name: ${error?.name ?? "Error"}`)
  if (digest) parts.push(`Digest: ${digest}`)
  if (error?.stack) parts.push(`\nStack:\n${error.stack}`)
  if (componentStack) parts.push(`\nComponent stack:\n${componentStack}`)
  return parts.join("\n")
}

/* ── Component ───────────────────────────────────── */

export function ErrorPage({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  error,
  componentStack,
  digest,
  illustration,
  compact = false,
  onRetry,
  retryLabel = DEFAULT_RETRY_LABEL,
  showBack = false,
  onBack,
  backLabel = DEFAULT_BACK_LABEL,
  showHome = false,
  homeHref = "/",
  homeLabel = DEFAULT_HOME_LABEL,
  actions,
  className,
}: ErrorPageProps) {
  /* ── Focus management ──── */
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    /* Move focus to the heading so screen-readers announce the error */
    headingRef.current?.focus()
  }, [])

  /* ── Dev details expand ── */
  const [detailsOpen, setDetailsOpen] = useState(false)

  /* ── Copy state ──── */
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        buildErrorDetails(error, componentStack, digest)
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* Clipboard not available — silently ignore */
    }
  }, [error, componentStack, digest])

  /* ── Back handler ──── */
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      window.history.back()
    }
  }, [onBack])

  /* ── Illustration ──── */
  const illustrationEl = illustration ?? (
    <ErrorIllustration size={compact ? "sm" : "lg"} />
  )

  /*
   * ── Render ──────────────────────────────────────
   *
   * Two layouts:
   *   1) compact (inline card) — used inside ErrorBoundary
   *   2) full-screen centered — used in error.tsx / global-error.tsx
   */

  /* ── Shared content ────────────────────────────── */

  const content = (
    <>
      {/* Illustration */}
      <motion.div variants={itemVariants} className="flex justify-center">
        {illustrationEl}
      </motion.div>

      {/* Title */}
      <motion.div variants={itemVariants}>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className={cn(
            "font-semibold text-foreground outline-none",
            compact ? "text-base" : "text-xl sm:text-2xl"
          )}
        >
          {title}
        </h1>
      </motion.div>

      {/* Description */}
      <motion.div variants={itemVariants}>
        <p
          className={cn(
            "leading-relaxed text-muted-foreground",
            compact ? "text-sm" : "text-sm sm:text-base"
          )}
        >
          {description}
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        variants={itemVariants}
        className={cn(
          "flex flex-wrap items-center justify-center gap-2",
          compact ? "mt-1" : "mt-2"
        )}
      >
        {onRetry && (
          <Button variant="default" size="sm" onClick={onRetry}>
            <RefreshCw className="ml-1.5 size-4" />
            {retryLabel}
          </Button>
        )}

        {showBack && (
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowRight className="ml-1.5 size-4" />
            {backLabel}
          </Button>
        )}

        {showHome && (
          <Button variant="secondary" size="sm" asChild>
            <Link href={homeHref}>
              <Home className="ml-1.5 size-4" />
              {homeLabel}
            </Link>
          </Button>
        )}

        {actions}
      </motion.div>

      {/* ── Dev-only: technical details ─────────────── */}
      {isDev && error && (
        <motion.div variants={itemVariants} className="w-full pt-1">
          <div className="rounded-lg border bg-muted/40 p-3">
            <button
              type="button"
              onClick={() => setDetailsOpen((o) => !o)}
              className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={detailsOpen}
              aria-controls="error-details-panel"
            >
              <span className="font-mono">
                {error.name}: {error.message}
              </span>
              {detailsOpen ? (
                <ChevronUp className="mr-1 size-3.5 shrink-0" />
              ) : (
                <ChevronDown className="mr-1 size-3.5 shrink-0" />
              )}
            </button>

            {detailsOpen && (
              <div id="error-details-panel" className="mt-2 space-y-2">
                <pre className="max-h-48 [scrollbar-width:thin] overflow-auto rounded bg-background p-2 text-xs leading-relaxed text-foreground/80">
                  <code>{error.stack}</code>
                  {componentStack && (
                    <>
                      {"\n\n"}
                      <code className="text-muted-foreground">
                        {componentStack}
                      </code>
                    </>
                  )}
                </pre>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleCopy}
                    className="gap-1"
                  >
                    {copied ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copied ? DEFAULT_COPIED_LABEL : DEFAULT_COPY_LABEL}
                  </Button>

                  {digest && (
                    <span className="font-mono text-[10px] text-muted-foreground/50">
                      digest: {digest}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </>
  )

  /*
   * ── Layouts ──────────────────────────────────────
   */

  if (compact) {
    /* Inline card — for ErrorBoundary fallback inside dashboard */
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        role="alert"
        aria-live="assertive"
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center shadow-xs",
          className
        )}
      >
        {content}
      </motion.div>
    )
  }

  /* Full-screen centered — for error.tsx / global-error.tsx */
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      dir="rtl"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        role="alert"
        aria-live="assertive"
        className={cn(
          "relative z-10 flex w-full max-w-sm flex-col items-center gap-4 text-center",
          className
        )}
      >
        {content}
      </motion.div>
    </div>
  )
}
