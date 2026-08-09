'use client'

import { EducationSubjectTable } from '@/components/curriculum/education-subject-table'
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
import { BookOpen, GraduationCap, Settings } from 'lucide-react'

export default function Curriculum() {
  const { can } = usePermissions()

  // Every role reads the curriculum; only the org-wide ones change it, so the
  // subject actions and the two management tabs go with the write permission.
  const canWrite = can(Permission.CURRICULUM_WRITE)

  const handleEditSubject = (subjectId: string) => {
    console.log('Edit subject:', subjectId)
    // TODO: Implement edit functionality
  }

  const handleViewSubject = (subjectId: string) => {
    console.log('View subject:', subjectId)
    // TODO: Implement view functionality
  }

  const handleCreateNewSubject = () => {
    console.log('Create new subject')
    // TODO: Implement create functionality
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة المنهج الدراسي</h1>
          <p className="text-muted-foreground">إدارة المواد الدراسية والمستويات التعليمية للمؤسسة</p>
        </div>
      </div>

      <Tabs defaultValue="subjects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            المواد الدراسية
          </TabsTrigger>
          {canWrite && (
            <TabsTrigger value="levels" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              المستويات التعليمية
            </TabsTrigger>
          )}
          {canWrite && (
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              إعدادات المنهج
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="subjects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>المواد الدراسية</CardTitle>
              <CardDescription>إدارة المواد الدراسية وربطها بالمستويات التعليمية المختلفة</CardDescription>
            </CardHeader>
            <CardContent>
              <EducationSubjectTable
                onEdit={canWrite ? handleEditSubject : undefined}
                onCreateNew={canWrite ? handleCreateNewSubject : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {canWrite && (
          <TabsContent value="levels" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>المستويات التعليمية</CardTitle>
                <CardDescription>إدارة المستويات التعليمية والفصول الدراسية</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12">
                  <div className="space-y-4 text-center">
                    <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                      <GraduationCap className="text-muted-foreground h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">المستويات التعليمية</h3>
                      <p className="text-muted-foreground mt-1">سيتم إضافة إدارة المستويات التعليمية قريباً</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canWrite && (
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات المنهج</CardTitle>
                <CardDescription>إعدادات عامة للمنهج الدراسي والتقييم</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12">
                  <div className="space-y-4 text-center">
                    <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                      <Settings className="text-muted-foreground h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">إعدادات المنهج</h3>
                      <p className="text-muted-foreground mt-1">سيتم إضافة إعدادات المنهج قريباً</p>
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
