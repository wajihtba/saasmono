import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements } from 'better-auth/plugins/organization/access'
import { Role } from '../types/rbac'

/**
 * Access control for better-auth's own organization endpoints (invite, remove
 * member, update organization...). It is deliberately narrow: the application
 * API is guarded by `ROLE_PERMISSIONS` in `types/rbac.ts`, this only decides
 * who may administer memberships.
 *
 * Declaring every role here also stops better-auth from writing its built-in
 * `member` role, which is not part of the `org_role` enum.
 */
export const ac = createAccessControl(defaultStatements)

const ownerRole = ac.newRole({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
})

const adminRole = ac.newRole({
  organization: ['update'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['read'],
})

const staffRole = ac.newRole({
  organization: [],
  member: [],
  invitation: ['create', 'cancel'],
  team: [],
  ac: [],
})

const readOnlyRole = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: [],
})

export const orgRoles = {
  [Role.OWNER]: ownerRole,
  [Role.ADMIN]: adminRole,
  [Role.STAFF]: staffRole,
  [Role.TEACHER]: readOnlyRole,
  [Role.PARENT]: readOnlyRole,
  [Role.STUDENT]: readOnlyRole,
}
