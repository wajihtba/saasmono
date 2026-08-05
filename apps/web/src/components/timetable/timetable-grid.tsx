'use client'

import { Badge, Card } from '@repo/ui'
import { AlertCircle, Clock, MapPin, User } from 'lucide-react'
import { useMemo } from 'react'
import { TimetableFilterState } from './timetable-visualization'

interface TimetableSession {
  id: string
  title: string
  startDateTime: Date
  endDateTime: Date
  status: string
  teacher: {
    id: string
    name: string
    lastName: string
  }
  educationSubject: {
    id: string
    name: string
    displayNameAr: string
  }
  room: {
    id: string
    name: string
    code: string
  }
  classroom?: {
    id: string
    name: string
  } | null
  classroomGroup?: {
    id: string
    name: string
  } | null
}

interface TimetableGridProps {
  timetableData: TimetableSession[]
  isLoading: boolean
  error: any
  filters: TimetableFilterState
}

// Arabic weekdays starting from Sunday
const WEEKDAYS = [
  { key: 'sunday', label: 'الأحد' },
  { key: 'monday', label: 'الاثنين' },
  { key: 'tuesday', label: 'الثلاثاء' },
  { key: 'wednesday', label: 'الأربعاء' },
  { key: 'thursday', label: 'الخميس' },
  { key: 'friday', label: 'الجمعة' },
  { key: 'saturday', label: 'السبت' },
]

// Time slots from 7 AM to 7 PM
const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const hour = 7 + i
  return {
    key: hour,
    label: `${hour}:00`,
    start: hour,
    end: hour + 1,
  }
})

export function TimetableGrid({ timetableData, isLoading, error, filters }: TimetableGridProps) {
  // Process timetable data into grid format
  const gridData = useMemo(() => {
    if (!timetableData?.length) return {}

    const grid: Record<string, Record<number, TimetableSession[]>> = {}

    // Initialize grid
    WEEKDAYS.forEach(day => {
      grid[day.key] = {}
      TIME_SLOTS.forEach(slot => {
        grid[day.key][slot.start] = []
      })
    })

    // Populate grid with sessions
    timetableData.forEach(session => {
      const startDate = new Date(session.startDateTime)
      const dayOfWeek = startDate.getUTCDay() // 0 = Sunday, 1 = Monday, etc.
      const hour = startDate.getUTCHours()

      // Map day of week to our weekday keys
      const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayKey = dayKeys[dayOfWeek]

      if (grid[dayKey] && hour >= 7 && hour < 19) {
        grid[dayKey][hour].push(session)
      }
    })

    return grid
  }, [timetableData])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 h-12 w-12 mx-auto mb-4"></div>
          <p className="text-muted-foreground">جارٍ تحميل جدول الحصص...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-4">
          <div className="bg-destructive/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <AlertCircle className="text-destructive h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">خطأ في تحميل البيانات</h3>
            <p className="text-muted-foreground mt-1">
              حدث خطأ أثناء تحميل جدول الحصص. يرجى المحاولة مرة أخرى.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!timetableData?.length) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-4">
          <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <Clock className="text-muted-foreground h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">لا توجد حصص</h3>
            <p className="text-muted-foreground mt-1">
              لا توجد حصص مجدولة للفترة أو الفلتر المحدد
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile: one stacked block per day, only days that have sessions */}
      <div className="space-y-6 md:hidden">
        {WEEKDAYS.map(day => {
          const daySessions = TIME_SLOTS.flatMap(slot => gridData[day.key]?.[slot.start] || [])
          if (!daySessions.length) return null

          return (
            <div key={day.key} className="space-y-2">
              <div className="bg-muted/60 sticky top-0 z-10 rounded-md px-3 py-2 text-sm font-semibold">
                {day.label}
              </div>
              {daySessions.map(session => (
                <SessionCard key={session.id} session={session} showTime />
              ))}
            </div>
          )
        })}
        {WEEKDAYS.every(day => !TIME_SLOTS.some(slot => gridData[day.key]?.[slot.start]?.length)) && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            لا توجد حصص مجدولة لهذا الأسبوع
          </p>
        )}
      </div>

      {/* Desktop: full weekly grid */}
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[800px]">
        {/* Header Row */}
        <div className="grid grid-cols-8 gap-2 mb-4">
          <div className="text-center font-medium text-muted-foreground">
            الوقت
          </div>
          {WEEKDAYS.map(day => (
            <div key={day.key} className="text-center font-medium">
              {day.label}
            </div>
          ))}
        </div>

        {/* Time Rows */}
        <div className="space-y-2">
          {TIME_SLOTS.map(timeSlot => (
            <div key={timeSlot.key} className="grid grid-cols-8 gap-2">
              {/* Time Label */}
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                {timeSlot.label}
              </div>

              {/* Day Columns */}
              {WEEKDAYS.map(day => {
                const sessions = gridData[day.key]?.[timeSlot.start] || []

                return (
                  <div key={`${day.key}-${timeSlot.key}`} className="min-h-[80px]">
                    {sessions.length > 0 ? (
                      <div className="space-y-1">
                        {sessions.map(session => (
                          <SessionCard key={session.id} session={session} />
                        ))}
                      </div>
                    ) : (
                      <div className="h-full border-2 border-dashed border-gray-200 rounded-lg"></div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
          </div>
        </div>
      </div>
    </>
  )
}

function SessionCard({ session, showTime = false }: { session: TimetableSession; showTime?: boolean }) {
  const startTime = new Date(session.startDateTime)
  const endTime = new Date(session.endDateTime)

  const formatTime = (date: Date) => {
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'IN_PROGRESS':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'COMPLETED':
        return 'bg-gray-50 border-gray-200 text-gray-800'
      case 'CANCELLED':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'RESCHEDULED':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  return (
    <Card className={`p-2 text-sm border-2 md:text-xs ${getStatusColor(session.status)}`}>
      <div className="space-y-1">
        {/* Subject and Time */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{session.educationSubject.name}</span>
          {showTime && (
            <span className="shrink-0 tabular-nums" dir="ltr">
              {formatTime(startTime)} - {formatTime(endTime)}
            </span>
          )}
        </div>

        {/* Teacher */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{session.teacher.name} {session.teacher.lastName}</span>
        </div>

        {/* Room */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{session.room.name}</span>
        </div>

        {session.classroomGroup && (
          <Badge variant="outline" className="text-xs">
            {session.classroomGroup.name}
          </Badge>
        )}
      </div>
    </Card>
  )
}