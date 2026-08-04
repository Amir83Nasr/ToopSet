"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction as AlertDialogActionPrimitive,
  AlertDialogCancel as AlertDialogCancelPrimitive,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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

interface ResponsiveAlertCtxValue {
  isDrawer: boolean
}

const ResponsiveAlertDialogCtx = React.createContext<ResponsiveAlertCtxValue>({
  isDrawer: false,
})

function useAlertCtx() {
  return React.useContext(ResponsiveAlertDialogCtx)
}

// ── Root ──────────────────────────────────────────────────────────────────────

function ResponsiveAlertDialog({
  open,
  onOpenChange,
  children,
  /** Set false to keep the centered alert dialog on mobile. */
  mobileAsSheet = true,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
  mobileAsSheet?: boolean
}) {
  const isMobile = useIsMobile()
  const useDrawer = isMobile && mobileAsSheet
  const Root = useDrawer ? Drawer : AlertDialog

  return (
    <ResponsiveAlertDialogCtx.Provider value={{ isDrawer: useDrawer }}>
      <Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Root>
    </ResponsiveAlertDialogCtx.Provider>
  )
}

// ── Trigger ───────────────────────────────────────────────────────────────────

function ResponsiveAlertDialogTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogTrigger>) {
  const { isDrawer } = useAlertCtx()
  const Trigger = isDrawer ? DrawerTrigger : AlertDialogTrigger
  return (
    <Trigger asChild={asChild} {...props}>
      {children}
    </Trigger>
  )
}

// ── Content ───────────────────────────────────────────────────────────────────

function ResponsiveAlertDialogContent({
  className,
  children,
  size,
  ...props
}: React.ComponentProps<typeof AlertDialogContent>) {
  const { isDrawer } = useAlertCtx()

  if (isDrawer) {
    return (
      <DrawerContent
        className={cn("overflow-y-auto", className)}
        showCloseButton={false}
        {...(props as unknown as Record<string, unknown>)}
      >
        {children}
      </DrawerContent>
    )
  }

  return (
    <AlertDialogContent
      className={className}
      size={size as "default" | "sm" | undefined}
      {...props}
    >
      {children}
    </AlertDialogContent>
  )
}

// ── Header / Title / Description ──────────────────────────────────────────────

function ResponsiveAlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogHeader>) {
  const { isDrawer } = useAlertCtx()
  const Header = isDrawer ? DrawerHeader : AlertDialogHeader
  return <Header className={className} {...props} />
}

function ResponsiveAlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogTitle>) {
  const { isDrawer } = useAlertCtx()
  const Title = isDrawer ? DrawerTitle : AlertDialogTitle
  return <Title className={className} {...props} />
}

function ResponsiveAlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogDescription>) {
  const { isDrawer } = useAlertCtx()
  const Description = isDrawer ? DrawerDescription : AlertDialogDescription
  return <Description className={className} {...props} />
}

function ResponsiveAlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogFooter>) {
  const { isDrawer } = useAlertCtx()
  const Footer = isDrawer ? DrawerFooter : AlertDialogFooter
  return <Footer className={className} {...props} />
}

// ── Action / Cancel (confirmation buttons) ────────────────────────────────────

function ResponsiveAlertDialogAction({
  className,
  children,
  onClick,
  disabled,
  variant = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogActionPrimitive> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  const { isDrawer } = useAlertCtx()

  if (isDrawer) {
    return (
      <Button
        variant={variant}
        onClick={onClick}
        disabled={disabled}
        className={className}
        {...(props as unknown as Record<string, unknown>)}
      >
        {children}
      </Button>
    )
  }

  return (
    <AlertDialogActionPrimitive
      variant={variant}
      disabled={disabled}
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </AlertDialogActionPrimitive>
  )
}

function ResponsiveAlertDialogCancel({
  className,
  children,
  onClick,
  disabled,
  variant = "outline",
  ...props
}: React.ComponentProps<typeof AlertDialogCancelPrimitive> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  const { isDrawer } = useAlertCtx()

  if (isDrawer) {
    return (
      <DrawerClose asChild disabled={disabled}>
        <Button
          variant={variant}
          onClick={onClick}
          disabled={disabled}
          className={className}
          {...(props as unknown as Record<string, unknown>)}
        >
          {children}
        </Button>
      </DrawerClose>
    )
  }

  return (
    <AlertDialogCancelPrimitive
      variant={variant}
      disabled={disabled}
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </AlertDialogCancelPrimitive>
  )
}

// ── Media (desktop‑only icon area; not rendered in mobile Drawer) ─────────────

function ResponsiveAlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogMedia>) {
  const { isDrawer } = useAlertCtx()
  if (isDrawer) return null
  return <AlertDialogMedia className={className} {...props} />
}

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogTrigger,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogMedia,
}
