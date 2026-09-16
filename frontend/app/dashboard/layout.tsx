import { ErrorBoundary } from "@/components/ui/error-boundary"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SiteHeader as PublicSiteHeader } from "@/components/public/site-header"
import { AuthGuard } from "@/components/auth/auth-guard"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AuthGuard>
      <ErrorBoundary>
        <PublicSiteHeader />
        <div className="flex min-h-svh flex-col pt-16">
          <SidebarProvider
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
            className="min-h-0 flex-1"
          >
            <AppSidebar
              variant="inset"
              className="top-16 h-[calc(100svh-4rem)]"
            />
            {/* min-w-0 lets the inset shrink below its content's min-content
                width, so wide inner scrollers (tables) scroll inside their own
                container instead of pushing the whole page sideways. */}
            <SidebarInset className="min-w-0">
              <div className="flex flex-col gap-4 p-4">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </ErrorBoundary>
    </AuthGuard>
  )
}
