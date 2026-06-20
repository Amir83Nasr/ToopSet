# UI — Component & Block Styles

## shadcn/ui Components (40+)

```
components/ui/
├── button.tsx, card.tsx, badge.tsx, input.tsx, select.tsx
├── dialog.tsx, sheet.tsx, popover.tsx, alert-dialog.tsx
├── sidebar.tsx, breadcrumb.tsx, separator.tsx
├── table.tsx, tabs.tsx, pagination.tsx
├── skeleton.tsx, avatar.tsx, spinner.tsx
├── carousel.tsx, calendar.tsx, date-picker.tsx, date-range-picker.tsx
├── field.tsx, label.tsx, dropdown-menu.tsx
├── checkbox.tsx, slider.tsx, textarea.tsx
├── tooltip.tsx, direction.tsx, error-boundary.tsx
├── time-picker.tsx, persian-input.tsx, input-group.tsx
├── mode-toggle.tsx, scroll-reveal.tsx
└── side bar custom: sidebar.tsx with RTL support
```

## Component Style

### Structure (TSX)

```tsx
"use client"

import { ... } from "..."

interface Props {
  // typed props with JSDoc
}

export function ComponentName({ prop1, prop2 }: Props) {
  // hooks first (useState, useEffect, useMemo, useCallback)
  // handlers (const handleX = useCallback(...))
  // render at bottom (return <jsx>)
}
```

### Layout

- **Dashboard:** `AuthGuard` → `ErrorBoundary` → `SidebarProvider` → `AppSidebar` + `SidebarInset` → `SiteHeader` + children
- **Public:** `SiteHeader` → `<main>` + sections → `SiteFooter`
- **Courts listing:** Filters row → map panel (collapsible) → results grid → pagination

### Dashboard Block

```
SidebarProvider (CSS vars: --sidebar-width, --header-height)
├── AppSidebar (variant="inset", collapsible="icon", side="right")
└── SidebarInset (overflow-y-auto)
    ├── SiteHeader (breadcrumb + mode-toggle)
    └── #dash-content (grid background) → {children}
```

### Courts Listing Block

```
main
├── section: Search & Filters
│   ├── Search input + Sort dropdown + NearMe + Map toggle buttons
│   ├── Sport type pills (all | volleyball | basketball | ...)
│   ├── Collapsible map panel (CourtsMap)
│   └── Filter chips + clear
└── section: Results
    ├── Count + sort summary
    ├── Grid (1 col mobile / 2 md / 3 lg)
    │   └── Card → Badge, FavoriteButton, Name, Address, Capacity, Rating, Price
    └── Pagination (prev/next)
```

### Court Detail Block

```
CourtHero (hero image + sport badges overlay)
CourtImageGallery (carousel)
main
├── Info section (address, capacity, sports, amenities)
├── CourtReviews
└── CourtBooking (date picker + slot grid + book button + payment)
CourtLocationMap (non-interactive, 200px)
```

## Tailwind v4 Conventions

| Aspect     | Rule                                                |
| ---------- | --------------------------------------------------- |
| Import     | `@import "tailwindcss"` syntax                      |
| Theme      | CSS variables in `:root` / `.dark` only             |
| RTL        | `me-`, `ms-` (never `mr-`, `ml-`)                   |
| Spacing    | `gap-`, `p-`, `m-` from design system               |
| Colors     | `bg-card`, `text-muted-foreground`, `border-border` |
| Responsive | Mobile-first (`sm:`, `md:`, `lg:`)                  |
| Merge      | `cn()` utility (clsx + tailwind-merge)              |

## Theming

- **Dark mode:** `next-themes` with `.dark` CSS class
- **Colors:** OKLCH color space, semantic names (`--primary`, `--muted`, `--card`)
- **Font:** IranYekanX (10 weights: 100–1000)
- **Transitions:** `transition-colors duration-150` on interactive elements
- **Map popup:** `.leaflet-popup.theme-popup` class (uses CSS vars)
- **Glass effect:** `.glass-card` class (backdrop-blur)

## Map Components

Both dynamically imported with `ssr: false`:

- **CourtsMap** — multi-court, user location, search pin, click handler (for filter)
- **CourtLocationMap** — single court (non-interactive, 200px, no controls)
