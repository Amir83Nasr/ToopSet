# UI — Component & Block Styles

## shadcn/ui Components (36)

```text
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
└── custom: sidebar.tsx with RTL support
```

## Components Reference

### Button

- **Variants:** `default` (bg-primary), `secondary` (bg-secondary), `destructive` (bg-destructive/10), `outline` (border-border bg-background), `ghost` (hover:bg-muted), `link` (underline-offset-4 hover:underline)
- **Sizes:** `xs` (h-6), `sm` (h-8), `default` (h-9), `lg` (h-10), `icon` (size-9), `icon-xs` (size-6), `icon-sm` (size-8), `icon-lg` (size-10)
- **States:** hover opacity/color, focus-visible (ring-3 ring-ring/50), disabled (opacity-50 pointer-events-none), active (translate-y-px), aria-invalid (border-destructive + ring)
- **Animation:** `transition-all` on all properties, `active:translate-y-px` press effect
- **Data attrs:** `data-slot="button"`, `data-variant`, `data-size`
- **RTL:** `has-data-[icon=inline-end]:pe-2` / `has-data-[icon=inline-start]:ps-2` for icon spacing
- **Sub-components:** ButtonGroup via `data-slot="button-group"` container
- **Base classes:** `inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-sm font-medium whitespace-nowrap outline-none select-none`

### Badge

- **Variants:** `default` (bg-primary), `secondary` (bg-secondary), `destructive` (bg-destructive/10), `outline` (border-border), `ghost` (hover:bg-muted), `link` (underline hover)
- **Sizes:** fixed h-5, px-2, text-xs
- **States:** focus-visible (ring-[3px] ring-ring/50), editable via `asChild` (Slot.Root)
- **Shape:** `rounded-4xl` (fully pill-shaped)
- **Hover on link:** `[a]:hover:bg-primary/80` variant-specific
- **Data attrs:** `data-slot="badge"`, `data-variant`

### Card

- **Sizes:** `default` (gap-4 py-4), `sm` (gap-3 py-3)
- **Sub-components:** CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter
- **Styling:** `rounded-xl border bg-card ring-1 ring-foreground/10`, footer has `bg-muted/50 border-t`
- **Data attrs:** `data-slot="card"`, `data-size`, sub-components have their own data-slot
- **Responsive container:** CardHeader uses `@container/card-header` for container queries
- **Image integration:** `has-[>img:first-child]:pt-0`, first/last img gets rounded corners

### Input

- **Styling:** `h-8 w-full min-w-0 rounded-md border border-input bg-background px-2.5 py-1 text-base md:text-sm`
- **States:** focus-visible (border-ring ring-3 ring-ring/50), disabled (opacity-50 bg-input/50), placeholder (text-muted-foreground), aria-invalid (border-destructive + ring), file input styling
- **Data attrs:** `data-slot="input"`

### Textarea

- **Styling:** `flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-background px-2.5 py-2 text-base md:text-sm`
- **States:** Same as Input (focus, disabled, aria-invalid patterns)
- **Data attrs:** `data-slot="textarea"`

### Select

- **Sizes:** `default` (h-8), `sm` (h-7)
- **Styling (Trigger):** `flex w-fit items-center justify-between gap-1.5 rounded-md border border-input bg-background py-2 ps-2.5 pe-2 text-sm whitespace-nowrap`
- **States:** focus-visible (border-ring ring-3), disabled, aria-invalid, placeholder (text-muted-foreground)
- **Styling (Content):** `rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10`, with slide-in animations per side
- **Styling (Item):** `py-1 ps-1.5 pe-8`, hover (bg-accent), focus (bg-accent)
- **Checkmark:** Tick02Icon from hugeicons in `absolute end-2`
- **Scroll buttons:** ArrowUp01Icon / ArrowDown01Icon
- **Data attrs:** `data-slot="select[-trigger,-content,-item,-group,-label]"`, `data-size`, `data-side`, `data-align-trigger`
- **RTL support:** `rtl:data-[side=left]:translate-x-1 rtl:data-[side=right]:-translate-x-1`

### Checkbox

- **Styling:** `size-4 shrink-0 rounded-[4px] border border-input`, `data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground`
- **States:** focus-visible (ring), disabled (opacity-50), aria-invalid (border-destructive), group-disabled (opacity-50 within field)
- **Indicator:** Tick02Icon icon
- **Touch target:** `after:absolute after:-inset-x-3 after:-inset-y-2`
- **Data attrs:** `data-slot="checkbox"`, `data-slot="checkbox-indicator"`

### Dialog

