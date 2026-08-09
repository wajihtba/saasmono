'use client'

import { Can } from '@/components/commun/can'
import { Permission } from '@repo/rbac'
import { Badge, Button } from '@repo/ui'
import { BookOpen, Calendar, Clock, Lock, Edit, Trash2, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDate, formatTime } from '@/lib/date'

interface SessionNoteHeaderProps {
  title: string
  isPrivate: boolean
  createdAt: Date
  timetable: {
    id: string
    title: string
    startDateTime: Date
    endDateTime: Date
  }
  createdBy: {
    id: string
    name: string
    lastName: string
  }
  noteId: string
  onDelete?: () => void
}

export function SessionNoteHeader({
  title,
  isPrivate,
  createdAt,
  timetable,
  createdBy,
  noteId,
  onDelete,
}: SessionNoteHeaderProps) {
  const router = useRouter()

  const handleEdit = () => {
    router.push(`/dashboard/session-notes/${noteId}/edit`)
  }

  return (
    <div className="space-y-4">
      {/* Decorative gradient header */}
      <div className="h-32 w-full rounded-t-lg bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />

      {/* Note header info */}
      <div className="px-6 pb-6 -mt-16">
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          {/* Title and privacy badge */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg shrink-0">
                <BookOpen className="text-primary h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground break-words">{title}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant={isPrivate ? 'secondary' : 'default'} className="text-xs">
                    {isPrivate ? (
                      <>
                        <Lock className="ml-1 h-3 w-3" />
                        خاصة
                      </>
                    ) : (
                      'عامة'
                    )}
                  </Badge>
                  <span className="text-muted-foreground text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span dir="ltr">{formatDate(createdAt)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-muted-foreground text-sm">
                  <User className="h-3 w-3" />
                  <span>أنشئت بواسطة: {createdBy.name} {createdBy.lastName}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Can permission={Permission.NOTE_WRITE} ownerId={createdBy.id} reserve="h-8 w-24">
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 ml-1" />
                  تعديل
                </Button>
              </Can>
              {onDelete && (
                <Can permission={Permission.NOTE_DELETE} ownerId={createdBy.id} reserve="h-8 w-20">
                  <Button variant="destructive" size="sm" onClick={onDelete}>
                    <Trash2 className="h-4 w-4 ml-1" />
                    حذف
                  </Button>
                </Can>
              )}
            </div>
          </div>

          {/* Timetable info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="text-sm font-medium text-muted-foreground">معلومات الجلسة</div>
            <div className="text-base font-semibold">{timetable.title}</div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(timetable.startDateTime)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(timetable.startDateTime)}{' '}
                -{' '}
                {formatTime(timetable.endDateTime)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
