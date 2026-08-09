'use client'

import { useOrgRole } from '@/hooks/use-org-role'
import { ORG_WIDE_ROLES, Permission, Scope, scopeFor, type Role } from '@repo/rbac'
import { useMemo } from 'react'

export interface PermissionState {
  role: Role | null
  userId: string | null
  isPending: boolean
  /** True when the role may perform the action at all, at any scope. */
  can: (permission: Permission) => boolean
  /** How far the permission reaches: org-wide, assigned, children, self, or denied. */
  scopeOf: (permission: Permission) => Scope
  /** Owner and admin, the roles that see every row in the organization. */
  isOrgWide: boolean
  /**
   * Row-level gate. Lists arrive already filtered to what the actor may see, so
   * a visible row is a permitted row wherever the write scope matches the read
   * scope. The exception is authorship: a non org-wide actor may only modify
   * rows it created (`assertSessionNoteAuthored` on the server). Pass the row's
   * author id and this applies that rule.
   */
  canForOwn: (permission: Permission, ownerId: string | null | undefined) => boolean
}

/**
 * Reads the same role x permission table the API enforces, so a control is
 * hidden exactly when the call behind it would be rejected.
 */
export function usePermissions(): PermissionState {
  const { role, userId, isPending } = useOrgRole()

  return useMemo(() => {
    const scopeOf = (permission: Permission) => (role ? scopeFor(role, permission) : Scope.NONE)
    const can = (permission: Permission) => scopeOf(permission) !== Scope.NONE

    return {
      role,
      userId,
      isPending,
      can,
      scopeOf,
      isOrgWide: role != null && ORG_WIDE_ROLES.includes(role),
      canForOwn: (permission, ownerId) => {
        const scope = scopeOf(permission)
        if (scope === Scope.NONE) return false
        if (scope === Scope.ORG) return true
        return Boolean(userId) && ownerId === userId
      },
    }
  }, [role, userId, isPending])
}
