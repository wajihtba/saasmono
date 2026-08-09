'use client'

import { usePermissions } from '@/hooks/use-permissions'
import { orpc } from '@/utils/orpc'
import { Permission } from '@repo/rbac'
import { Badge, Button, GenericTable } from '@repo/ui'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Calendar,
  Clock,
  Download,
  Plus,
  Ticket,
  User,
  X,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CancelTicketDialog } from './cancel-ticket-dialog'

type TicketStatus = 'ISSUED' | 'USED' | 'EXPIRED' | 'CANCELED'

interface TicketListItem {
  id: string
  ticketNumber: string
  status: TicketStatus
  issuedAt: Date
  usedAt: Date | null
  expiresAt: Date
  canceledAt: Date | null
  cancellationReason: string | null
  qrCodeImagePath: string | null
  pdfPath: string | null
  student: {
    id: string
    name: string
    lastName: string
    email: string
  }
  timetable: {
    id: string
    title: string
    startDateTime: Date
    endDateTime: Date
    educationSubject: {
      displayNameAr: string
      displayNameEn: string | null
    } | null
    room: {
      name: string
    }
  }
  issuedBy: {
    name: string
    lastName: string
  }
}

interface LatePassTicketsTableProps {
  onGenerateNew?: () => void
}

const columnHelper = createColumnHelper<TicketListItem>()

