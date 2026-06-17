"use client"

import { Sidebar, SidebarContent } from "@/components/ui/sidebar"
import { NavMain } from "./nav-main"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" side="right" {...props}>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
    </Sidebar>
  )
}