- **Sub-components:** Dialog, DialogTrigger, DialogPortal, DialogClose, DialogOverlay, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription
- **Overlay:** `fixed inset-0 isolate z-50 bg-black/10 backdrop-blur-xs`, fade-in/out animation
- **Content:** `fixed start-1/2 top-1/2 z-50 max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-popover ring-1 ring-foreground/10`, zoom animation
- **Footer:** `flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end`
- **Close button:** `absolute end-2 top-2`, Cancel01Icon from hugeicons
- **RTL:** `rtl:translate-x-1/2` to counter LTR `-translate-x-1/2`
- **Data attrs:** `data-slot="dialog[-overlay,-content,-header,-footer,-title,-description]"`

### Tabs

- **Variants (List):** `default` (bg-muted rounded-lg), `line` (bg-transparent gap-1)
- **Trigger:** `h-[calc(100%-1px)] rounded-md text-sm text-foreground/60`, data-active: bg-background + shadow-sm for default, bottom border indicator for line variant
- **Line indicator:** `after:absolute after:bg-foreground after:opacity-0` — visible on data-active for line variant
- **Orientation:** `horizontal` (default, flex-col) and `vertical` (flex-row)
- **States:** hover (text-foreground), focus-visible (ring), disabled, data-active (bg-background text-foreground)
- **Data attrs:** `data-slot="tabs[-list,-trigger,-content]"`, `data-orientation`, `data-variant`

### Table

- **Container:** `relative w-full overflow-x-auto rounded-xl border bg-card`
- **Table:** `w-full caption-bottom text-sm`
- **Row:** `border-b transition-colors hover:bg-muted/50`, `data-[state=selected]:bg-muted`
- **Head:** `h-10 bg-muted/50 px-2 text-start align-middle font-medium whitespace-nowrap text-foreground`
- **Cell:** `p-2 align-middle whitespace-nowrap`
- **Footer:** `border-t bg-muted/50 font-medium`
- **Data attrs:** `data-slot="table[-container,-header,-body,-footer,-row,-head,-cell,-caption]"`

### Pagination

- **Structure:** nav > ul > li > button/asChild anchor
- **Link:** Uses Button with `variant={isActive ? "outline" : "ghost"}` and `size="icon"`
- **Previous/Next:** ArrowLeft01Icon / ArrowRight01Icon from hugeicons, `rtl:rotate-180` for RTL flip
- **Ellipsis:** MoreHorizontalCircle01Icon
- **Data attrs:** `data-slot="pagination[-content,-item,-link,-ellipsis]"`, `data-active`

### Popover

- **Content:** `z-50 flex w-72 origin-(...) flex-col gap-2.5 rounded-lg bg-popover p-2.5 shadow-md ring-1 ring-foreground/10`
- **Animations:** slide-in/out per side, fade + zoom
- **Sub-components:** PopoverHeader, PopoverTitle, PopoverDescription
- **Data attrs:** `data-slot="popover[-content,-trigger,-anchor,-header,-title,-description]"`

### DropdownMenu

- **Content:** `z-50 w-(--radix-dropdown-menu-trigger-width) min-w-32 rounded-lg bg-popover p-1 shadow-md ring-1 ring-foreground/10`
- **Item:** `rounded-md py-1 ps-1.5 pe-8`, focus (bg-accent), destructive variant styling
- **Checkmark:** Tick02Icon in `absolute end-2`, sub-arrow: ArrowRight01Icon in `absolute start-2`
- **Sub-trigger:** ArrowRight01Icon with `rtl:rotate-180`
- **Data attrs:** `data-slot="dropdown-menu[-content,-item,-separator,-label,-checkbox-item,-radio-item,-group,-sub-trigger,-sub-content]"`, `data-variant`, `data-inset`

### Spinner

- Simple SVG spinner: `size-4 animate-spin`, circle (opacity-25) + path (opacity-75)
- **Data attrs:** `data-slot="spinner"`

### Skeleton

- **Styling:** `animate-pulse rounded-md bg-muted`
- **Data attrs:** `data-slot="skeleton"`

### Tooltip

- **Provider:** `delayDuration={0}` (immediate)
- **Content:** Styled with radix, positioned via side/sideOffset
- **Data attrs:** `data-slot="tooltip[-provider,-trigger,-content]"`

### Label

- **Styling:** `text-sm leading-none font-medium select-none`
- **States:** group-data-[disabled=true], peer-disabled
- **Data attrs:** `data-slot="label"`

### Calendar (Persian)

- Uses `@daypicker/persian` with `@daypicker/react` base
- **Locale:** faIR (Persian)
- **Caption layout:** `"label"` (month/year selector)
- **Button variant:** `ghost`
- **Custom components:** ArrowLeftIcon / ArrowRightIcon from hugeicons
- Persian date picker with Jalali calendar

