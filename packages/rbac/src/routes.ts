import { Role } from './roles'

const ALL: readonly Role[] = [Role.OWNER, Role.ADMIN, Role.STAFF, Role.TEACHER, Role.PARENT, Role.STUDENT]
const STAFF_UP: readonly Role[] = [Role.OWNER, Role.ADMIN, Role.STAFF]
const TEACHING: readonly Role[] = [Role.OWNER, Role.ADMIN, Role.STAFF, Role.TEACHER]
const ADMINS: readonly Role[] = [Role.OWNER, Role.ADMIN]

/**
 * Which roles may open which dashboard route. Mirrors RBAC_PLAN.md section 5.
 *
 * This is navigation-level only: it hides pages a role has no business opening.
 * The API permission matrix is what actually protects the data.
 *
 * Matching is longest-prefix, so a more specific entry wins over its parent.
 */
export const DASHBOARD_ROUTE_ROLES: Record<string, readonly Role[]> = {
  '/dashboard': ALL,
  '/dashboard/classrooms': ALL,
  '/dashboard/timetable': ALL,

  '/dashboard/session-notes': ALL,
  '/dashboard/session-notes/new': TEACHING,

  '/dashboard/attendances': ALL,
  '/dashboard/attendances/new': TEACHING,

  '/dashboard/late-pass-tickets': [Role.OWNER, Role.ADMIN, Role.STAFF, Role.PARENT, Role.STUDENT],
  '/dashboard/late-pass-tickets/generate': STAFF_UP,

  '/dashboard/institution-settings': STAFF_UP,
  '/dashboard/institution-settings/teachers': STAFF_UP,
  '/dashboard/institution-settings/students': TEACHING,
  '/dashboard/institution-settings/parents': STAFF_UP,
  '/dashboard/institution-settings/curriculum': TEACHING,

  '/dashboard/user/settings': ALL,
}

/** Suffixes that make a route an edit surface rather than a read surface. */
const EDIT_SUFFIXES = ['/edit', '/new']

export function rolesForRoute(pathname: string): readonly Role[] {
  const normalized = pathname.replace(/\/+$/, '') || '/dashboard'

  let match: readonly Role[] | undefined
  let matchLength = -1
  for (const [route, roles] of Object.entries(DASHBOARD_ROUTE_ROLES)) {
    if ((normalized === route || normalized.startsWith(`${route}/`)) && route.length > matchLength) {
      match = roles
      matchLength = route.length
    }
  }

  if (!match) return ADMINS

  // A dynamic segment sits under the list route, so `/attendances/{id}/edit`
  // inherits the list's roles. Narrow it back down to the teaching side.
  if (EDIT_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return match.filter((role) => TEACHING.includes(role))
  }

  return match
}

export const canAccessRoute = (role: Role | null | undefined, pathname: string): boolean =>
  role != null && rolesForRoute(pathname).includes(role)
