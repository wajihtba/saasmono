'use client'

import { TeachersTable } from '@/components/teachers/teachers-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePermissions } from '@/hooks/use-permissions'
import { Permission } from '@repo/rbac'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'

export default function Teachers() {
  const isMobile = useIsMobile()
  const { can } = usePermissions()

  // The table drops an action whose handler is missing, so a role without the
  // write permission never sees the button the API would reject.
  const canWrite = can(Permission.TEACHER_WRITE)
  const handleEditTeacher = (teacherId: string) => {
    console.log('Edit teacher:', teacherId)
    // TODO: Implement edit functionality
  }

  const handleViewTeacher = (teacherId: string) => {
    console.log('View teacher:', teacherId)
    // TODO: Implement view functionality
  }

  const handleCreateNewTeacher = () => {
    console.log('Create new teacher')
    // TODO: Implement create functionality
  }
  if (isMobile) {
    return (
      <TeachersTable
        onEdit={canWrite ? handleEditTeacher : undefined}
        onCreateNew={canWrite ? handleCreateNewTeacher : undefined}
      />
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة المعلمين</h1>
          <p className="text-muted-foreground">إدارة الهيئة التدريسية وتكليفاتهم التعليمية</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>المعلمين</CardTitle>
          <CardDescription>إدارة قائمة المعلمين ومعلوماتهم الشخصية والمهنية</CardDescription>
        </CardHeader>
        <CardContent>
          <TeachersTable
            onEdit={canWrite ? handleEditTeacher : undefined}
            onCreateNew={canWrite ? handleCreateNewTeacher : undefined}
          />
        </CardContent>
      </Card>
    </div>
  )
}
