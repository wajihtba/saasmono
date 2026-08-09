'use client'

import { OrgRoleContext, type OrgRoleState } from '@/components/role-provider'
import { useContext } from 'react'

/**
 * The signed-in user's role in the active organization. Fetched once by
 * `RoleProvider`; this only reads it.
 */
export function useOrgRole(): OrgRoleState {
  return useContext(OrgRoleContext)
}
