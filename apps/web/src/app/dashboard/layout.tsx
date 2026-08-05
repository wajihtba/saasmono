'use client'

import {
  dashboardMobileDrawerItems,
  dashboardMobileNavItems,
  dashboardMobileQuickActions,
  dashboardNotifications,
  dashboardSidebarData,
} from '@/config/dashboard'

import { useSessionStorage } from '@/hooks/use-session-storage'
import { authClient } from '@/lib/auth-client'
import { DashboardLayout, MobileNav } from '@repo/ui'
import { useRouter } from 'next/navigation'

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const { data, isPending, clearStoredData } = useSessionStorage()

  const handleMobileQuickAction = (action: string) => {
    switch (action) {
      case 'add-student':
        router.push('/dashboard/students/new' as any)
        break
      case 'new-report':
        router.push('/dashboard/reports/new' as any)
        break
      case 'search':
        // TODO: Implement search functionality
        console.log('Search action')
        break
      case 'settings':
        router.push('/dashboard/settings' as any)
        break
      default:
        break
    }
  }

  const handleMobileLogout = async () => {
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
        ...dashboardSidebarData,
        user: {
          name: data?.user?.name || 'User',
          email: data?.user?.email || '',
          avatar: data?.user?.image || '/logo.svg',
        },
      }}
      brandLogo={<img src="/logo-and-text.svg" alt="منارة" className="h-[34px] !w-24" />}
      brandIcon={<img src="/logo.svg" alt="منارة" className="!w-[34px]" />}
    >
      {children}

      {/* Mobile Navigation */}
      <MobileNav
        mainNavItems={dashboardMobileNavItems}
        quickActions={dashboardMobileQuickActions}
        drawerItems={dashboardMobileDrawerItems}
        basePath="/dashboard"
        onQuickAction={handleMobileQuickAction}
        onLogout={handleMobileLogout}
        notifications={{
          count: dashboardNotifications.filter((n) => !n.isRead).length,
          variant: 'destructive',
        }}
      />
    </DashboardLayout>
  )
}
