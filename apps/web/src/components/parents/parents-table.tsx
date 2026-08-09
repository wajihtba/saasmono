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
import { Building2, Edit, Eye, Heart, Mail, Plus, User, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ParentViewSheet } from './parent-view-sheet'

interface ParentChild {
  id: string
  name: string
  lastName: string
  email: string
  createdAt: Date
  relationshipType: string
  relationId: string
  relationCreatedAt: Date
  classroom: {
    id: string
    name: string
    code: string
    academicYear: string
    enrollmentStatus: string
    enrollmentDate: Date
    educationLevel: {
      id: string
      level: number
      displayNameAr: string | null
    }
  } | null
}

interface ParentWithChildren {
  id: string
  name: string
  lastName: string
  email: string
  userType: 'parent'
  createdAt: Date
  updatedAt: Date
  children: ParentChild[]
}

interface ParentsTableProps {
  onEdit?: (parentId: string) => void
  onCreateNew?: () => void
}

const columnHelper = createColumnHelper<ParentWithChildren>()

export function ParentsTable({ onEdit, onCreateNew }: ParentsTableProps) {
  const { isPending: isRolePending } = usePermissions()
  const { data: parents = [], isLoading, error } = useQuery(orpc.management.parents.getParentsList.queryOptions())

  // Type assertion for parents data
  const typedParents = (parents as ParentWithChildren[]) || []

  const [searchValue, setSearchValue] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  })

  // Sheet state
  const [selectedParent, setSelectedParent] = useState<ParentWithChildren | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleViewParent = (parent: ParentWithChildren) => {
    setSelectedParent(parent)
    setIsSheetOpen(true)
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'parent',
        header: 'ولي الأمر',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Heart className="text-primary h-5 w-5" />
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
        id: 'children',
        header: 'الأطفال',
        cell: ({ row }) => (
          <div className="space-y-2">
            {row.original.children.length > 0 ? (
              <div className="space-y-1">
                {row.original.children.slice(0, 2).map((child) => (
                  <div key={child.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="text-muted-foreground h-3 w-3" />
                      <span className="text-sm font-medium">{child.name} {child.lastName}</span>
                      <Badge variant="outline" className="text-xs">
                        {child.relationshipType === 'parent' ? 'ابن/ابنة' : child.relationshipType}
                      </Badge>
                    </div>
                    {child.classroom && (
                      <div className="flex items-center gap-1 ps-5 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {child.classroom.name} • المستوى {child.classroom.educationLevel.level}
                      </div>
                    )}
                  </div>
                ))}
                {row.original.children.length > 2 && (
                  <div className="text-muted-foreground text-xs">+{row.original.children.length - 2} أطفال آخرون</div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">لا توجد علاقات أطفال</div>
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'stats',
        header: 'الإحصائيات',
        cell: ({ row }) => {
          const totalChildren = row.original.children.length
          const enrolledChildren = row.original.children.filter(c => c.classroom).length
          const educationLevels = [...new Set(
            row.original.children
              .filter(c => c.classroom)
              .map(c => c.classroom!.educationLevel.level)
          )].length

          return (
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Users className="text-muted-foreground h-3 w-3" />
                <span>{totalChildren} طفل</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="text-muted-foreground h-3 w-3" />
                <span>{enrolledChildren} مسجل</span>
              </div>
              {educationLevels > 0 && (
                <div className="text-muted-foreground text-xs">
                  {educationLevels} مستوى تعليمي
                </div>
              )}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'relationship',
        header: 'نوع العلاقة',
        cell: ({ row }) => {
          const relationshipTypes = [...new Set(row.original.children.map(c => c.relationshipType))]

          return (
            <div className="space-y-1">
              {relationshipTypes.map((type) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type === 'parent' ? 'والد/والدة' : type}
                </Badge>
              ))}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'الإجراءات',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleViewParent(row.original)} title="عرض">
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
        key: 'hasChildren',
        label: 'حالة الأطفال',
        values: [
          { label: 'لديه أطفال', value: 'true' },
          { label: 'بدون أطفال', value: 'false' },
        ],
      },
      {
        key: 'hasEnrolledChildren',
        label: 'الأطفال المسجلون',
        values: [
          { label: 'لديه أطفال مسجلون', value: 'true' },
          { label: 'لا يوجد أطفال مسجلون', value: 'false' },
        ],
      },
      {
        key: 'relationshipType',
        label: 'نوع العلاقة',
        values: [
          { label: 'والد/والدة', value: 'parent' },
          { label: 'وصي', value: 'guardian' },
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
    let filtered = typedParents

    // Apply active filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (!value) return

      switch (key) {
        case 'hasChildren':
          const hasChildren = value === 'true'
          filtered = filtered.filter((parent) =>
            hasChildren ? parent.children.length > 0 : parent.children.length === 0
          )
          break
        case 'hasEnrolledChildren':
          const hasEnrolledChildren = value === 'true'
          filtered = filtered.filter((parent) => {
            const enrolledCount = parent.children.filter(c => c.classroom).length
            return hasEnrolledChildren ? enrolledCount > 0 : enrolledCount === 0
          })
          break
        case 'relationshipType':
          filtered = filtered.filter((parent) =>
            parent.children.some(c => c.relationshipType === value)
          )
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

          filtered = filtered.filter((parent) => new Date(parent.createdAt) >= cutoffDate)
          break
      }
    })

    return filtered
  }, [typedParents, activeFilters])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const parent = row.original
      const searchableText = [
        parent.name,
        parent.lastName,
        parent.email,
        `${parent.name} ${parent.lastName}`,
        ...parent.children.map(c => `${c.name} ${c.lastName}`),
        ...parent.children.map(c => c.email),
        ...parent.children.filter(c => c.classroom).map(c => c.classroom!.name),
        ...parent.children.filter(c => c.classroom).map(c => `المستوى ${c.classroom!.educationLevel.level}`),
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
      onClick={() => handleViewParent(row.original)}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 me-3">
        <Heart className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground text-base leading-tight">
          {row.original.name} {row.original.lastName}
        </div>
        <div className="text-sm text-muted-foreground leading-tight mt-0.5">
          {row.original.email}
        </div>
        {row.original.children.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {row.original.children.length} أطفال • {row.original.children.filter((c: any) => c.classroom).length} مسجل
          </div>
        )}
      </div>
    </div>
  )

  const emptyStateAction = onCreateNew ? (
    <Button onClick={onCreateNew} className="mt-4">
      <Plus className="me-1 h-4 w-4" />
      إضافة ولي أمر جديد
    </Button>
  ) : null

  const headerActions = onCreateNew ? (
    <Button onClick={onCreateNew}>
      <Plus className="me-1 h-4 w-4" />
      إضافة ولي أمر
    </Button>
  ) : isRolePending ? (
    // Space held while the role resolves, so the toolbar does not reflow when
    // the button turns out to be allowed.
    <div className="h-9 w-32" aria-hidden />
  ) : null

  if (typedParents.length === 0 && !isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <Heart className="text-muted-foreground h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">لا يوجد أولياء أمور</h3>
            <p className="text-muted-foreground mt-1">ابدأ بإضافة أولياء الأمور لإدارة العلاقات العائلية</p>
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
        searchPlaceholder="البحث عن ولي أمر (الاسم، البريد، الأطفال...)"
        noDataMessage="لا يوجد أولياء أمور مطابقون للبحث"
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

      <ParentViewSheet parent={selectedParent} open={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </>
  )
}