import { DASHBOARD_ROUTE_ROLES, rolesForRoute } from '@repo/rbac'
import { describe, expect, it } from 'vitest'
import { can, Permission, Role } from './rbac'

/**
 * The dashboard hides a page through `DASHBOARD_ROUTE_ROLES` and hides the
 * buttons on it through `ROLE_PERMISSIONS`. Those are two hand-written tables,
 * so they can drift: a role keeps a menu entry to a page where every control is
 * gone, or loses a page it still holds the permission for.
 *
 * Each route below declares the permission its content exists to serve. A role
 * listed for the route has to hold it.
 */
const ROUTE_PERMISSION: Record<string, Permission> = {
  '/dashboard': Permission.USER_READ,
  '/dashboard/classrooms': Permission.CLASSROOM_READ,
  '/dashboard/timetable': Permission.TIMETABLE_READ,

  '/dashboard/session-notes': Permission.NOTE_READ,
  '/dashboard/session-notes/new': Permission.NOTE_WRITE,

  '/dashboard/attendances': Permission.ATTENDANCE_READ,
  '/dashboard/attendances/new': Permission.ATTENDANCE_WRITE,

  '/dashboard/late-pass-tickets': Permission.LATEPASS_READ,
  '/dashboard/late-pass-tickets/generate': Permission.LATEPASS_ISSUE,

  // The settings area is the staff-and-up landing page; teacher-write is the
  // permission that separates that group from the teaching side.
  '/dashboard/institution-settings': Permission.TEACHER_WRITE,
  '/dashboard/institution-settings/teachers': Permission.TEACHER_READ,
  '/dashboard/institution-settings/students': Permission.STUDENT_READ,
  '/dashboard/institution-settings/parents': Permission.PARENT_READ,
  '/dashboard/institution-settings/curriculum': Permission.CURRICULUM_READ,

  '/dashboard/user/settings': Permission.USER_READ,
}

describe('dashboard routes against the permission matrix', () => {
  it('declares a permission for every route in the table', () => {
    expect(Object.keys(ROUTE_PERMISSION).sort()).toEqual(Object.keys(DASHBOARD_ROUTE_ROLES).sort())
  })

  for (const [route, permission] of Object.entries(ROUTE_PERMISSION)) {
    it(`only opens ${route} to roles holding ${permission}`, () => {
      for (const role of DASHBOARD_ROUTE_ROLES[route] ?? []) {
        expect(can(role, permission), `${role} may open ${route} without ${permission}`).toBe(true)
      }
    })
  }

  it('narrows an edit route under a list to the roles that may write there', () => {
    for (const role of rolesForRoute('/dashboard/session-notes/some-id/edit')) {
      expect(can(role, Permission.NOTE_WRITE)).toBe(true)
    }
    for (const role of rolesForRoute('/dashboard/attendances/some-id/edit')) {
      expect(can(role, Permission.ATTENDANCE_WRITE)).toBe(true)
    }
  })

  it('keeps an unlisted route closed to everyone but the org-wide roles', () => {
    expect(rolesForRoute('/dashboard/something-new')).toEqual([Role.OWNER, Role.ADMIN])
  })
})
