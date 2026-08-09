'use client'

import {
  dashboardMobileDrawerItems,
  dashboardMobileNavItems,
  dashboardMobileQuickActions,
  dashboardNotifications,
  dashboardSidebarData,
} from '@/config/dashboard'

import { useOrgRole } from '@/hooks/use-org-role'
import { useSessionStorage } from '@/hooks/use-session-storage'
import { authClient } from '@/lib/auth-client'
import { filterByHref, filterByPermission, filterDrawerItems, filterSidebarData } from '@/lib/nav-access'
import { canAccessRoute } from '@repo/rbac'
import { DashboardLayout, MobileNav } from '@repo/ui'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const { data, isPending, clearStoredData } = useSessionStorage()
  const { role, isPending: isRolePending } = useOrgRole()

  // Menus a role may not use are hidden; the page guard below is what actually
  // keeps them out, and the API permission matrix is what protects the data.
  const sidebarData = useMemo(() => filterSidebarData(dashboardSidebarData, role), [role])
  const mobileNavItems = useMemo(() => filterByHref(dashboardMobileNavItems, role), [role])
  const drawerItems = useMemo(() => filterDrawerItems(dashboardMobileDrawerItems, role), [role])
  // Both filters apply: the route has to be openable and the action has to be
  // one the role may actually perform.
  const quickActions = useMemo(
    () => filterByPermission(filterByHref(dashboardMobileQuickActions, role), role),
    [role]
  )

  useEffect(() => {
    if (isRolePending || !pathname) return
    if (!canAccessRoute(role, pathname)) {
      router.replace('/dashboard')
    }
  }, [role, isRolePending, pathname, router])

  const handleMobileQuickAction = (action: string) => {
    const target = quickActions.find((item) => item.action === action)
    if (target) router.push(target.href)
  }

  const handleLogout = async () => {
    clearStoredData()
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/')
        },
      },
    })
  }

  return (
    <DashboardLayout
      sidebarData={{
        ...sidebarData,
        user: {
          name: data?.user?.name || 'User',
          email: data?.user?.email || '',
          avatar: data?.user?.image || '/logo.svg',
          onLogout: handleLogout,
        },
      }}
      brandLogo={<img src="/logo-and-text.svg" alt="منارة" className="h-[34px] !w-24" />}
      brandIcon={<img src="/logo.svg" alt="منارة" className="!w-[34px]" />}
    >
      {children}

      {/* Mobile Navigation */}
      <MobileNav
        mainNavItems={mobileNavItems}
        quickActions={quickActions}
        drawerItems={drawerItems}
        basePath="/dashboard"
        onQuickAction={handleMobileQuickAction}
        onLogout={handleLogout}
        notifications={{
          count: dashboardNotifications.filter((n) => !n.isRead).length,
          variant: 'destructive',
        }}
      />
    </DashboardLayout>
  )
}
