'use client'

import { Card } from '@repo/ui'
import { SessionNotesTable } from '@/components/sessionNotes/session-notes-table'
import { usePermissions } from '@/hooks/use-permissions'
import { Permission } from '@repo/rbac'
import { useRouter } from 'next/navigation'

export default function SessionNotesPage() {
  const router = useRouter()
  const { can } = usePermissions()

  const handleCreateNew = () => {
    router.push('/dashboard/session-notes/new')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">كراس القسم</h1>
      </div>

      <Card className="p-4 md:p-6">
        <SessionNotesTable onCreateNew={can(Permission.NOTE_WRITE) ? handleCreateNew : undefined} />
      </Card>
    </div>
  )
}
