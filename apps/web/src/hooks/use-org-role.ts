'use client'

import { authClient } from '@/lib/auth-client'
import { isRole, type Role } from '@repo/rbac'
import { useEffect, useState } from 'react'

interface OrgRoleState {
  role: Role | null
  isPending: boolean
}

/**
 * The signed-in user's role in the active organization. Roles live on the
 * membership, not the user, so this has to be fetched rather than read off the
 * session.
 */
export function useOrgRole(): OrgRoleState {
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [role, setRole] = useState<Role | null>(null)
  const [isPending, setIsPending] = useState(true)

  useEffect(() => {
    if (isSessionPending) return

    if (!session?.user) {
      setRole(null)
      setIsPending(false)
      return
    }

    let cancelled = false

    authClient.organization
      .getActiveMemberRole()
      .then((result) => {
        if (cancelled) return
        const value = (result as { data?: { role?: string } })?.data?.role
        setRole(isRole(value) ? value : null)
      })
      .catch(() => {
        if (!cancelled) setRole(null)
      })
      .finally(() => {
        if (!cancelled) setIsPending(false)
      })

    return () => {
      cancelled = true
    }
  }, [session?.user?.id, isSessionPending])

  return { role, isPending: isPending || isSessionPending }
}