export function LatePassTicketsTable({ onGenerateNew }: LatePassTicketsTableProps) {
  const { can } = usePermissions()

  // Cancelling is the same authority as issuing; the roles that only read their
  // own tickets get the download and nothing else.
  const canIssue = can(Permission.LATEPASS_ISSUE)

  const { data: tickets = [], isLoading, error, refetch } = useQuery(
    orpc.management.latePassTickets.getTickets.queryOptions({})
  )

  const typedTickets = (tickets as unknown as TicketListItem[]) || []

  const [searchValue, setSearchValue] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  })
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<{ id: string; ticketNumber: string } | null>(null)

  // Cancel ticket mutation
  const cancelTicketMutation = useMutation({
    ...orpc.management.latePassTickets.cancelTicket.mutationOptions(),
    onSuccess: () => {
      toast.success('تم إلغاء التذكرة بنجاح')
      refetch()
    },
    onError: (error: any) => {
      toast.error(`فشل إلغاء التذكرة: ${error.message}`)
    },
  })

  const handleCancelTicket = useCallback((ticketId: string, ticketNumber: string) => {
    setSelectedTicket({ id: ticketId, ticketNumber })
    setCancelDialogOpen(true)
  }, [])

  const handleConfirmCancel = useCallback((reason: string) => {
    if (selectedTicket) {
      cancelTicketMutation.mutate({
        ticketId: selectedTicket.id,
        reason,
      })
    }
  }, [selectedTicket, cancelTicketMutation])

  const handleDownloadPDF = useCallback((pdfPath: string | null) => {
    if (!pdfPath) {
      toast.error('التذكرة غير متوفرة')
      return
    }
    window.open(`${process.env.NEXT_PUBLIC_SERVER_URL}/public/${pdfPath}`, '_blank')
  }, [])

  const getStatusBadge = (status: TicketStatus) => {
    const statusConfig = {
      ISSUED: { label: 'صادر', variant: 'default' as const, className: 'bg-blue-100 text-blue-700' },
      USED: { label: 'مستخدم', variant: 'outline' as const, className: 'bg-green-100 text-green-700' },
      EXPIRED: { label: 'منتهي', variant: 'secondary' as const, className: 'bg-gray-100 text-gray-700' },
      CANCELED: { label: 'ملغى', variant: 'destructive' as const, className: 'bg-red-100 text-red-700' },
    }

    const config = statusConfig[status]
    return (
      <Badge variant={config.variant} className={`text-xs ${config.className}`}>
        {config.label}
      </Badge>
    )
  }

  const formatDate = (date: Date) => {
    return formatTime(date)
  }

  const formatTime = (date: Date) => {
    return new Date(date)
  }

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'ticketNumber',
        header: 'رقم التذكرة',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Ticket className="text-primary h-5 w-5" />
            </div>
            <div>
              <div className="text-foreground font-mono font-medium">
                {row.original.ticketNumber}
              </div>
              <div className="text-muted-foreground text-xs">
                {getStatusBadge(row.original.status)}
              </div>
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: 'student',
        header: 'الطالب',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <User className="text-muted-foreground h-4 w-4" />
            <div>
              <div className="font-medium text-sm">
                {row.original.student.name} {row.original.student.lastName}
              </div>
              <div className="text-muted-foreground text-xs">
                {row.original.student.email}
              </div>
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: 'timetable',
        header: 'الحصة',
        cell: ({ row }) => {
          const timetable = row.original.timetable
          return (
            <div className="space-y-1">
              <div className="font-medium text-sm">{timetable.title}</div>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <Calendar className="h-3 w-3" />
                {formatDate(timetable.startDateTime)}
              </div>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {formatTime(timetable.startDateTime)} - {formatTime(timetable.endDateTime)}
              </div>
              {timetable.educationSubject && (
                <div className="text-xs text-muted-foreground">
                  {timetable.educationSubject.displayNameAr}
                </div>
              )}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'validity',
        header: 'الصلاحية',
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="text-xs">
              <span className="text-muted-foreground">صدرت:</span>{' '}
              {formatDate(row.original.issuedAt)}
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">تنتهي:</span>{' '}
              <span className="text-red-600 font-medium">
                {formatDate(row.original.expiresAt)}
              </span>
            </div>
            {row.original.usedAt && (
              <div className="text-xs">
                <span className="text-muted-foreground">استخدمت:</span>{' '}
                {formatDate(row.original.usedAt)}
              </div>
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'الإجراءات',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {row.original.pdfPath && row.original.status !== 'CANCELED' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownloadPDF(row.original.pdfPath)}
                title="تحميل التذكرة"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {canIssue && row.original.status === 'ISSUED' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelTicket(row.original.id, row.original.ticketNumber)}
                title="إلغاء التذكرة"
                disabled={cancelTicketMutation.isPending}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            )}
          </div>
        ),
      }),
    ],
    [cancelTicketMutation.isPending, handleDownloadPDF, handleCancelTicket, canIssue]
  )

  const quickFilters = useMemo(
    () => [
      {
        key: 'status',
        label: 'الحالة',
        values: [
          { label: 'صادر', value: 'ISSUED' },
          { label: 'مستخدم', value: 'USED' },
          { label: 'منتهي', value: 'EXPIRED' },
          { label: 'ملغى', value: 'CANCELED' },
        ],
      },
    ],
    []
  )

  const filteredData = useMemo(() => {
    let filtered = typedTickets

    // Apply active filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (!value) return

      switch (key) {
        case 'status':
          filtered = filtered.filter((ticket) => ticket.status === value)
          break
      }
    })

    return filtered
  }, [typedTickets, activeFilters])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const ticket = row.original
      const searchableText = [
        ticket.ticketNumber,
        ticket.student.name,
        ticket.student.lastName,
        ticket.student.email,
        `${ticket.student.name} ${ticket.student.lastName}`,
        ticket.timetable.title,
        ticket.timetable.educationSubject?.displayNameAr,
        ticket.timetable.room.name,
        ticket.status,
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
    <div className="bg-white px-4 py-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-mono font-medium text-sm">
            {row.original.ticketNumber}
          </div>
          <div className="text-muted-foreground text-xs mt-0.5">
            {row.original.student.name} {row.original.student.lastName}
          </div>
        </div>
        {getStatusBadge(row.original.status)}
      </div>

      <div className="text-sm mb-2">
        <div className="font-medium">{row.original.timetable.title}</div>
        <div className="text-muted-foreground text-xs">
          {formatDate(row.original.timetable.startDateTime)} •{' '}
          {formatTime(row.original.timetable.startDateTime)}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        {row.original.pdfPath && row.original.status !== 'CANCELED' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadPDF(row.original.pdfPath)}
            className="flex-1"
          >
            <Download className="h-4 w-4 me-1" />
            تحميل التذكرة
          </Button>
        )}
        {canIssue && row.original.status === 'ISSUED' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCancelTicket(row.original.id, row.original.ticketNumber)}
            disabled={cancelTicketMutation.isPending}
          >
            <X className="h-4 w-4 text-red-600" />
          </Button>
        )}
      </div>
    </div>
  )

  const emptyStateAction = onGenerateNew ? (
    <Button onClick={onGenerateNew} className="mt-4">
      <Plus className="me-1 h-4 w-4" />
      إصدار تذكرة جديدة
    </Button>
  ) : null

  const headerActions = onGenerateNew ? (
    <Button onClick={onGenerateNew}>
      <Plus className="me-1 h-4 w-4" />
      إصدار تذكرة
    </Button>
  ) : null

  if (typedTickets.length === 0 && !isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <Ticket className="text-muted-foreground h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">لا توجد تذاكر</h3>
            <p className="text-muted-foreground mt-1">
              ابدأ بإصدار تذاكر الدخول للطلاب المتغيبين
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
        searchPlaceholder="البحث عن تذكرة (رقم التذكرة، الطالب، الحصة...)"
        noDataMessage="لا توجد تذاكر مطابقة للبحث"
        mobileCardRenderer={mobileCardRenderer}
        showQuickFilters={true}
        quickFilters={quickFilters}
        activeFilters={activeFilters}
        onFilterChange={(key, value) =>
          setActiveFilters((prev) => ({ ...prev, [key]: value }))
        }
        headerActions={headerActions}
        emptyStateAction={emptyStateAction}
        enableVirtualScroll={true}
        virtualItemHeight={120}
        className="w-full"
      />

      {selectedTicket && (
        <CancelTicketDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          onConfirm={handleConfirmCancel}
          ticketNumber={selectedTicket.ticketNumber}
          isPending={cancelTicketMutation.isPending}
        />
      )}
    </>
  )
}
