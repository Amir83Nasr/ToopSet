"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sun, Moon, Monitor } from "lucide-react"

export function ModeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  const isDark = resolvedTheme === "dark"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 relative text-muted-foreground hover:text-foreground" aria-label="تغییر تم">
          <Sun
            className={`size-4 transition-all ${
              isDark ? "scale-0" : "scale-100"
            }`}
          />
          <Moon
            className={`absolute size-4 transition-all ${
              isDark ? "scale-100" : "scale-0"
            }`}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
          <Sun className="size-4" />
          روشن
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
          <Moon className="size-4" />
          تیره
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
          <Monitor className="size-4" />
          سیستم
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
