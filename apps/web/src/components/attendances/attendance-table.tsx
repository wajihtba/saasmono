'use client'

import { usePermissions } from '@/hooks/use-permissions'
import { orpc } from '@/utils/orpc'
import { Permission } from '@repo/rbac'
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
import { Calendar, Clock, Edit, Eye, Users, Building2, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, formatTime } from '@/lib/date'

interface AttendanceSessionListItem {
  id: string
  timetableId: string
  timetable: {
    id: string
    title: string
    startDateTime: Date
    endDateTime: Date
  }
  classroom: {
    id: string
    name: string
  } | null
  classroomGroup: {
    id: string
    name: string
  } | null
  createdBy: {
    id: string
    name: string
    lastName: string
    userType: string
  }
  studentsMarked: number
  totalStudents?: number
  createdAt: Date
}

interface AttendanceTableProps {
  onCreateNew?: () => void
}

const columnHelper = createColumnHelper<AttendanceSessionListItem>()

export function AttendanceTable({ onCreateNew }: AttendanceTableProps) {
  const router = useRouter()
  const { can, isPending: isRolePending } = usePermissions()

  // The edit route is opened from inside the row, so the gate lives here rather
  // than in a handler the page could withhold.
  const canWrite = can(Permission.ATTENDANCE_WRITE)
  const { data: attendances = [], isLoading, error } = useQuery(
    orpc.management.attendances.getAttendancesList.queryOptions({})
  )

  const typedAttendances = (attendances as AttendanceSessionListItem[]) || []

  const [searchValue, setSearchValue] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  })

  const handleViewAttendance = (sessionId: string) => {
    router.push(`/dashboard/attendances/${sessionId}`)
  }

  const handleEditAttendance = (sessionId: string) => {
    router.push(`/dashboard/attendances/${sessionId}/edit`)
  }

  const getUserTypeBadgeVariant = (userType: string) => {
    switch (userType) {
      case 'teacher':
        return 'default'
      case 'admin':
        return 'destructive'
      case 'staff':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'teacher':
        return 'معلم'
      case 'admin':
        return 'مدير'
      case 'staff':
        return 'موظف'
      default:
        return userType
    }
  }

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'timetable',
        header: 'الجلسة',
        cell: ({ row }) => {
          const timetable = row.original.timetable
          return (
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <Calendar className="text-primary h-5 w-5" />
              </div>
              <div>
                <div className="text-foreground font-medium">{timetable.title}</div>
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Clock className="h-3 w-3" />
                  {formatDate(timetable.startDateTime)} -{' '}
                  {formatTime(timetable.startDateTime)}
                  
                </div>
              </div>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'classroomOrGroup',
        header: 'الفصل / المجموعة',
        cell: ({ row }) => {
          const { classroom, classroomGroup } = row.original
          return (
            <div className="flex items-center gap-2">
              {classroom ? (
                <>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{classroom.name}</span>
                </>
              ) : classroomGroup ? (
                <>
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{classroomGroup.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground text-sm">غير محدد</span>
              )}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'creator',
        header: 'المنشئ',
        cell: ({ row }) => {
          const { createdBy } = row.original
          return (
            <div className="space-y-1">
              <div className="text-sm font-medium">
                {createdBy.name} {createdBy.lastName}
              </div>
              <Badge variant={getUserTypeBadgeVariant(createdBy.userType)} className="text-xs">
                {getUserTypeLabel(createdBy.userType)}
              </Badge>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'studentsMarked',
        header: 'الطلاب',
        cell: ({ row }) => {
          const { studentsMarked, totalStudents } = row.original
          return (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {studentsMarked}
                {totalStudents && ` / ${totalStudents}`}
              </span>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'الإجراءات',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewAttendance(row.original.id)}
              title="عرض"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canWrite && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditAttendance(row.original.id)}
                title="تعديل"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      }),
    ],
    [router, canWrite]
  )

  const quickFilters = useMemo(
    () => [
      {
        key: 'userType',
        label: 'نوع المنشئ',
        values: [
          { label: 'معلم', value: 'teacher' },
          { label: 'مدير', value: 'admin' },
          { label: 'موظف', value: 'staff' },
        ],
      },
    ],
    []
  )

  const filteredData = useMemo(() => {
    let filtered = typedAttendances

    // Apply active filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (!value) return

      switch (key) {
        case 'userType':
          filtered = filtered.filter((attendance) => attendance.createdBy.userType === value)
          break
      }
    })

    return filtered
  }, [typedAttendances, activeFilters])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const attendance = row.original
      const searchableText = [
        attendance.timetable.title,
        attendance.classroom?.name,
        attendance.classroomGroup?.name,
        attendance.createdBy.name,
        attendance.createdBy.lastName,
        formatDate(attendance.timetable.startDateTime),
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
      onClick={() => handleViewAttendance(row.original.id)}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 me-3">
        <Calendar className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground text-base leading-tight">
          {row.original.timetable.title}
        </div>
        <div className="text-sm text-muted-foreground leading-tight mt-0.5">
          {row.original.classroom?.name || row.original.classroomGroup?.name}
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
          <Clock className="h-3 w-3" />
          {formatDate(row.original.timetable.startDateTime)}
          <User className="h-3 w-3 me-2" />
          {row.original.studentsMarked} طالب
        </div>
      </div>
    </div>
  )

  const emptyStateAction = onCreateNew ? (
    <Button onClick={onCreateNew} className="mt-4">
      <Calendar className="me-1 h-4 w-4" />
      إضافة حضور جديد
    </Button>
  ) : null

  const headerActions = onCreateNew ? (
    <Button onClick={onCreateNew}>
      <Calendar className="me-1 h-4 w-4" />
      إضافة حضور
    </Button>
  ) : isRolePending ? (
    // Space held while the role resolves, so the toolbar does not reflow when
    // the button turns out to be allowed.
    <div className="h-9 w-32" aria-hidden />
  ) : null

  if (typedAttendances.length === 0 && !isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <Calendar className="text-muted-foreground h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">لا توجد سجلات حضور</h3>
            <p className="text-muted-foreground mt-1">ابدأ بإضافة سجل حضور جديد</p>
          </div>
          {emptyStateAction}
        </div>
      </div>
    )
  }

  return (
    <GenericTable
      table={table}
      isLoading={isLoading}
      error={error}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      searchPlaceholder="البحث عن حضور (الجلسة، الفصل، المنشئ...)"
      noDataMessage="لا توجد سجلات حضور مطابقة للبحث"
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
  )
}
