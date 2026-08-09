'use client'

import { Badge, Card, cn } from '@repo/ui'
import { AlertCircle, Clock, MapPin, User } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
    label: `${String(hour).padStart(2, '0')}:00`,
    start: hour,
    end: hour + 1,
  }
})

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const formatTime = (date: Date) => {
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function TimetableGrid({ timetableData, isLoading, error, filters }: TimetableGridProps) {
  // Every session of the week keyed by day, sorted by start time. Unlike the
  // grid this keeps sessions that fall outside the 07:00-19:00 window.
  const sessionsByDay = useMemo(() => {
    const byDay: Record<string, TimetableSession[]> = {}
    WEEKDAYS.forEach(day => (byDay[day.key] = []))

    timetableData?.forEach(session => {
      const dayKey = DAY_KEYS[new Date(session.startDateTime).getUTCDay()]
      if (dayKey && byDay[dayKey]) byDay[dayKey].push(session)
    })

    Object.values(byDay).forEach(sessions =>
      sessions.sort(
        (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
      )
    )

    return byDay
  }, [timetableData])

  const firstDayWithSessions = WEEKDAYS.find(day => sessionsByDay[day.key]?.length)?.key
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Today is resolved after mount so the server and client agree on first
  // render, and only when it actually has sessions to show.
  useEffect(() => {
    const today = DAY_KEYS[new Date().getDay()]
    if (today && sessionsByDay[today]?.length) setSelectedDay(today)
  }, [sessionsByDay])

  const activeDay = selectedDay ?? firstDayWithSessions ?? WEEKDAYS[0]!.key
  const activeSessions = sessionsByDay[activeDay] ?? []

  // Process timetable data into grid format
  const gridData = useMemo(() => {
    if (!timetableData?.length) return {}

    const grid: Record<string, Record<number, TimetableSession[]>> = {}

    // Initialize grid
    WEEKDAYS.forEach(day => {
      const slots: Record<number, TimetableSession[]> = {}
      TIME_SLOTS.forEach(slot => {
        slots[slot.start] = []
      })
      grid[day.key] = slots
    })

    // Populate grid with sessions
    timetableData.forEach(session => {
      const startDate = new Date(session.startDateTime)
      const dayOfWeek = startDate.getUTCDay() // 0 = Sunday, 1 = Monday, etc.
      const hour = startDate.getUTCHours()

      // Map day of week to our weekday keys
      const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayKey = dayKeys[dayOfWeek]
      const daySlots = dayKey ? grid[dayKey] : undefined

      if (daySlots && hour >= 7 && hour < 19) {
        daySlots[hour]?.push(session)
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
      {/* Mobile: pick a day, read it as a timeline */}
      <div className="md:hidden">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {WEEKDAYS.map(day => {
            const count = sessionsByDay[day.key]?.length ?? 0
            const isActive = day.key === activeDay

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDay(day.key)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground'
                )}
              >
                {day.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs tabular-nums',
                    isActive ? 'bg-primary-foreground/20' : 'bg-muted'
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {activeSessions.length > 0 ? (
          <ol className="relative space-y-3 py-2">
            {activeSessions.map((session, index) => (
              <li key={session.id} className="flex gap-3">
                <div className="flex w-14 shrink-0 flex-col items-end pt-2">
                  <span className="text-sm font-medium tabular-nums" dir="ltr">
                    {formatTime(new Date(session.startDateTime))}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums" dir="ltr">
                    {formatTime(new Date(session.endDateTime))}
                  </span>
                </div>
                <div className="relative flex flex-col items-center pt-3">
                  <span className="bg-primary h-2.5 w-2.5 shrink-0 rounded-full" />
                  {index < activeSessions.length - 1 && (
                    <span className="bg-border mt-1 w-px flex-1" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <SessionCard session={session} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground py-10 text-center text-sm">
            لا توجد حصص في هذا اليوم
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

function SessionCard({ session }: { session: TimetableSession }) {
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
        {/* Subject */}
        <div className="font-medium">
          {session.educationSubject.displayNameAr || session.educationSubject.name}
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