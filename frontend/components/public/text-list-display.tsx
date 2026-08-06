"use client"

import { Fragment, useEffect, useState, type ReactNode } from "react"
import { getApiBase } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const API_BASE = getApiBase()

/* ── Props ── */

interface TextListDisplayProps {
  /** Setting key to fetch (rules_text or privacy_text) */
  settingKey: string
  /** Optional callback to receive the updated_at string from the API */
  onUpdatedAt?: (date: string | null) => void
}

/* ── Structured block parsing ──
   Each stored item is a small plain-text document:
     "# Title"        → section header (بخش)
     "## Title"       → numbered card (ماده)
     "### Title"      → sub-heading inside a card
     "- text"         → bullet
     "| a | b |"      → table row (first row = header)
     "**bold**"       → inline bold
     ""               → paragraph break
   Legacy items without a "#"/"##" line render as a numbered card split on the
   first colon. */

interface ParsedBlock {
  kind: "section" | "card"
  title: string
  body: string
}

function parseBlock(item: string, index: number): ParsedBlock {
  const lines = item.split("\n")
  const first = lines[0] ?? ""
  if (first.startsWith("## ")) {
    return {
      kind: "card",
      title: first.slice(3).trim(),
      body: lines.slice(1).join("\n").trim(),
    }
  }
  if (first.startsWith("# ")) {
    return {
      kind: "section",
      title: first.slice(2).trim(),
      body: lines.slice(1).join("\n").trim(),
    }
  }
  if (first.includes(":")) {
    const colon = first.indexOf(":")
    return {
      kind: "card",
      title: first.slice(0, colon + 1),
      body: first.slice(colon + 1).trim(),
    }
  }
  return {
    kind: "card",
    title: `بند ${toPersianDigits(index + 1)}`,
    body: item,
  }
}

/** Wrap **bold** segments in <strong>. */
function formatInline(text: string): ReactNode[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i}>{part}</strong>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      )
    )
}

function renderBody(body: string) {
  if (!body) return null
  const nodes: ReactNode[] = []
  let paragraph: string[] = []
  let tableRows: string[][] = []
  let key = 0

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      nodes.push(
        <p key={key++} className="leading-relaxed text-muted-foreground">
          {formatInline(paragraph.join(" "))}
        </p>
      )
      paragraph = []
    }
  }
  const flushTable = () => {
    if (tableRows.length > 0) {
      const [head, ...rest] = tableRows
      nodes.push(
        <div key={key++} className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {head.map((cell, i) => (
                  <th
                    key={i}
                    className="border border-border bg-muted/60 px-3 py-2 font-semibold text-foreground"
                  >
                    {formatInline(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rest.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border border-border px-3 py-2 text-muted-foreground"
                    >
                      {formatInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      tableRows = []
    }
  }

  for (const line of body.split("\n")) {
    const trimmed = line.trim()
    if (trimmed.startsWith("### ")) {
      flushParagraph()
      flushTable()
      nodes.push(
        <h3 key={key++} className="font-semibold text-foreground">
          {formatInline(trimmed.slice(4))}
        </h3>
      )
    } else if (trimmed.startsWith("- ")) {
      flushParagraph()
      flushTable()
      nodes.push(
        <ul
          key={key++}
          className="ms-4 list-disc space-y-1 text-muted-foreground"
        >
          <li className="leading-relaxed">{formatInline(trimmed.slice(2))}</li>
        </ul>
      )
    } else if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushParagraph()
      tableRows.push(trimmed.split("|").slice(1, -1))
    } else if (trimmed === "") {
      flushParagraph()
      flushTable()
    } else {
      paragraph.push(trimmed)
    }
  }
  flushParagraph()
  flushTable()
  return nodes
}

/* ── Component ── */

export function TextListDisplay({
  settingKey,
  onUpdatedAt,
}: TextListDisplayProps) {
  const [items, setItems] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch(`${API_BASE}/api/v1/settings/public/text/${settingKey}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value)
            if (Array.isArray(parsed))
              setItems(parsed.filter((s): s is string => typeof s === "string"))
          } catch {
            /* ignore */
          }
        }
        if (onUpdatedAt && data?.updated_at) {
          onUpdatedAt(data.updated_at)
        }
      })
      .catch(() => {
        /* network/backend error — fall through to the empty state below */
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [settingKey, onUpdatedAt])

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{"محتوایی ثبت نشده است."}</p>
    )
  }

  // Assign sequential numbers to card blocks (sections are unnumbered).
  const { cards } = items.reduce<{
    cards: Array<{ block: ParsedBlock; number: number }>
    count: number
  }>(
    (acc, item, i) => {
      const block = parseBlock(item, i)
      acc.cards.push({
        block,
        number: block.kind === "card" ? acc.count + 1 : 0,
      })
      if (block.kind === "card") acc.count += 1
      return acc
    },
    { cards: [], count: 0 }
  )

  const rendered = cards.map(({ block, number }, i) => {
    if (block.kind === "section") {
      return (
        <section
          key={i}
          className="space-y-3 border-s-4 border-primary/40 ps-4"
        >
          <h2 className="text-xl font-bold tracking-tight">{block.title}</h2>
          {renderBody(block.body)}
        </section>
      )
    }
    return (
      <section key={i} className="space-y-3">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {toPersianDigits(number)}
          </span>
          {block.title}
        </h2>
        {renderBody(block.body)}
      </section>
    )
  })

  return <div className="space-y-8">{rendered}</div>
}
