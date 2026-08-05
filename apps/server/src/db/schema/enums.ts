import { ROLE_VALUES, USER_TYPE_VALUES } from '@repo/rbac'
import { pgEnum } from 'drizzle-orm/pg-core'

export { USER_TYPE_VALUES }

/**
 * Organization role. Single source of truth for authorization.
 * Stored on `member.role`, so the same person can hold a different
 * role in a different organization.
 */
export const ORG_ROLE_VALUES = ROLE_VALUES

export const orgRoleEnum = pgEnum('org_role', ORG_ROLE_VALUES)

/**
 * Domain label for a person. Drives which profile tables a user appears in.
 * Not used for authorization — see `orgRoleEnum`.
 */
export const userTypeEnum = pgEnum('user_type', USER_TYPE_VALUES)

/**
 * Platform-level role from better-auth's admin plugin. Reserved for
 * cross-tenant operators, never for tenant permissions.
 */
export const PLATFORM_ROLE_VALUES = ['user', 'admin'] as const

export const platformRoleEnum = pgEnum('platform_role', PLATFORM_ROLE_VALUES)
