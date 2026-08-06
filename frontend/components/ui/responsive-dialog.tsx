"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

// ── Context ──────────────────────────────────────────────────────────────────

interface ResponsiveCtxValue {
  isMobile: boolean
  isSheet: boolean
}

const ResponsiveDialogCtx = React.createContext<ResponsiveCtxValue>({
  isMobile: false,
  isSheet: false,
})

function useResponsiveCtx() {
  return React.useContext(ResponsiveDialogCtx)
}

// ── Root ──────────────────────────────────────────────────────────────────────

function ResponsiveDialog({
  open,
  onOpenChange,
  children,
  /** Set false to keep Desktop Dialog even on mobile (e.g. fullscreen lightbox). */
  mobileAsSheet = true,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
  mobileAsSheet?: boolean
}) {
  const isMobile = useIsMobile()
  const useDrawer = isMobile && mobileAsSheet
  const Root = useDrawer ? Drawer : Dialog

  return (
    <ResponsiveDialogCtx.Provider value={{ isMobile, isSheet: useDrawer }}>
      <Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Root>
    </ResponsiveDialogCtx.Provider>
  )
}

// ── Trigger ───────────────────────────────────────────────────────────────────

function ResponsiveDialogTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const { isSheet } = useResponsiveCtx()
  const Trigger = isSheet ? DrawerTrigger : DialogTrigger
  return (
    <Trigger asChild={asChild} {...props}>
      {children}
    </Trigger>
  )
}

// ── Content ───────────────────────────────────────────────────────────────────

interface ResponsiveDialogContentProps extends React.ComponentProps<
  typeof DialogContent
> {
  /** Mobile drawer side — only works with Dialog (Sheet) root.
   *  Drawer (vaul) is always bottom; this prop is ignored when Drawer is active. */
  sheetSide?: "top" | "right" | "bottom" | "left"
  /** Max height on mobile (CSS value). Default "85dvh". */
  mobileMaxHeight?: string
}

function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
  sheetSide = "bottom",
  mobileMaxHeight = "85dvh",
  style,
  ...props
}: ResponsiveDialogContentProps) {
  const { isSheet } = useResponsiveCtx()

  if (isSheet) {
    return (
      <DrawerContent
        className={cn("overflow-y-auto", className)}
        showCloseButton={false}
        style={{
          ...(sheetSide === "bottom"
            ? { maxHeight: mobileMaxHeight }
            : undefined),
          ...style,
        }}
        {...(props as unknown as React.ComponentProps<typeof DrawerContent> &
          Record<string, unknown>)}
      >
        {children}
      </DrawerContent>
    )
  }

  return (
    <DialogContent
      className={className}
      showCloseButton={showCloseButton}
      style={style}
      {...props}
    >
      {children}
    </DialogContent>
  )
}

// ── Sub‑components (delegate to Drawer / Dialog automatically) ─────────────────

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  const { isSheet } = useResponsiveCtx()
  const Header = isSheet ? DrawerHeader : DialogHeader
  return <Header className={className} {...props} />
}

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const { isSheet } = useResponsiveCtx()
  const Comp = isSheet ? DrawerTitle : DialogTitle
  return <Comp className={className} {...props} />
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const { isSheet } = useResponsiveCtx()
  const Comp = isSheet ? DrawerDescription : DialogDescription
  return <Comp className={className} {...props} />
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  const { isSheet } = useResponsiveCtx()
  const Footer = isSheet ? DrawerFooter : DialogFooter
  return <Footer className={className} {...props} />
}

function ResponsiveDialogClose({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const { isSheet } = useResponsiveCtx()
  const Close = isSheet ? DrawerClose : DialogClose
  return (
    <Close asChild={asChild} {...props}>
      {children}
    </Close>
  )
}

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
  useResponsiveCtx,
}
