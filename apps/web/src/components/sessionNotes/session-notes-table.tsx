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
import { BookOpen, Calendar, Edit, Eye, Lock, Paperclip, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, formatTime } from '@/lib/date'

interface SessionNoteListItem {
  id: string
  title: string
  isPrivate: boolean
  timetableId: string
  createdAt: Date
  createdById: string
  timetable: {
    id: string
    title: string
    startDateTime: Date
  }
  attachmentCount?: number
}

interface SessionNotesTableProps {
  onCreateNew?: () => void
}

const columnHelper = createColumnHelper<SessionNoteListItem>()

export function SessionNotesTable({ onCreateNew }: SessionNotesTableProps) {
  const router = useRouter()
  const { canForOwn, isPending: isRolePending } = usePermissions()
  const { data: sessionNotes = [], isLoading, error } = useQuery(
    orpc.management.sessionNotes.getSessionNotesList.queryOptions({})
  )

  const typedNotes = (sessionNotes as SessionNoteListItem[]) || []

  const [searchValue, setSearchValue] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  })

  const handleViewNote = (noteId: string) => {
    router.push(`/dashboard/session-notes/${noteId}`)
  }

  const handleEditNote = (noteId: string) => {
    router.push(`/dashboard/session-notes/${noteId}/edit`)
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        id: 'title',
        header: 'عنوان كراس القسم',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <BookOpen className="text-primary h-5 w-5" />
            </div>
            <div>
              <div className="text-foreground font-medium">{row.original.title}</div>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Calendar className="h-3 w-3" />
                {formatDate(row.original.createdAt)}
              </div>
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: 'timetable',
        header: 'الجلسة',
        cell: ({ row }) => {
          const timetable = row.original.timetable
          return (
            <div className="space-y-1">
              <div className="text-sm font-medium">{timetable.title}</div>
              <div className="text-muted-foreground text-xs">
                {formatDate(timetable.startDateTime)} -{' '}
                {formatTime(timetable.startDateTime)}
              </div>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'privacy',
        header: 'الخصوصية',
        cell: ({ row }) => (
          <Badge variant={row.original.isPrivate ? 'secondary' : 'default'} className="text-xs">
            {row.original.isPrivate ? (
              <>
                <Lock className="me-1 h-3 w-3" />
                خاصة
              </>
            ) : (
              'عامة'
            )}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: 'attachments',
        header: 'المرفقات',
        cell: ({ row }) => {
          const count = row.original.attachmentCount || 0
          if (count === 0) {
            return <span className="text-muted-foreground text-xs">لا يوجد</span>
          }
          return (
            <div className="flex items-center gap-1 text-sm">
              <Paperclip className="h-4 w-4" />
              <span>{count}</span>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'الإجراءات',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleViewNote(row.original.id)} title="عرض">
              <Eye className="h-4 w-4" />
            </Button>
            {canForOwn(Permission.NOTE_WRITE, row.original.createdById) && (
              <Button variant="ghost" size="sm" onClick={() => handleEditNote(row.original.id)} title="تعديل">
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      }),
    ],
    [router, canForOwn]
  )

  const quickFilters = useMemo(
    () => [
      {
        key: 'isPrivate',
        label: 'الخصوصية',
        values: [
          { label: 'عامة', value: 'false' },
          { label: 'خاصة', value: 'true' },
        ],
      },
    ],
    []
  )

  const filteredData = useMemo(() => {
    let filtered = typedNotes

    // Apply active filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (!value) return

      switch (key) {
        case 'isPrivate':
          filtered = filtered.filter((note) => note.isPrivate === (value === 'true'))
          break
      }
    })

    return filtered
  }, [typedNotes, activeFilters])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const note = row.original
      const searchableText = [
        note.title,
        note.timetable.title,
        formatDate(note.createdAt),
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
      onClick={() => handleViewNote(row.original.id)}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 me-3">
        <BookOpen className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground text-base leading-tight flex items-center gap-2">
          {row.original.title}
          {row.original.isPrivate && <Lock className="h-3 w-3 text-muted-foreground" />}
        </div>
        <div className="text-sm text-muted-foreground leading-tight mt-0.5">
          {row.original.timetable.title}
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          {formatDate(row.original.createdAt)}
          {(row.original.attachmentCount || 0) > 0 && (
            <>
              <Paperclip className="h-3 w-3 me-2" />
              {row.original.attachmentCount}
            </>
          )}
        </div>
      </div>
    </div>
  )

  const emptyStateAction = onCreateNew ? (
    <Button onClick={onCreateNew} className="mt-4">
      <Plus className="me-1 h-4 w-4" />
      إضافة كراس قسم جديد
    </Button>
  ) : null

  const headerActions = onCreateNew ? (
    <Button onClick={onCreateNew}>
      <Plus className="me-1 h-4 w-4" />
      إضافة كراس قسم
    </Button>
  ) : isRolePending ? (
    // Space held while the role resolves, so the toolbar does not reflow when
    // the button turns out to be allowed.
    <div className="h-9 w-32" aria-hidden />
  ) : null

  if (typedNotes.length === 0 && !isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <BookOpen className="text-muted-foreground h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">لا يوجد كراس قسم</h3>
            <p className="text-muted-foreground mt-1">ابدأ بإضافة كراس القسم</p>
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
      searchPlaceholder="البحث (العنوان، الجلسة، التاريخ...)"
      noDataMessage="لا يوجد كراس قسم مطابق للبحث"
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
