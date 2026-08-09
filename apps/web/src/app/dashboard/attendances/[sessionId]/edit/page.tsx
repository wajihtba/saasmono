'use client'

import { use } from 'react'

import { orpc } from '@/utils/orpc'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { AttendanceForm } from '@/components/attendances/form/attendance-form'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@repo/ui'

interface PageProps {
  // Next 15 hands route params to the page as a promise.
  params: Promise<{
    sessionId: string
  }>
}

export default function EditAttendancePage({ params }: PageProps) {
  const { sessionId } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: attendanceSession, isLoading, error } = useQuery(
    orpc.management.attendances.getAttendanceSessionById.queryOptions({
      input: { sessionId: sessionId },
    })
  ) as any

  const updateMutation = useMutation({
    ...orpc.management.attendances.createBulkAttendance.mutationOptions(),
    onSuccess: () => {
      toast.success('تم تحديث سجل الحضور بنجاح')
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: orpc.management.attendances.getAttendancesList.queryKey({}),
      })
      queryClient.invalidateQueries({
        queryKey: orpc.management.attendances.getAttendanceSessionById.queryKey({
          input: { sessionId: sessionId },
        }),
      })
      // Navigate to detail page
      router.push(`/dashboard/attendances/${sessionId}`)
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث سجل الحضور')
    },
  })

  const handleSubmit = async (data: any) => {
    await updateMutation.mutateAsync({
      timetableId: attendanceSession.timetableId,
      generalNotes: data.generalNotes,
      attendances: data.attendances,
    })
  }

  const handleCancel = () => {
    router.push(`/dashboard/attendances/${sessionId}`)
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            تعديل سجل حضور: {attendanceSession.timetable.title}
          </h1>
          <p className="text-muted-foreground mt-2">
            تحديث حضور الطلاب وتعديل الملاحظات
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          رجوع
        </Button>
      </div>

      <AttendanceForm
        initialData={{
          timetableId: attendanceSession.timetableId,
          generalNotes: attendanceSession.generalNotes || '',
          attendances: attendanceSession.attendances.map((a: any) => ({
            studentId: a.studentId,
            status: a.status,
            note: a.note || '',
          })),
        }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="حفظ التعديلات"
        isLoading={updateMutation.isPending}
        readOnlyTimetable={true}
      />
    </div>
  )
}
