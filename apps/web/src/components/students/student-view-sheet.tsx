'use client'

import { formatDate } from '@/lib/date'
import { orpc } from '@/utils/orpc'
import { Badge, Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle, Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Building2, Calendar, GraduationCap, Mail, Shield, User, Users } from 'lucide-react'

import type { StudentListItem } from './types'

interface StudentEducationLevel {
  id: string
  level: number
  displayNameAr: string | null
  displayNameEn: string | null
  displayNameFr: string | null
  section: string | null
}

interface StudentClassroom {
  id: string
  name: string
  code: string
  academicYear: string
  capacity: number | null
  enrollmentDate: Date
  enrollmentStatus: string
  educationLevel: StudentEducationLevel
}

interface StudentParent {
  relationId: string
  parentId: string
  parentName: string
  parentLastName: string
  parentEmail: string
  relationshipType: string
  createdAt: Date
}

interface StudentTeacher {
  id: string
  name: string
  lastName: string
  email: string
  role: string
  isMainTeacher: boolean
  assignmentId: string
}

interface StudentSubjectWithTeachers {
  id: string
  name: string
  displayNameAr: string | null
  displayNameEn: string | null
  displayNameFr: string | null
  teachers: StudentTeacher[]
}

interface StudentGroup {
  id: string
  name: string
  code: string
  description: string | null
  maxCapacity: number | null
  isDefault: boolean
  isActive: boolean
  subject: {
    id: string
    name: string
    displayNameAr: string | null
    displayNameEn: string | null
    displayNameFr: string | null
  } | null
  membershipId: string
}

interface StudentDetailedResponse {
  id: string
  name: string
  lastName: string
  email: string
  userType: 'student'
  createdAt: Date
  updatedAt: Date
  parents: StudentParent[]
  classroom: StudentClassroom | null
  groups: StudentGroup[]
  subjects: StudentSubjectWithTeachers[]
}

