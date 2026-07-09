"use client"

import { cn } from "@/lib/utils"

interface ErrorIllustrationProps {
  /** Additional classes for the SVG wrapper */
  className?: string
  /** Size variant — default controls outer dimensions */
  size?: "sm" | "md" | "lg"
}

const sizeMap = {
  sm: "size-24",
  md: "size-36",
  lg: "size-48",
}

/**
 * Lightweight animated SVG illustration for empty / error states.
 * Uses currentColor for theme-aware rendering — works in light and dark mode.
 *
 * ★ Insight —────────────────────────────────────────
 * SVG inline in the component avoids extra network requests and
 * lets us animate individual elements with CSS keyframes rather
 * than heavier JS animation libraries.
 * ──────────────────────────────────────────────────
 */
export function ErrorIllustration({
  className,
  size = "md",
}: ErrorIllustrationProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        sizeMap[size],
        className
      )}
      aria-hidden="true"
      role="presentation"
    >
      <style>{`
        @keyframes error-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(4px); }
        }
        @keyframes error-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes error-dot-drift {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(2px, -2px); }
          66% { transform: translate(-1px, 1px); }
        }
        .error-ill-float  { animation: error-float 3s ease-in-out infinite; }
        .error-ill-pulse  { animation: error-pulse 2.4s ease-in-out infinite; }
        .error-ill-drift  { animation: error-dot-drift 4s ease-in-out infinite; }
        .error-ill-delay-1 { animation-delay: 0.4s; }
        .error-ill-delay-2 { animation-delay: 0.8s; }
      `}</style>

      <svg
        viewBox="0 0 180 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full"
      >
        {/* Main ring — broken circle (approx 240° arc) */}
        <path
          d="M 90 12 A 48 48 0 1 1 50 85"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-foreground/20 dark:text-foreground/15"
        />

        {/* Detached fragment — floating below the gap */}
        <g className="error-ill-float">
          <path
            d="M 42 100 A 48 48 0 0 0 55 110"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-destructive/45"
          />
        </g>

        {/* Decorative dot — top-left */}
        <circle
          cx="38"
          cy="32"
          r="3"
          fill="currentColor"
          className="error-ill-pulse error-ill-delay-1 text-primary/15"
        />

        {/* Decorative dot — top-right */}
        <circle
          cx="148"
          cy="38"
          r="2"
          fill="currentColor"
          className="error-ill-drift text-foreground/20 dark:text-foreground/15"
        />

        {/* Decorative dot — bottom-right */}
        <circle
          cx="142"
          cy="105"
          r="2.5"
          fill="currentColor"
          className="error-ill-pulse error-ill-delay-2 text-primary/20 dark:text-primary/15"
        />
      </svg>
    </div>
  )
}
