'use client'

import { authClient } from '@/lib/auth-client'
import { isRole, type Role } from '@repo/rbac'
import { createContext, useEffect, useState } from 'react'

export interface OrgRoleState {
  /** Role in the active organization, `null` until it resolves or if there is none. */
  role: Role | null
  /** The signed-in user id, needed to tell an actor's own rows from everyone else's. */
  userId: string | null
  isPending: boolean
}

export const OrgRoleContext = createContext<OrgRoleState>({
  role: null,
  userId: null,
  isPending: true,
})

/**
 * Roles live on the membership, not the session, so the role costs a request.
 * Resolving it here means one request per page load however many controls end
 * up asking for it.
 */
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [role, setRole] = useState<Role | null>(null)
  const [isPending, setIsPending] = useState(true)

  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (isSessionPending) return

    if (!session?.user) {
      setRole(null)
      setIsPending(false)
      return
    }

    let cancelled = false
    setIsPending(true)

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

  return (
    <OrgRoleContext.Provider value={{ role, userId, isPending: isPending || isSessionPending }}>
      {children}
    </OrgRoleContext.Provider>
  )
}
