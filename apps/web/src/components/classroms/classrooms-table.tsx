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
import { Building2, Edit, Eye, GraduationCap, Plus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ClassroomViewSheet } from './classroom-view-sheet'

interface EducationLevel {
  id: string
  level: number
  section: string | null
  displayNameAr: string | null
}

interface ClassroomListItem {
  id: string
  name: string
  academicYear: string
  educationLevelId: string
  educationLevel: EducationLevel
  studentCount: number
  teacherCount: number
}

interface ClassroomsTableProps {
  onEdit?: (classroomId: string) => void
  onDelete?: (classroomId: string) => void
  onCreateNew?: () => void
}

const columnHelper = createColumnHelper<ClassroomListItem>()

export function ClassroomsTable({ onEdit, onDelete, onCreateNew }: ClassroomsTableProps) {
  const { isPending: isRolePending } = usePermissions()
  const {
    data: classrooms = [],
    isLoading,
    error,
  } = useQuery(orpc.management.classroom.getClassroomsList.queryOptions())

  // Type assertion for classrooms data
  const typedClassrooms = (classrooms as ClassroomListItem[]) || []

  const [searchValue, setSearchValue] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  })

  // Sheet state
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomListItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleViewClassroom = (classroom: ClassroomListItem) => {
    setSelectedClassroom(classroom)
    setIsSheetOpen(true)
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'classroom',
        header: 'الفصل الدراسي',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Building2 className="text-primary h-5 w-5" />
            </div>
            <div>
              <div className="text-foreground font-medium">{row.original.name}</div>
              <div className="text-muted-foreground text-sm">العام الدراسي: {row.original.academicYear}</div>
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: 'level',
        header: 'المستوى التعليمي',
        cell: ({ row }) => (
          <div className="space-y-1">
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-xs font-medium text-blue-700">
              المستوى {row.original.educationLevel.level}
              {row.original.educationLevel.section && ` - ${row.original.educationLevel.section}`}
            </Badge>
            {row.original.educationLevel.displayNameAr && (
              <div className="text-muted-foreground text-xs">{row.original.educationLevel.displayNameAr}</div>
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'stats',
        header: 'الإحصائيات',
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground h-3 w-3" />
              <span>{row.original.studentCount} طالب</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="text-muted-foreground h-3 w-3" />
              <span>{row.original.teacherCount} معلم</span>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('academicYear', {
        id: 'academicYear',
        header: 'العام الدراسي',
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs">
            {row.original.academicYear}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'الإجراءات',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleViewClassroom(row.original)} title="عرض">
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
        key: 'academicYear',
        label: 'العام الدراسي',
        values: Array.from(new Set(typedClassrooms.map((c) => c.academicYear))).map((year) => ({
          label: year,
          value: year,
        })),
      },
      {
        key: 'hasStudents',
        label: 'حالة الطلاب',
        values: [
          { label: 'يحتوي على طلاب', value: 'true' },
          { label: 'فصل فارغ', value: 'false' },
        ],
      },
      {
        key: 'hasTeachers',
        label: 'حالة المعلمين',
        values: [
          { label: 'لديه معلمين', value: 'true' },
          { label: 'بدون معلمين', value: 'false' },
        ],
      },
    ],
    [classrooms]
  )

  const filteredData = useMemo(() => {
    let filtered = typedClassrooms

    // Apply active filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (!value) return

      switch (key) {
        case 'academicYear':
          filtered = filtered.filter((classroom) => classroom.academicYear === value)
          break
        case 'hasStudents':
          const hasStudents = value === 'true'
          filtered = filtered.filter((classroom) =>
            hasStudents ? classroom.studentCount > 0 : classroom.studentCount === 0
          )
          break
        case 'hasTeachers':
          const hasTeachers = value === 'true'
          filtered = filtered.filter((classroom) =>
            hasTeachers ? classroom.teacherCount > 0 : classroom.teacherCount === 0
          )
          break
      }
    })

    return filtered
  }, [typedClassrooms, activeFilters])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const classroom = row.original
      const searchableText = [
        classroom.name,
        classroom.academicYear,
        `المستوى ${classroom.educationLevel.level}`,
        classroom.educationLevel.section,
        classroom.educationLevel.displayNameAr,
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
      className="flex items-center px-4 py-3 active:bg-muted/50 transition-colors"
      onClick={() => handleViewClassroom(row.original)}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 me-3">
        <Building2 className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground text-base leading-tight">
          {row.original.name}
        </div>
        <div className="text-sm text-muted-foreground leading-tight mt-0.5">
          {row.original.academicYear} • المستوى {row.original.educationLevel.level}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {row.original.studentCount} طالب • {row.original.teacherCount} معلم
        </div>
      </div>
    </div>
  )

  const emptyStateAction = onCreateNew ? (
    <Button onClick={onCreateNew} className="mt-4">
      <Plus className="me-1 h-4 w-4" />
      إضافة فصل دراسي جديد
    </Button>
  ) : null

  const headerActions = onCreateNew ? (
    <Button onClick={onCreateNew}>
      <Plus className="me-1 h-4 w-4" />
      إضافة فصل
    </Button>
  ) : isRolePending ? (
    // Space held while the role resolves, so the toolbar does not reflow when
    // the button turns out to be allowed.
    <div className="h-9 w-32" aria-hidden />
  ) : null

  if (typedClassrooms.length === 0 && !isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <Building2 className="text-muted-foreground h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">لا توجد فصول دراسية</h3>
            <p className="text-muted-foreground mt-1">
              {onCreateNew ? 'ابدأ بإضافة الفصول الدراسية لتنظيم العملية التعليمية' : 'لا توجد فصول متاحة لك حالياً'}
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
        searchPlaceholder="البحث عن فصل دراسي (الاسم، العام الدراسي، المستوى...)"
        noDataMessage="لا توجد فصول دراسية مطابقة للبحث"
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

      <ClassroomViewSheet
        classroom={selectedClassroom}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </>
  )
}
