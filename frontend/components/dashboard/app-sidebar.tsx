"use client"

import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import Image from "next/image"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" side="right" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-heading text-lg font-bold"
          >
            <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-primary">
              <Image
                src="/favicon.svg"
                alt="توپ‌سِت"
                width={32}
                height={32}
                className="size-8"
              />
            </div>
            <span className="truncate group-data-[collapsible=icon]:hidden">
              توپ‌سِت
            </span>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
