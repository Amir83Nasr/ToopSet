"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

function Drawer({
  shouldScaleBackground = true,
  direction = "bottom",
  open,
  defaultOpen = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  const isOpen = open ?? defaultOpen

  React.useLayoutEffect(() => {
    if (isOpen && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }, [isOpen])

  useScrollLock(isOpen)

  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      open={open}
      defaultOpen={defaultOpen}
      shouldScaleBackground={shouldScaleBackground}
      direction={direction}
      {...props}
    />
  )
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn("fixed inset-0 z-50 bg-black/10", className)}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex h-auto flex-col rounded-t-4xl border bg-popover text-sm text-popover-foreground shadow-lg",
          "pb-safe",
          className
        )}
        {...props}
      >
        {/* Drag handle + optional close button row — pinned at top */}
        <div className="relative flex shrink-0 items-center justify-center">
          <div className="mt-2 h-1 w-16 shrink-0 rounded-full bg-muted-foreground/20" />
          {showCloseButton && (
            <DrawerPrimitive.Close data-slot="drawer-close" asChild>
              <Button
                variant="ghost"
                className="absolute inset-e-2 top-1/2 z-10 size-11 -translate-y-1/2 sm:size-8"
                size="icon-sm"
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerPrimitive.Close>
          )}
        </div>
        {/* Scrollable body — fills remaining space */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-2">
          {children}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-1 text-center sm:text-start",
        "pt-4 pb-2",
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "mt-auto flex flex-col-reverse gap-3 py-3 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "font-heading text-base leading-none font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
