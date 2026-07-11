"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import * as Sentry from "@sentry/nextjs"

import { ErrorPage, type ErrorPageProps } from "@/components/ui/error-page"

interface Props {
  children: ReactNode
  /** Optional custom fallback completely replacing the default error UI */
  fallback?: ReactNode
  /** Called when the user clicks retry */
  onReset?: () => void
  /** Props forwarded to the default ErrorPage fallback */
  errorPageProps?: Partial<
    Pick<
      ErrorPageProps,
      | "title"
      | "description"
      | "showHome"
      | "homeHref"
      | "retryLabel"
      | "homeLabel"
    >
  >
}

interface State {
  hasError: boolean
  error: Error | null
  componentStack: string | null
}

/**
 * Error boundary that catches render-phase errors in its subtree.
 *
 * - **Error UI** is delegated to <ErrorPage compact> — clean separation.
 * - **Error logging** goes to Sentry via componentDidCatch.
 * - **Recovery** resets local state (re-renders children).
 *
 * ★ Insight ─────────────────────────────────────────
 * By extracting UI into ErrorPage, the boundary only worries about
 * catching, logging, and resetting — the three concerns named in the
 * design requirements. Consumers can customise appearance without
 * touching boundary logic.
 * ──────────────────────────────────────────────────
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, componentStack: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, componentStack: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ componentStack: errorInfo.componentStack ?? null })

    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, componentStack: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      /* Allow full replacement via the fallback prop */
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorPage
          compact
          onRetry={this.handleReset}
          {...this.props.errorPageProps}
        />
      )
    }

    return this.props.children
  }
}
