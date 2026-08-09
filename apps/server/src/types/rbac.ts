import { can, ORG_WIDE_ROLES, Permission, Role, ROLE_PERMISSIONS, Scope, scopeFor } from '@repo/rbac'
import { z } from 'zod'
import { ORG_ROLE_VALUES, USER_TYPE_VALUES } from '../db/schema/enums'

/**
 * The matrix itself lives in `@repo/rbac` so the dashboard can hide the controls
 * this file's `authorized()` calls would reject. Server code keeps importing it
 * from here.
 */
export { can, ORG_WIDE_ROLES, Permission, Role, ROLE_PERMISSIONS, Scope, scopeFor }

/**
 * Domain label. Values match the `user_type` Postgres enum. Kept as a union
 * rather than a TS enum because it is compared against zod literals all over
 * the response schemas; authorization never reads it.
 */
export type UserType = (typeof USER_TYPE_VALUES)[number]

export const RoleSchema = z.enum(ORG_ROLE_VALUES)
export const UserTypeSchema = z.enum(USER_TYPE_VALUES)
