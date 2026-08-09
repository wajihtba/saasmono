'use client'

import { StudentsTable } from '@/components/students/students-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePermissions } from '@/hooks/use-permissions'
import { Permission } from '@repo/rbac'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'

export default function Students() {
  const isMobile = useIsMobile()
  const { can } = usePermissions()

  // The table drops an action whose handler is missing, so a role without the
  // write permission never sees the button the API would reject.
  const canWrite = can(Permission.STUDENT_WRITE)

  const handleEditStudent = (studentId: string) => {
    console.log('Edit student:', studentId)
    // TODO: Implement edit functionality
  }

  const handleViewStudent = (studentId: string) => {
    console.log('View student:', studentId)
    // TODO: Implement view functionality
  }

  const handleCreateNewStudent = () => {
    console.log('Create new student')
    // TODO: Implement create functionality
  }

  if (isMobile) {
    return (
      <StudentsTable
        onEdit={canWrite ? handleEditStudent : undefined}
        onCreateNew={canWrite ? handleCreateNewStudent : undefined}
      />
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الطلاب</h1>
          <p className="text-muted-foreground">إدارة قائمة الطلاب ومعلوماتهم الشخصية والأكاديمية</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>الطلاب</CardTitle>
          <CardDescription>إدارة قائمة الطلاب ومعلوماتهم الشخصية وأولياء الأمور والانتساب للفصول</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentsTable
            onEdit={canWrite ? handleEditStudent : undefined}
            onCreateNew={canWrite ? handleCreateNewStudent : undefined}
          />
        </CardContent>
      </Card>
    </div>
  )
}