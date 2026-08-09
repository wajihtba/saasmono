'use client'

import { Badge, Card } from '@repo/ui'
import { formatNumber, formatPercent } from '@repo/ui/lib/format'
import { CheckCircle2, XCircle, Clock, AlertCircle, HeartPulse, User } from 'lucide-react'

interface AttendanceSummaryProps {
  attendances: Array<{
    id: string
    studentId: string
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'SICK'
    note: string | null
    student: {
      id: string
      name: string
      lastName: string
    }
  }>
  generalNotes?: string | null
}

const STATUS_CONFIG = {
  PRESENT: {
    label: 'حاضر',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    badgeVariant: 'default' as const,
  },
  ABSENT: {
    label: 'غائب',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    badgeVariant: 'destructive' as const,
  },
  LATE: {
    label: 'متأخر',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    badgeVariant: 'secondary' as const,
  },
  EXCUSED: {
    label: 'معذور',
    icon: AlertCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    badgeVariant: 'outline' as const,
  },
  SICK: {
    label: 'مريض',
    icon: HeartPulse,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    badgeVariant: 'secondary' as const,
  },
}

export function AttendanceSummary({ attendances, generalNotes }: AttendanceSummaryProps) {
  // Calculate statistics
  const stats = {
    PRESENT: attendances.filter((a) => a.status === 'PRESENT').length,
    ABSENT: attendances.filter((a) => a.status === 'ABSENT').length,
    LATE: attendances.filter((a) => a.status === 'LATE').length,
    EXCUSED: attendances.filter((a) => a.status === 'EXCUSED').length,
    SICK: attendances.filter((a) => a.status === 'SICK').length,
  }

  const total = attendances.length

  // Group attendances by status
  const groupedByStatus = Object.entries(STATUS_CONFIG).reduce((acc, [status, config]) => {
    const students = attendances.filter((a) => a.status === status)
    if (students.length > 0) {
      acc[status as keyof typeof STATUS_CONFIG] = students
    }
    return acc
  }, {} as Record<string, typeof attendances>)

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon
          const count = stats[status as keyof typeof stats]
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0

          return (
            <Card key={status} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`${config.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold">{formatNumber(count)}</div>
                  <div className="text-xs text-muted-foreground">{config.label}</div>
                  <div className="text-xs text-muted-foreground">{formatPercent(percentage)}</div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* General Notes */}
      {generalNotes && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">الملاحظات العامة</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">{generalNotes}</p>
        </Card>
      )}

      {/* Students List by Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">تفاصيل حضور الطلاب</h3>
        {Object.entries(groupedByStatus).map(([status, students]) => {
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
          const Icon = config.icon

          return (
            <Card key={status} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`h-5 w-5 ${config.color}`} />
                <h4 className="font-semibold">{config.label}</h4>
                <Badge variant={config.badgeVariant} className="mr-2">
                  {students.length} طالب
                </Badge>
              </div>
              <div className="space-y-2">
                {students.map((attendance) => (
                  <div
                    key={attendance.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                  >
                    <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full shrink-0">
                      <User className="text-primary h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {attendance.student.name} {attendance.student.lastName}
                      </div>
                      {attendance.note && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {attendance.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      {attendances.length === 0 && (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <User className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>لم يتم تسجيل حضور أي طالب بعد</p>
          </div>
        </Card>
      )}
    </div>
  )
}
