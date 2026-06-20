---
name: ui
description: >
  Manage the project's UI documentation file (context/ui.md). "ui update" scans
  the frontend codebase to update context/ui.md — component list with detailed
  styling (Tailwind classes, variants, states), recurring UI patterns across the
  app, layout blocks, Tailwind conventions, theming, and map components. "ui load"
  reads and displays context/ui.md. Trigger when the user says "ui", "ui update",
  "ui load", "بروزرسانی ui", "آپدیت ui", "بارگذاری ui", or any request to read
  or update the UI documentation.
---

# ui

Manage the project's UI documentation — read or update `context/ui.md`.

## When to use

- The user types `ui update` — scan the frontend codebase and update context/ui.md
- The user types `ui load` — read and display context/ui.md
- The user says "بروزرسانی ui", "آپدیت ui", "بارگذاری ui", "ui رو ببین"
- The user asks about UI components, layout, or theming in the project

## Commands

### `ui load`

Reads `context/ui.md` and displays its contents to the user.

1. Read `context/ui.md` from the project root.
2. Present the content clearly to the user.

### `ui update`

Scans the frontend codebase and updates `context/ui.md` to reflect the
current state of the project's UI components, layout, and conventions.

**Step 1: Read current context/ui.md**

Read the existing `context/ui.md` to understand the current structure.

**Step 2: Scan the frontend codebase**

Run these scans to gather current UI information:

1. **shadcn/ui components** — List files in `frontend/components/ui/`:
   ```
   ls frontend/components/ui/
   ```
   Update the component list with any new or removed files.

2. **UI component patterns** — Scan `frontend/components/` for significant
   new components or directories (not inside `ui/` subdirectory):
   ```
   ls frontend/components/
   ```

3. **New shadcn components** — Check if any shadcn components that are used
   in the codebase are missing from the list.

4. **Recurring UI patterns** — Scan `frontend/app/` pages and
   `frontend/components/` for UI blocks that appear in multiple places
   across the app. These are patterns that are not just single shadcn
   components but compound blocks used repeatedly:
   - Example: search/filter bars (in courts listing, dashboard pages)
   - Example: cards with image + title + description + actions
   - Example: sidebar navigation items structure
   - Example: form groups (label + input + error message)
   - Example: empty states / loading states / error states patterns
   - Example: notification/dropdown panels
   - Example: booking slot grids
   - Example: review cards (avatar + name + rating + text)

   For each recurring pattern found, note:
   - Where it appears (which pages/components use it)
   - The structure (what sub-components it composes)
   - The styling approach

5. **Detailed component styling** — For each component in
   `frontend/components/ui/`, read the source file and extract the
   **exact styling details**:
   - Tailwind classes used (classes from `cn()` calls, className props)
   - Variants (e.g., `variant="default" | "destructive" | "outline"`)
   - Sizes (`size="default" | "sm" | "lg"`)
   - CSS variables referenced (e.g., `bg-primary`, `text-muted-foreground`)
   - Hover/focus/disabled/active states
   - Transitions and animations
   - RTL-specific classes (`me-`, `ms-` vs `mr-`, `ml-`)
   - Custom `cva()` or `class-variance-authority` definitions
   - Compound variants or conditional logic

   Focus on components with rich styling: `button.tsx`, `input.tsx`,
   `select.tsx`, `card.tsx`, `badge.tsx`, `dialog.tsx`, `tabs.tsx`,
   `sidebar.tsx`, `table.tsx`, `checkbox.tsx`, `dropdown-menu.tsx`,
   `pagination.tsx`, and any custom components like `persian-input.tsx`,
   `time-picker.tsx`, `scroll-reveal.tsx`.

   For each component, document the styling in a concise format:
   ```
   ### Button
   - **Variants:** default (bg-primary), secondary (bg-secondary), destructive (bg-destructive), outline (border-input), ghost, link
   - **Sizes:** default (h-9 px-4 py-2), sm (h-8 px-3 text-xs), lg (h-10 px-8), icon (h-9 w-9)
   - **States:** hover (opacity-90), focus-visible (ring-2 ring-ring ring-offset-2), disabled (opacity-50 cursor-not-allowed)
   - **RTL:** uses me-/ms- for icon spacing
   ```

**Step 3: Check layout patterns**

Look at the main layout files to verify layout block descriptions:

- `frontend/app/layout.tsx` — root layout
- `frontend/app/dashboard/layout.tsx` — dashboard layout
- `frontend/app/(public)/layout.tsx` — public layout (if exists)

**Step 4: Update context/ui.md**

Merge findings into a clean, updated `context/ui.md` file.
**Important: Before writing each section, check if that content already
exists in the file. If it does, replace the existing content — never
leave duplicates or append without checking.**

1. **shadcn/ui Components section** — Update the file listing to reflect
   the actual files in `frontend/components/ui/`. Keep the same format
   (subdirectories like `input-group.tsx` grouped together).

2. **Recurring UI patterns** — Document the blocks from Step 2.4 that
   appear in multiple places. Give each pattern a descriptive title and
   note where it's used. For example:
   ```
   ### Search / Filter Bar
   Appears in: courts listing page, dashboard notifications
   Structure: search input + sort dropdown + filter chips + clear button
   Styling: flex gap-2 items-center, responsive (stack on mobile)
   ```

3. **Layout blocks** — Verify and update the dashboard and courts listing
   block descriptions against the actual layout files.

4. **Tailwind / Theming / Map sections** — These change infrequently but
   verify against the current codebase if relevant files have changed
   (e.g., `tailwind.config.ts`, global CSS, map component imports).

5. **Component Style section** — Expand this to include the detailed
   styling for each component (from Step 2.5) under its own subsection.
   Format each component as:
   ```
   - **Button** — variants: default(primary), destructive, outline, ghost, link | sizes: sm, default, lg, icon | hover opacity-90, focus ring-2
   ```
   Or a more structured block for complex components like Select, Dialog, etc.

6. **Detailed Component Reference section** — If there are many components
   with rich styling, create a dedicated section at the end of the file
   called `## Components Reference` where each component gets a concise
   entry with its Tailwind classes, variants, states, and CSS vars.

Use the same format and structure as the current file. Keep the existing
sections intact and only update content that has actually changed. Don't
add speculative sections — only document what exists in the codebase.

After writing the updated file, confirm the changes to the user.

## Edge cases

- **context/ui.md doesn't exist** — Create it from scratch with standard
  sections based on the codebase scan results.
- **No changes found** — If the UI hasn't changed since the last update,
  tell the user it's already up to date.
- **Frontend directory missing** — If `frontend/` doesn't exist, tell the
  user and abort.
