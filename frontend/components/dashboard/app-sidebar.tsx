"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogMedia,
  ResponsiveAlertDialogTitle,
} from "@/components/ui/responsive-alert-dialog"
import { useAuth } from "@/hooks/use-auth"
import { LogOut } from "lucide-react"
import { NavMain } from "./nav-main"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, setOpenMobile } = useSidebar()
  const { logout } = useAuth()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const logoutDialogTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (logoutDialogTimer.current) clearTimeout(logoutDialogTimer.current)
    },
    []
  )

  const openLogoutDialog = () => {
    if (!isMobile) {
      setLogoutDialogOpen(true)
      return
    }

    // The mobile sidebar is itself a modal sheet. Let it finish closing before
    // opening the confirmation drawer so focus and stacking are transferred.
    setOpenMobile(false)
    if (logoutDialogTimer.current) clearTimeout(logoutDialogTimer.current)
    logoutDialogTimer.current = setTimeout(() => {
      setLogoutDialogOpen(true)
      logoutDialogTimer.current = null
    }, 550)
  }

  return (
    <>
      <Sidebar collapsible="icon" side="right" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                className="group-data-[collapsible=icon]:p-0!"
              >
                <Link href="/" className="text-lg font-bold">
                  <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                    <Image
                      src="/icons/logo-180.webp"
                      alt="توپ‌سِت"
                      width={32}
                      height={32}
                      className="size-8"
                      priority
                    />
                  </span>
                  <span className="text-lg font-bold">توپ‌سِت</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain onLogoutRequest={openLogoutDialog} />
        </SidebarContent>
      </Sidebar>

      <ResponsiveAlertDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        mobileAsSheet={false}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogMedia className="bg-destructive/10 dark:bg-destructive/20">
              <LogOut className="text-destructive" />
            </ResponsiveAlertDialogMedia>
            <ResponsiveAlertDialogTitle>
              خروج از حساب
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={loggingOut}>
              انصراف
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              variant="destructive"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true)
                try {
                  await logout()
                  setLogoutDialogOpen(false)
                } finally {
                  setLoggingOut(false)
                }
              }}
            >
              {loggingOut ? "در حال خروج..." : "خروج"}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </>
  )
}
