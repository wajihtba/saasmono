'use client'

import { usePermissions } from '@/hooks/use-permissions'
import { orpc } from '@/utils/orpc'
import { Badge, Button, GenericTable } from '@repo/ui'
import { useQuery } from '@tanstack/react-query'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { BookOpen, Building2, Eye, Mail, Plus, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TeacherViewSheet } from './teacher-view-sheet'

interface TeacherSubjectAssignment {
  id: string
  name: string
  displayNameAr: string
  role: string
  isMainTeacher: boolean
  assignmentId: string
}

interface TeacherClassroom {
  id: string
  name: string
  code: string
  academicYear: string
  educationLevel: {
    id: string
    level: number
    displayNameAr: string | null
  }
  subjects: TeacherSubjectAssignment[]
}

interface TeacherWithAssignments {
  id: string
  name: string
  lastName: string
  email: string
  userType: 'teacher'
  createdAt: Date
  updatedAt: Date
  classrooms: TeacherClassroom[]
}

interface TeachersTableProps {
  onEdit?: (teacherId: string) => void
  onDelete?: (teacherId: string) => void
  onCreateNew?: () => void
}

const columnHelper = createColumnHelper<TeacherWithAssignments>()

export function TeachersTable({ onEdit, onDelete, onCreateNew }: TeachersTableProps) {
  const { isPending: isRolePending } = usePermissions()
  const { data: teachers = [], isLoading, error } = useQuery(orpc.management.teachers.getTeachersList.queryOptions())

  // Type assertion for teachers data
  const typedTeachers = (teachers as TeacherWithAssignments[]) || []

  const [searchValue, setSearchValue] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  })

  // Sheet state
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherWithAssignments | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleViewTeacher = (teacher: TeacherWithAssignments) => {
    setSelectedTeacher(teacher)
    setIsSheetOpen(true)
  }

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'teacher',
        header: 'المعلم',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <User className="text-primary h-5 w-5" />
            </div>
            <div>
              <div className="text-foreground font-medium">
                {row.original.name} {row.original.lastName}
              </div>
              <div className="text-muted-foreground flex items-center gap-1 text-sm">
                <Mail className="h-3 w-3" />
                {row.original.email}
              </div>
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: 'assignments',
        header: 'التكليفات',
        cell: ({ row }) => (
          <div className="space-y-2">
            {row.original.classrooms.length > 0 ? (
              <div className="space-y-1">
                {row.original.classrooms.slice(0, 2).map((classroom) => (
                  <div key={classroom.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="text-muted-foreground h-3 w-3" />
                      <span className="text-sm font-medium">{classroom.name}</span>
                      <Badge variant="outline" className="text-xs">
                        المستوى {classroom.educationLevel.level}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 ps-5">
                      {classroom.subjects.slice(0, 3).map((subject) => (
                        <Badge key={subject.id} variant="secondary" className="text-xs">
                          {subject.displayNameAr}
                          {subject.isMainTeacher && ' (رئيسي)'}
                        </Badge>
                      ))}
                      {classroom.subjects.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{classroom.subjects.length - 3} أخرى
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {row.original.classrooms.length > 2 && (
                  <div className="text-muted-foreground text-xs">+{row.original.classrooms.length - 2} فصول أخرى</div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">لا توجد تكليفات</div>
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'stats',
        header: 'الإحصائيات',
        cell: ({ row }) => {
          const totalClassrooms = row.original.classrooms.length
          const totalSubjects = row.original.classrooms.reduce((sum, classroom) => sum + classroom.subjects.length, 0)

          return (
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="text-muted-foreground h-3 w-3" />
                <span>{totalClassrooms} فصل</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="text-muted-foreground h-3 w-3" />
                <span>{totalSubjects} مادة</span>
              </div>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'الإجراءات',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleViewTeacher(row.original)} title="عرض">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ),
      }),
    ],
    [onEdit]
  )

  const quickFilters = useMemo(
    () => [
      {
        key: 'hasAssignments',
        label: 'حالة التكليفات',
        values: [
          { label: 'لديه تكليفات', value: 'true' },
          { label: 'بدون تكليفات', value: 'false' },
        ],
      },
      {
        key: 'isMainTeacher',
        label: 'المعلم الرئيسي',
        values: [
          { label: 'معلم رئيسي لمادة', value: 'true' },
          { label: 'معلم مساعد فقط', value: 'false' },
        ],
      },
      {
        key: 'joinedRecently',
        label: 'تاريخ الانضمام',
        values: [
          { label: 'انضم خلال الشهر الماضي', value: 'month' },
          { label: 'انضم خلال الـ 3 أشهر الماضية', value: 'quarter' },
          { label: 'انضم خلال السنة الماضية', value: 'year' },
        ],
      },
    ],
    []
  )

  const filteredData = useMemo(() => {
    let filtered = typedTeachers

    // Apply active filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (!value) return

      switch (key) {
        case 'hasAssignments':
          const hasAssignments = value === 'true'
          filtered = filtered.filter((teacher) =>
            hasAssignments ? teacher.classrooms.length > 0 : teacher.classrooms.length === 0
          )
          break
        case 'isMainTeacher':
          const isMainTeacher = value === 'true'
          filtered = filtered.filter((teacher) => {
            const hasMainSubjects = teacher.classrooms.some((classroom) =>
              classroom.subjects.some((subject) => subject.isMainTeacher)
            )
            return isMainTeacher ? hasMainSubjects : !hasMainSubjects
          })
          break
        case 'joinedRecently':
          const now = new Date()
          let cutoffDate = new Date()

          switch (value) {
            case 'month':
              cutoffDate.setMonth(now.getMonth() - 1)
              break
            case 'quarter':
              cutoffDate.setMonth(now.getMonth() - 3)
              break
            case 'year':
              cutoffDate.setFullYear(now.getFullYear() - 1)
              break
          }

          filtered = filtered.filter((teacher) => new Date(teacher.createdAt) >= cutoffDate)
          break
      }
    })

    return filtered
  }, [typedTeachers, activeFilters])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const teacher = row.original
      const searchableText = [
        teacher.name,
        teacher.lastName,
        teacher.email,
        `${teacher.name} ${teacher.lastName}`,
        ...teacher.classrooms.map((c) => c.name),
        ...teacher.classrooms.flatMap((c) => c.subjects.map((s) => s.displayNameAr)),
        ...teacher.classrooms.map((c) => `المستوى ${c.educationLevel.level}`),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchableText.includes(filterValue.toLowerCase())
    },
    state: {
      globalFilter: searchValue,
      pagination,
    },
    onPaginationChange: setPagination,
  })

  const mobileCardRenderer = (row: any) => (
    <div
      className="flex items-center bg-white px-4 py-3 transition-colors"
      onClick={() => handleViewTeacher(row.original)}
    >
      <div className="bg-primary/10 mx-2 flex h-10 w-10 items-center justify-center rounded-lg">
        <User className="text-primary h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-foreground text-base leading-tight font-medium">
          {row.original.name} {row.original.lastName}
        </div>
        <div className="text-muted-foreground mt-0.5 text-sm leading-tight">{row.original.email}</div>
        {row.original.classrooms.length > 0 && (
          <div className="text-muted-foreground mt-1 text-xs">
            {row.original.classrooms.length} فصل •{' '}
            {row.original.classrooms.reduce((sum: number, c: any) => sum + c.subjects.length, 0)} مادة
          </div>
        )}
      </div>
    </div>
  )

  const emptyStateAction = onCreateNew ? (
    <Button onClick={onCreateNew} className="mt-4">
      <Plus className="me-1 h-4 w-4" />
      إضافة معلم جديد
    </Button>
  ) : null

  const headerActions = onCreateNew ? (
    <Button onClick={onCreateNew}>
      <Plus className="me-1 h-4 w-4" />
      إضافة معلم
    </Button>
  ) : isRolePending ? (
    // Space held while the role resolves, so the toolbar does not reflow when
    // the button turns out to be allowed.
    <div className="h-9 w-32" aria-hidden />
  ) : null

  if (typedTeachers.length === 0 && !isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <User className="text-muted-foreground h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">لا يوجد معلمون</h3>
            <p className="text-muted-foreground mt-1">
              {onCreateNew ? 'ابدأ بإضافة المعلمين لإدارة الهيئة التدريسية' : 'لا توجد بيانات لعرضها'}
            </p>
          </div>
          {emptyStateAction}
        </div>
      </div>
    )
  }

  return (
    <>
      <GenericTable
        table={table}
        isLoading={isLoading}
        error={error}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث عن معلم (الاسم، البريد، الفصول، المواد...)"
        noDataMessage="لا يوجد معلمون مطابقون للبحث"
        mobileCardRenderer={mobileCardRenderer}
        showQuickFilters={true}
        quickFilters={quickFilters}
        activeFilters={activeFilters}
        onFilterChange={(key, value) => setActiveFilters((prev) => ({ ...prev, [key]: value }))}
        headerActions={headerActions}
        emptyStateAction={emptyStateAction}
        enableVirtualScroll={true}
        virtualItemHeight={72}
        className="w-full"
      />

      <TeacherViewSheet teacher={selectedTeacher} open={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </>
  )
}
