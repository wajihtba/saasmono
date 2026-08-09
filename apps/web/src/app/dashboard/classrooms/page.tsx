'use client'

import { ClassroomsTable } from '@/components/classroms/classrooms-table'
import { usePermissions } from '@/hooks/use-permissions'
import { Permission } from '@repo/rbac'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui'
import { Building2, Calendar, Users } from 'lucide-react'

export default function Classrooms() {
  const { can } = usePermissions()

  // Everything on this page except the classroom list itself is a management
  // surface, so a role that cannot write classrooms only ever sees the list.
  const canWrite = can(Permission.CLASSROOM_WRITE)
  const canWriteTimetable = can(Permission.TIMETABLE_WRITE)

  const handleEditClassroom = (classroomId: string) => {
    console.log('Edit classroom:', classroomId)
    // TODO: Implement edit functionality
  }

  const handleViewClassroom = (classroomId: string) => {
    console.log('View classroom:', classroomId)
    // TODO: Implement view functionality
  }

  const handleCreateNewClassroom = () => {
    console.log('Create new classroom')
    // TODO: Implement create functionality
  }

  return (
    <div className="flex-1 space-y-6 p-2 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">إدارة الفصول الدراسية</h1>
        </div>
      </div>

      <Tabs defaultValue="classrooms" className="space-y-6">
        <TabsList>
          <TabsTrigger value="classrooms" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            الفصول الدراسية
          </TabsTrigger>
          {canWrite && (
            <TabsTrigger value="enrollments" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              تسجيل الطلاب
            </TabsTrigger>
          )}
          {canWriteTimetable && (
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              الجداول الدراسية
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="classrooms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>الفصول الدراسية</CardTitle>
              <CardDescription>إدارة الفصول الدراسية ومتابعة أعداد الطلاب والمعلمين</CardDescription>
            </CardHeader>
            <CardContent>
              <ClassroomsTable
                onEdit={canWrite ? handleEditClassroom : undefined}
                onCreateNew={canWrite ? handleCreateNewClassroom : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {canWrite && (
          <TabsContent value="enrollments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تسجيل الطلاب</CardTitle>
                <CardDescription>إدارة تسجيل الطلاب في الفصول الدراسية</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12">
                  <div className="space-y-4 text-center">
                    <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                      <Users className="text-muted-foreground h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">تسجيل الطلاب</h3>
                      <p className="text-muted-foreground mt-1">سيتم إضافة إدارة تسجيل الطلاب قريباً</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canWriteTimetable && (
          <TabsContent value="schedules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>الجداول الدراسية</CardTitle>
                <CardDescription>إدارة الجداول الدراسية ومواعيد الحصص</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12">
                  <div className="space-y-4 text-center">
                    <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                      <Calendar className="text-muted-foreground h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">الجداول الدراسية</h3>
                      <p className="text-muted-foreground mt-1">سيتم إضافة إدارة الجداول الدراسية قريباً</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}