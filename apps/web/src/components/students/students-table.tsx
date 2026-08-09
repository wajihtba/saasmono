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
import { Building2, Edit, Eye, GraduationCap, Mail, Plus, User, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StudentViewSheet } from './student-view-sheet'
import type { StudentListItem } from './types'

interface StudentsTableProps {
  onEdit?: (studentId: string) => void
  onCreateNew?: () => void
}

const columnHelper = createColumnHelper<StudentListItem>()

export function StudentsTable({ onEdit, onCreateNew }: StudentsTableProps) {
  const { isPending: isRolePending } = usePermissions()
  const { data: students = [], isLoading, error } = useQuery(orpc.management.students.getStudentsList.queryOptions({}))

  // Type assertion for students data
  const typedStudents = (students as StudentListItem[]) || []

  const [searchValue, setSearchValue] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  })

  // Sheet state
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleViewStudent = (student: StudentListItem) => {
    setSelectedStudent(student)
    setIsSheetOpen(true)
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'student',
        header: 'الطالب',
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
        id: 'classroom',
        header: 'الفصل الدراسي',
        cell: ({ row }) => {
          const classroom = row.original.classroom
          if (!classroom) {
            return (
              <div className="space-y-1">
                <Badge variant="secondary" className="text-xs">
                  غير مسجل
                </Badge>
                <div className="text-muted-foreground text-xs">لا يوجد فصل</div>
              </div>
            )
          }
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="text-muted-foreground h-3 w-3" />
                <span className="text-sm font-medium">{classroom.name}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                المستوى {classroom.educationLevel.level}
              </Badge>
              <div className="text-muted-foreground text-xs">
                {classroom.academicYear} • {classroom.code}
              </div>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'level',
        header: 'المستوى التعليمي',
        cell: ({ row }) => {
          const classroom = row.original.classroom
          if (!classroom) {
            return (
              <Badge variant="secondary" className="text-xs">
                غير محدد
              </Badge>
            )
          }
          return (
            <div className="space-y-1">
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-xs font-medium text-blue-700">
                المستوى {classroom.educationLevel.level}
              </Badge>
              {classroom.educationLevel.displayNameAr && (
                <div className="text-muted-foreground text-xs">{classroom.educationLevel.displayNameAr}</div>
              )}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'status',
        header: 'حالة التسجيل',
        cell: ({ row }) => {
          const status = row.original.classroom?.enrollmentStatus
          if (!status) {
            return (
              <Badge variant="secondary" className="text-xs">
                غير مسجل
              </Badge>
            )
          }

          const statusConfig = {
            active: { label: 'نشط', variant: 'default' as const },
            inactive: { label: 'غير نشط', variant: 'secondary' as const },
            transferred: { label: 'محول', variant: 'destructive' as const },
          }

          const config = statusConfig[status as keyof typeof statusConfig] || {
            label: status,
            variant: 'secondary' as const
          }

          return (
            <Badge variant={config.variant} className="text-xs">
              {config.label}
            </Badge>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'الإجراءات',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleViewStudent(row.original)} title="عرض">
              <Eye className="h-4 w-4" />
            </Button>
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(row.original.id)} title="تعديل">
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      }),
    ],
    [onEdit]
  )

  const quickFilters = useMemo(
    () => [
      {
        key: 'enrollmentStatus',
        label: 'حالة التسجيل',
        values: [
          { label: 'نشط', value: 'active' },
          { label: 'غير نشط', value: 'inactive' },
          { label: 'محول', value: 'transferred' },
        ],
      },
      {
        key: 'hasClassroom',
        label: 'الفصل الدراسي',
        values: [
          { label: 'مسجل في فصل', value: 'true' },
          { label: 'غير مسجل', value: 'false' },
        ],
      },
      {
        key: 'educationLevel',
        label: 'المستوى التعليمي',
        values: Array.from(new Set(
          typedStudents
            .filter(s => s.classroom?.educationLevel)
            .map(s => s.classroom!.educationLevel.level)
        )).map(level => ({
          label: `المستوى ${level}`,
          value: level.toString(),
        })),
      },
    ],
    [typedStudents]
  )

  const filteredData = useMemo(() => {
    let filtered = typedStudents

    // Apply active filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (!value) return

      switch (key) {
        case 'enrollmentStatus':
          filtered = filtered.filter((student) =>
            student.classroom?.enrollmentStatus === value
          )
          break
        case 'hasClassroom':
          const hasClassroom = value === 'true'
          filtered = filtered.filter((student) =>
            hasClassroom ? !!student.classroom : !student.classroom
          )
          break
        case 'educationLevel':
          filtered = filtered.filter((student) =>
            student.classroom?.educationLevel.level.toString() === value
          )
          break
      }
    })

    return filtered
  }, [typedStudents, activeFilters])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const student = row.original
      const searchableText = [
        student.name,
        student.lastName,
        student.email,
        `${student.name} ${student.lastName}`,
        student.classroom?.name,
        student.classroom?.code,
        student.classroom?.academicYear,
        student.classroom?.educationLevel.displayNameAr || `المستوى ${student.classroom?.educationLevel.level}`,
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
      onClick={() => handleViewStudent(row.original)}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 me-3">
        <User className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground text-base leading-tight">
          {row.original.name} {row.original.lastName}
        </div>
        <div className="text-sm text-muted-foreground leading-tight mt-0.5">
          {row.original.email}
        </div>
        {row.original.classroom && (
          <div className="text-xs text-muted-foreground mt-1">
            {row.original.classroom.name} • المستوى {row.original.classroom.educationLevel.level}
          </div>
        )}
      </div>
    </div>
  )

  const emptyStateAction = onCreateNew ? (
    <Button onClick={onCreateNew} className="mt-4">
      <Plus className="me-1 h-4 w-4" />
      إضافة طالب جديد
    </Button>
  ) : null

  const headerActions = onCreateNew ? (
    <Button onClick={onCreateNew}>
      <Plus className="me-1 h-4 w-4" />
      إضافة طالب
    </Button>
  ) : isRolePending ? (
    // Space held while the role resolves, so the toolbar does not reflow when
    // the button turns out to be allowed.
    <div className="h-9 w-32" aria-hidden />
  ) : null

  if (typedStudents.length === 0 && !isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <Users className="text-muted-foreground h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">لا يوجد طلاب</h3>
            <p className="text-muted-foreground mt-1">
              {onCreateNew ? 'ابدأ بإضافة الطلاب لإدارة القوائم الطلابية' : 'لا يوجد طلاب متاحون لك حالياً'}
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
        searchPlaceholder="البحث عن طالب (الاسم، البريد، الفصل، المستوى...)"
        noDataMessage="لا يوجد طلاب مطابقون للبحث"
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

      <StudentViewSheet student={selectedStudent} open={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </>
  )
}