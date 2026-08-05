/**
 * Organization role. These values are the `org_role` Postgres enum on
 * `member.role` and are the single source of truth for authorization.
 */
export enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  STAFF = 'staff',
  TEACHER = 'teacher',
  PARENT = 'parent',
  STUDENT = 'student',
}

export const ROLE_VALUES = ['owner', 'admin', 'staff', 'teacher', 'parent', 'student'] as const

/** Domain label, the `user_type` Postgres enum. Never used for authorization. */
export const USER_TYPE_VALUES = ['staff', 'teacher', 'parent', 'student'] as const

export type UserType = (typeof USER_TYPE_VALUES)[number]

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLE_VALUES as readonly string[]).includes(value)

/** Roles that see every row in the organization. */
export const ORG_WIDE_ROLES: readonly Role[] = [Role.OWNER, Role.ADMIN]

export const ROLE_LABELS_AR: Record<Role, string> = {
  [Role.OWNER]: 'مالك المؤسسة',
  [Role.ADMIN]: 'مدير',
  [Role.STAFF]: 'إداري',
  [Role.TEACHER]: 'أستاذ',
  [Role.PARENT]: 'ولي أمر',
  [Role.STUDENT]: 'طالب',
}
