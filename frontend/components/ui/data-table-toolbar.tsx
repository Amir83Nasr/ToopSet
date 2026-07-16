import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { InputHTMLAttributes } from "react"

// ── SearchInput ──────────────────────────────────────────

interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  value: string
  onChange: (value: string) => void
}

export function SearchInput({
  value,
  onChange,
  placeholder = "جستجو...",
  ...props
}: SearchInputProps) {
  return (
    <div className="relative flex-1">
      <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pe-10"
        {...props}
      />
    </div>
  )
}

// ── DataTableToolbar ─────────────────────────────────────

interface DataTableToolbarProps {
  children: React.ReactNode
}

export function DataTableToolbar({ children }: DataTableToolbarProps) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex flex-col gap-3 sm:flex-row">{children}</div>
    </div>
  )
}
