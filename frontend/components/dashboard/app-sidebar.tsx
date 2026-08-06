"use client"

import { useEffect, useRef, useState } from "react"
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar"
import { LogoutDialog } from "@/components/public/logout-dialog"
import { useAuth } from "@/hooks/use-auth"
import { NavMain } from "./nav-main"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, setOpenMobile } = useSidebar()
  const { logout } = useAuth()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
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
        <SidebarContent>
          <NavMain onLogoutRequest={openLogoutDialog} />
        </SidebarContent>
      </Sidebar>

      <LogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={logout}
      />
    </>
  )
}