### PersianInput

- Wraps standard Input with Persian digit handling
- Converts display to Persian digits (`toPersianDigits`), converts input to English digits (`toEnglishDigits`)
- `inputMode="numeric"` for mobile numeric keyboard
- Supports both controlled and uncontrolled modes

### TimePicker

- Custom time picker using Popover
- **Display:** Clock icon + time text (Persian digits)
- **Picker:** Two scrollable columns (hours 00-23, minutes 0-55 step 5)
- **Selected item:** `bg-primary font-semibold text-primary-foreground`
- **Actions:** Confirm (تایید) / Cancel (انصراف) buttons
- RTL-neutral (displays in LTR block for consistent time format)

### ScrollReveal

- Framer Motion scroll-triggered animation wrapper
- **Animations:** fade-in-up, fade-in-down, fade-in-left, fade-in-right, scale-in, none
- **Features:** stagger children, intersection threshold, once/toggle, custom delay
- Default animation: `fade-in-up` with `threshold=0.15`, `once=true`

## Recurring UI Patterns

### Search / Filter Bar

**Used in:** courts listing, users management, notifications, bookings, payments

```text
div.rounded-lg.border.bg-card.p-3
├── div.flex.flex-col.gap-3.sm:flex-row
│   ├── div.relative.flex-1
│   │   ├── Search (absolute icon)
│   │   └── Input (pr-10, debounced 300–400ms)
│   └── div.flex.gap-2
│       ├── Select type filter (sm:w-36–40)
│       └── Select status filter (sm:w-36)
```

**Styling:** `rounded-lg border bg-card p-3`, responsive stack on mobile (`sm:flex-row`). Search icon positioned `absolute top-1/2 right-3 -translate-y-1/2`. All selects use `position="popper"` with `SelectGroup` + `SelectLabel`.

### Dashboard Page Wrapper

**Used in:** all dashboard pages (courts, bookings, payments, notifications, users, reports, contact, settings)

```tsx
<div className="flex flex-1 flex-col gap-6">
  <div className="flex flex-wrap items-start justify-between gap-4">
    {/* Page header: h1 + p.muted + action buttons */}
  </div>
  {/* page content */}
</div>
```

**Styling:** `flex-1` for full height, `gap-6` for section spacing. Header uses `flex-wrap` + `items-start` + `gap-4` for responsive layout.

### Empty State

**Used in:** bookings, notifications, payments, user page, admin page, reports, contact

```tsx
<Card>
  <CardContent className="flex flex-col items-center justify-center py-16">
    <div className="mb-4 rounded-full bg-muted p-4">
      <Icon className="size-10 text-muted-foreground" />
    </div>
    <h3 className="mb-1 text-lg font-semibold">عنوان</h3>
    <p className="max-w-sm text-center text-sm text-muted-foreground">توضیحات</p>
  </CardContent>
</Card>
```

**Styling:** Centered layout (`items-center justify-center`), `py-16` for generous padding, icon in `rounded-full bg-muted p-4`, `max-w-sm text-center` for description.

### Table + Pagination

**Used in:** users, notifications, courts, bookings, payments

```tsx
<div>
  <Table>...</Table>
  {totalPages > 1 && (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-sm text-muted-foreground">صفحه X از Y</p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem><PaginationPrevious ... /></PaginationItem>
          <PaginationItem><PaginationNext ... /></PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )}
</div>
```

### Dialog for Confirmations / Forms

**Used in:** users (delete confirm), notifications (broadcast form), courts (create/edit), bookings (confirm), contact

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-sm|md">
    <DialogHeader>
      <DialogTitle>عنوان</DialogTitle>
      <DialogDescription>توضیحات</DialogDescription>
    </DialogHeader>
    {/* form body or confirmation text */}
    <DialogFooter>
      <Button variant="outline" onClick={...}>انصراف</Button>
      <Button type="submit" variant="destructive|default">تأیید</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Styling:** `sm:max-w-sm` for confirmations, `sm:max-w-md` for forms. Footer: `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`.

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

- **Dashboard:** `AuthGuard` → `ErrorBoundary` → `SidebarProvider` → `AppSidebar` (variant="inset", side="right") + `SidebarInset` → `SiteHeader` + `#dash-content` (children)
- **Public pages (homepage, court detail):** `SiteHeader` → `<main className="relative flex-1 pt-16">` + sections → `SiteFooter`
- **Courts listing:** Filters row → map panel (collapsible) → results grid → pagination

### Dashboard Block

```text
SidebarProvider (CSS vars: --sidebar-width, --header-height)
├── AppSidebar (variant="inset", collapsible="icon", side="right")
└── SidebarInset (overflow-y-auto)
    ├── SiteHeader (breadcrumb + mode-toggle)
    └── #dash-content (flex flex-col gap-4 p-4) → {children}
```

