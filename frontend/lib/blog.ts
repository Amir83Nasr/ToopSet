import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// ── Minimal markdown blog — no new dependencies ─────────────────────────────
// Posts live in frontend/content/blog/*.md with YAML frontmatter.
// Renderer supports the subset we author with: headings, bold, links,
// bullet lists, quotes, paragraphs. ponytail: switch to MDX (@next/mdx)
// when posts need interactive components.

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  updated: string
  author: string
  cover: string
  html: string
  readingMinutes: number
}

const CONTENT_DIR = join(process.cwd(), "content", "blog")

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function inline(s: string): string {
  const out = escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" loading="lazy" class="blog-image" />'
    )
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  return out
}

export function markdownToHtml(md: string): string {
  const html: string[] = []
  let inList = false
  let inOrdered = false
  const quote: string[] = []

  function closeList() {
    if (inList) {
      html.push("</ul>")
      inList = false
    }
    if (inOrdered) {
      html.push("</ol>")
      inOrdered = false
    }
  }

  function closeQuote() {
    if (quote.length > 0) {
      html.push(`<blockquote>${quote.map(inline).join("<br />")}</blockquote>`)
      quote.length = 0
    }
  }

  for (const raw of md.split("\n")) {
    const line = raw.trim()
    if (line.startsWith(">")) {
      closeList()
      quote.push(line.replace(/^>\s?/, ""))
      continue
    }
    closeQuote()
    if (line.startsWith("### ")) {
      closeList()
      html.push(`<h3>${inline(line.slice(4))}</h3>`)
    } else if (line.startsWith("## ")) {
      closeList()
      html.push(`<h2>${inline(line.slice(3))}</h2>`)
    } else if (line.startsWith("# ")) {
      closeList()
      html.push(`<h1>${inline(line.slice(2))}</h1>`)
    } else if (line.startsWith("- ")) {
      if (inOrdered) {
        html.push("</ol>")
        inOrdered = false
      }
      if (!inList) {
        html.push('<ul class="blog-list">')
        inList = true
      }
      html.push(`<li>${inline(line.slice(2))}</li>`)
    } else if (/^\d+\.\s/.test(line)) {
      if (inList) {
        html.push("</ul>")
        inList = false
      }
      if (!inOrdered) {
        html.push("<ol>")
        inOrdered = true
      }
      html.push(`<li>${inline(line.replace(/^\d+\.\s/, ""))}</li>`)
    } else if (line === "") {
      closeList()
    } else {
      closeList()
      html.push(`<p>${inline(line)}</p>`)
    }
  }
  closeList()
  closeQuote()
  return html.join("\n")
}

function parseFrontmatter(raw: string): {
  data: Record<string, string>
  body: string
} {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { data: {}, body: raw }
  const data: Record<string, string> = {}
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":")
    if (idx === -1) continue
    data[line.slice(0, idx).trim()] = line
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, "")
  }
  return { data, body: match[2] }
}

function toPost(
  slug: string,
  data: Record<string, string>,
  body: string
): BlogPost {
  const words = body.split(/\s+/).length
  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? "",
    date: data.date ?? "",
    updated: data.updated ?? data.date ?? "",
    author: data.author ?? "تیم توپ‌سِت",
    cover: data.cover ?? "",
    html: markdownToHtml(body),
    readingMinutes: Math.max(1, Math.round(words / 200)),
  }
}

export function getAllPosts(): BlogPost[] {
  let files: string[]
  try {
    files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"))
  } catch {
    return []
  }
  const posts = files.map((file) => {
    const slug = file.replace(/\.md$/, "")
    const raw = readFileSync(join(CONTENT_DIR, file), "utf-8")
    const { data, body } = parseFrontmatter(raw)
    return toPost(slug, data, body)
  })
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPost(slug: string): BlogPost | null {
  try {
    const raw = readFileSync(join(CONTENT_DIR, `${slug}.md`), "utf-8")
    const { data, body } = parseFrontmatter(raw)
    return toPost(slug, data, body)
  } catch {
    return null
  }
}
