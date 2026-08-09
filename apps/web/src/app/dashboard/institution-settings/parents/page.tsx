'use client'

import { ParentsTable } from '@/components/parents/parents-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePermissions } from '@/hooks/use-permissions'
import { Permission } from '@repo/rbac'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'

export default function Parents() {
  const isMobile = useIsMobile()
  const { can } = usePermissions()

  // The table drops an action whose handler is missing, so a role without the
  // write permission never sees the button the API would reject.
  const canWrite = can(Permission.PARENT_WRITE)

  const handleEditParent = (parentId: string) => {
    console.log('Edit parent:', parentId)
    // TODO: Implement edit functionality
  }

  const handleCreateNewParent = () => {
    console.log('Create new parent')
    // TODO: Implement create functionality
  }

  if (isMobile) {
    return (
      <ParentsTable
        onEdit={canWrite ? handleEditParent : undefined}
        onCreateNew={canWrite ? handleCreateNewParent : undefined}
      />
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة أولياء الأمور</h1>
          <p className="text-muted-foreground">إدارة أولياء الأمور وعلاقاتهم مع الطلاب</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>أولياء الأمور</CardTitle>
          <CardDescription>إدارة قائمة أولياء الأمور ومعلوماتهم الشخصية وعلاقاتهم مع الأطفال</CardDescription>
        </CardHeader>
        <CardContent>
          <ParentsTable
            onEdit={canWrite ? handleEditParent : undefined}
            onCreateNew={canWrite ? handleCreateNewParent : undefined}
          />
        </CardContent>
      </Card>
    </div>
  )
}