### Courts Listing Block

```text
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

### Court Detail Block (Public)

```text
div.flex.min-h-svh.flex-col
├── SiteHeader (fixed, z-50)
├── main.relative.flex-1.pt-16
│   ├── CourtHeroGallery (carousel + hero overlay + badges + rating + price)
│   ├── div.mx-auto.max-w-7xl.px-4
│   │   ├── QuickStats (capacity / sport count / rating / reviews)
│   │   └── div.grid.lg:grid-cols-5.gap-8
│   │       ├── left (lg:col-span-3)
│   │       │   ├── About card (name, address, manager, description)
│   │       │   ├── CourtAmenities (amenities grid)
│   │       │   ├── Location & Map (dynamic CourtLocationMap)
│   │       │   └── CourtReviews (rating bars + review cards)
│   │       └── right (lg:col-span-2, lg:sticky lg:top-24)
│   │           ├── Manager Info card (name, phone, address)
│   │           └── CourtBooking (7-day date picker + slot list + CTA)
└── SiteFooter
```

### Court Detail Block (Dashboard Edit)

```text
div.flex.flex-1.flex-col.gap-6
├── Top bar (back | toggle active | public view | [delete] | save)
├── div.grid.lg:grid-cols-5.gap-6
│   ├── left (lg:col-span-3)
│   │   ├── Card: Basic Info (name + sport type checkboxes)
│   │   ├── Card: Location (textarea + LocationPicker)
│   │   ├── Card: Capacity (PersianInput)
│   │   ├── Card: Amenities (AmenityCheckboxes)
│   │   └── Card: Images (ImageUpload)
│   └── right (lg:col-span-2, lg:sticky)
│       ├── Stats bar (total/available/reserved)
│       ├── Date nav + Add Slot dialog
│       └── Slot list (scrollable)
```

## Tailwind v4 Conventions

| Aspect     | Rule                                                |
| ---------- | --------------------------------------------------- |
| Import     | `@import "tailwindcss"` syntax                      |
| Theme      | CSS variables in `:root` / `.dark` only             |
| Animations | `tw-animate-css` for animation utilities            |
| RTL        | `me-`, `ms-` (never `mr-`, `ml-`)                   |
| Spacing    | `gap-`, `p-`, `m-` from design system               |
| Colors     | `bg-card`, `text-muted-foreground`, `border-border` |
| Responsive | Mobile-first (`sm:`, `md:`, `lg:`)                  |
| Merge      | `cn()` utility (clsx + tailwind-merge)              |

## Theming

- **Dark mode:** `next-themes` with `.dark` CSS class, view-transition theme spread animation
- **Colors:** OKLCH color space, semantic names (`--primary`, `--muted`, `--card`)
- **Font:** IranYekanX (10 weights: 100–1000)
- **Transitions:** `transition-colors duration-150` on interactive elements, `transition-all` on buttons
- **Border radius:** 0.625rem base, with multipliers for sm/md/lg/xl/2xl/3xl/4xl
- **Status colors:** confirmed (green), pending (amber), cancelled (red) — each with bg variant
- **Notification colors:** info (blue), success (green), error (red) — each with bg variant
- **Grid pattern:** Fixed background overlay on `#toopset-root` and `#dash-content` with radial gradient mask
- **Scrollbar:** 6px thin scrollbar with rounded thumb
- **Scroll-lock shift fix:** `html` has `scrollbar-gutter: stable` + `overflow-y: auto` (reserve scrollbar space always). When Radix popups open, `react-remove-scroll-bar` injects `body[data-scroll-locked] { margin-right: 17px !important; overflow: hidden !important; }`. We override both at `globals.css:341` via `html body[data-scroll-locked]` (higher specificity) — neutralizes the double-compensation and prevents Chrome from overriding `html`'s viewport scrollbar.
- **Selection:** Tinted primary color for selected text
- **Glass effect:** `.glass-card` class (backdrop-blur + semi-transparent card bg)
- **No shimmer/text-gradient effects:** `.shimmer-text`, `.text-gradient-primary`, and similar animated-text-gradient effects are **not allowed** in any component or page. The homepage `hero-section.tsx` is the only exception (single usage, grandfathered in). New pages must use solid color text or static styles only.
- **Sonner toasts:** RTL overrides, IranYekanX font, custom padding/border-radius

## Map Components

Both dynamically imported with `ssr: false`:

- **CourtsMap** — multi-court, user location, search pin, click handler (for filter)
- **CourtLocationMap** — single court (non-interactive, 200px, no controls)
