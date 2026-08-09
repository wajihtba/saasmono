'use client'

import { use } from 'react'

import { orpc } from '@/utils/orpc'
import { useQuery } from '@tanstack/react-query'
import { AttendanceHeader } from '@/components/attendances/detail/attendance-header'
import { AttendanceSummary } from '@/components/attendances/detail/attendance-summary'
import { Loader2 } from 'lucide-react'

interface PageProps {
  // Next 15 hands route params to the page as a promise.
  params: Promise<{
    sessionId: string
  }>
}

export default function AttendanceDetailPage({ params }: PageProps) {
  const { sessionId } = use(params)
  const { data: attendanceSession, isLoading, error } = useQuery(
    orpc.management.attendances.getAttendanceSessionById.queryOptions({
      input: { sessionId: sessionId },
    })
  ) as any

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !attendanceSession) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">خطأ في تحميل سجل الحضور</h3>
          <p className="text-muted-foreground">
            {error?.message || 'لم يتم العثور على سجل الحضور'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AttendanceHeader
        timetable={attendanceSession.timetable}
        classroom={attendanceSession.classroom}
        classroomGroup={attendanceSession.classroomGroup}
        createdBy={attendanceSession.createdBy}
        createdAt={attendanceSession.createdAt}
        sessionId={sessionId}
      />

      <div className="px-6">
        <AttendanceSummary
          attendances={attendanceSession.attendances || []}
          generalNotes={attendanceSession.generalNotes}
        />
      </div>
    </div>
  )
}
