---
name: build-ui
description: Build or modify ToopSet frontend UI. Use when adding pages, components, dialogs, forms, or styling in frontend/. Enforces shadcn tokens, existing ui kit reuse, Hugeicons, RTL/Persian formatting, and the ResponsiveDialog mobile/desktop pattern.
---

# Build UI

## Source of truth (read before writing UI)

- `frontend/components.json` — style `radix-nova`, base `neutral`, `cssVariables`, `rtl: true`, icon library `hugeicons`.
- `frontend/app/globals.css` — `:root` / `.dark` tokens + `@theme inline`. Only allowed design tokens.
- `frontend/lib/utils.ts` — `cn()`, `toPersianDigits`, `formatPrice`, `formatPersianDate`.
- `frontend/lib/i18n.ts` — `formatMoney`, status labels.
- `frontend/hooks/use-mobile.ts` — mobile breakpoint 768.
- `frontend/components/ui/` — reusable kit. Reuse first, build last.

## Rules

1. Reuse `@/components/ui/*`. No one-off styles. No hardcoded hex/oklch; tokens only
   (`bg-background`, `text-foreground`, `bg-card`, `border-border`,
   `text-muted-foreground`, `bg-muted`, `bg-accent`,
   `bg-primary text-primary-foreground`, `text-destructive`).
2. Merge classes with `cn()`. On conflict keep token class, drop ad-hoc one.
3. shadcn first: run inside `frontend/`, `pnpm dlx shadcn@latest add <name>`.
   Blocks only if compatible with `radix-nova` + `neutral` + RTL. Then adapt:
   Hugeicons icons, Persian helpers, ResponsiveDialog pattern.
4. Icons: `@hugeicons/react` + `@hugeicons/core-free-icons` only,
   `strokeWidth={2}`. New `lucide-react` imports banned (legacy files only).
5. Overlays: `ResponsiveDialog*` from `@/components/ui/responsive-dialog`.
   No raw Dialog/Drawer for user flows (`mobileAsSheet={false}` only for
   fullscreen lightbox).
6. Forms: `react-hook-form` + `zod` + `@hookform/resolvers`; layout `field.tsx`,
   inputs `persian-input.tsx`, dates `persian-date-picker.tsx`.
7. Persian UI: user-facing numbers/dates/money via `toPersianDigits` /
   `formatMoney` / `formatPersianDate`. Glyphs: تومان، ٬، ٫.
   Font IranYekanX global — no new font.
8. RTL: `rtl` flows; mirrored arrows (e.g. `ArrowRight01Icon` means forward);
   logical props over left/right.
9. Theme: light + dark via existing vars. No fixed light colors
   (only exception: `--map-pin` in `globals.css`).
10. No new UI dependency without explicit ask. No new radius/color scale.

## Checklist

- [ ] Token/component reused, zero new hex
- [ ] Mobile (<768 Drawer) + desktop (Dialog) verified
- [ ] Persian digits/currency/date in UI strings
- [ ] `pnpm --dir frontend typecheck` + `pnpm --dir frontend lint`
- [ ] Prettier on touched files

## Anti-patterns

Raw Dialog on mobile • English digits in UI • lucide in new code •
`bg-[#...]` / `text-[#...]` • inline `font-family` •
new button/card variants instead of `button.tsx` / `card.tsx` cva.