interface StudentViewSheetProps {
  student: StudentListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StudentViewSheet({ student, open, onOpenChange }: StudentViewSheetProps) {
  const { data: detailedStudent, isLoading } = useQuery({
    ...orpc.management.students.getStudentById.queryOptions({ input: { studentId: student?.id || '' } }),
    enabled: !!student?.id && open && student.id.length > 0,
  })

  if (!student) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent isMobileSheet className="sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg">
                {student.name} {student.lastName}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {student.email}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody>
          <div dir="rtl" className="py-2">
            <Tabs defaultValue="basic-info" className="space-y-6">
              <TabsList>
                <TabsTrigger value="basic-info" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>المعلومات الأساسية</span>
                </TabsTrigger>
                <TabsTrigger value="subjects-info" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>معلومات المواد الدراسية</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent dir="rtl" value="basic-info" className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-3">
                  <h3 className="text-muted-foreground text-sm font-medium">المعلومات الأساسية</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <User className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm">الاسم الكامل</span>
                      </div>
                      <span className="text-sm font-medium">
                        {student.name} {student.lastName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Mail className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm">البريد الإلكتروني</span>
                      </div>
                      <span className="text-sm font-medium">{student.email}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm">تاريخ التسجيل</span>
                      </div>
                      <span className="text-sm font-medium">{formatDate(student.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Parents Information */}
                {detailedStudent && (
                  <div className="mt-6 space-y-3">
                    <h3 className="text-muted-foreground text-sm font-medium">
                      أولياء الأمور ({detailedStudent.parents.length})
                    </h3>
                    {detailedStudent.parents.length > 0 ? (
                      <div className="space-y-2">
                        {detailedStudent.parents.map((parent: StudentParent) => (
                          <div key={parent.relationId} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <User className="text-muted-foreground h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {parent.parentName} {parent.parentLastName}
                                </span>
                              </div>
                              <Badge variant="outline">
                                {parent.relationshipType === 'parent' ? 'والد/والدة' : parent.relationshipType}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                              <Mail className="h-3 w-3" />
                              {parent.parentEmail}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-6 text-center">
                        <Users className="text-muted-foreground mx-auto h-8 w-8" />
                        <p className="text-muted-foreground mt-2 text-sm">لا توجد علاقات أولياء أمور مسجلة</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Classroom Information */}
                <div className="mt-6 space-y-3">
                  <h3 className="text-muted-foreground text-sm font-medium">معلومات الفصل الدراسي</h3>
                  {student.classroom ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="text-muted-foreground h-4 w-4" />
                          <span className="text-sm">اسم الفصل</span>
                        </div>
                        <span className="text-sm font-medium">{student.classroom.name}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Shield className="text-muted-foreground h-4 w-4" />
                          <span className="text-sm">كود الفصل</span>
                        </div>
                        <span className="text-sm font-medium">{student.classroom.code}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="text-muted-foreground h-4 w-4" />
                          <span className="text-sm">المستوى التعليمي</span>
                        </div>
                        <span className="text-sm font-medium">
                          {student.classroom.educationLevel.displayNameAr ||
                            `الصف ${student.classroom.educationLevel.level}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="text-muted-foreground h-4 w-4" />
                          <span className="text-sm">العام الدراسي</span>
                        </div>
                        <span className="text-sm font-medium">{student.classroom.academicYear}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Shield className="text-muted-foreground h-4 w-4" />
                          <span className="text-sm">حالة التسجيل</span>
                        </div>
                        <Badge
                          variant={
                            student.classroom.enrollmentStatus === 'active'
                              ? 'default'
                              : student.classroom.enrollmentStatus === 'inactive'
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {student.classroom.enrollmentStatus === 'active'
                            ? 'نشط'
                            : student.classroom.enrollmentStatus === 'inactive'
                              ? 'غير نشط'
                              : student.classroom.enrollmentStatus === 'transferred'
                                ? 'محول'
                                : student.classroom.enrollmentStatus}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-center">
                      <Building2 className="text-muted-foreground mx-auto h-8 w-8" />
                      <p className="text-muted-foreground mt-2 text-sm">الطالب غير مسجل في أي فصل دراسي</p>
                    </div>
                  )}
                </div>

                {/* Groups Information */}
                {detailedStudent && (
                  <div className="mt-6 space-y-3">
                    <h3 className="text-muted-foreground text-sm font-medium">
                      المجموعات ({detailedStudent.groups.length})
                    </h3>
                    {detailedStudent.groups.length > 0 ? (
                      <div className="space-y-2">
                        {detailedStudent.groups.map((group: StudentGroup) => (
                          <div key={group.id} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Users className="text-muted-foreground h-4 w-4" />
                                <span className="text-sm font-medium">{group.name}</span>
                              </div>
                              <div className="flex gap-1">
                                <Badge variant={group.isActive ? 'default' : 'secondary'}>
                                  {group.isActive ? 'نشط' : 'غير نشط'}
                                </Badge>
                                {group.isDefault && <Badge variant="outline">افتراضي</Badge>}
                              </div>
                            </div>
                            {group.subject && (
                              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                                <BookOpen className="h-3 w-3" />
                                {group.subject.displayNameAr || group.subject.name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-6 text-center">
                        <Users className="text-muted-foreground mx-auto h-8 w-8" />
                        <p className="text-muted-foreground mt-2 text-sm">الطالب غير مسجل في أي مجموعات</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Subjects Information */}
              <TabsContent dir="rtl" value="subjects-info" className="space-y-6">
                {detailedStudent && (
                  <div className="mt-6 space-y-3">
                    <h3 className="text-muted-foreground text-sm font-medium">
                      المواد الدراسية ({detailedStudent.subjects.length})
                    </h3>
                    {detailedStudent.subjects.length > 0 ? (
                      <div className="space-y-3">
                        {detailedStudent.subjects.map((subject: StudentSubjectWithTeachers) => (
                          <div key={subject.id} className="rounded-lg border p-3">
                            <div className="mb-2 flex items-center gap-2">
                              <BookOpen className="text-muted-foreground h-4 w-4" />
                              <span className="text-sm font-medium">{subject.displayNameAr || subject.name}</span>
                            </div>
                            <div className="space-y-1">
                              {subject.teachers.map((teacher: StudentTeacher) => (
                                <div key={teacher.id} className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    {teacher.name} {teacher.lastName}
                                  </span>
                                  <div className="flex gap-1">
                                    <Badge variant="outline">
                                      {teacher.role}
                                    </Badge>
                                    {teacher.isMainTeacher && (
                                      <Badge variant="default">
                                        مدرس رئيسي
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-6 text-center">
                        <BookOpen className="text-muted-foreground mx-auto h-8 w-8" />
                        <p className="text-muted-foreground mt-2 text-sm">لا توجد مواد دراسية مسجلة</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
