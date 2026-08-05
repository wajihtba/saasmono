import { describe, expect, it } from 'vitest'
import { ORG_ROLE_VALUES, USER_TYPE_VALUES } from '../db/schema/enums'
import { can, Permission, Role, ROLE_PERMISSIONS, Scope, scopeFor } from './rbac'

/**
 * Executable version of RBAC_PLAN.md section 3. If a cell here disagrees with
 * the plan, one of the two is wrong — fix both together.
 */
const MATRIX: Record<Permission, Record<Role, Scope>> = {
  [Permission.ATTENDANCE_READ]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ASSIGNED,
    [Role.PARENT]: Scope.CHILDREN,
    [Role.STUDENT]: Scope.SELF,
  },
  [Permission.ATTENDANCE_WRITE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ASSIGNED,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.ATTENDANCE_DELETE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.NONE,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.CLASSROOM_READ]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ASSIGNED,
    [Role.PARENT]: Scope.CHILDREN,
    [Role.STUDENT]: Scope.SELF,
  },
  [Permission.CLASSROOM_WRITE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.CURRICULUM_READ]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ORG,
    [Role.PARENT]: Scope.ORG,
    [Role.STUDENT]: Scope.ORG,
  },
  [Permission.CURRICULUM_WRITE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.NONE,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.LATEPASS_READ]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.CHILDREN,
    [Role.STUDENT]: Scope.SELF,
  },
  [Permission.LATEPASS_ISSUE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.LATEPASS_VALIDATE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ORG,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.LATEPASS_CONFIG]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.NONE,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.ROOM_READ]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ORG,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.ROOM_WRITE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.ROOM_DELETE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.NONE,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.NOTE_READ]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ASSIGNED,
    [Role.PARENT]: Scope.CHILDREN,
    [Role.STUDENT]: Scope.SELF,
  },
  [Permission.NOTE_WRITE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ASSIGNED,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.NOTE_DELETE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.NONE,
    [Role.TEACHER]: Scope.SELF,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.STUDENT_READ]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ASSIGNED,
    [Role.PARENT]: Scope.CHILDREN,
    [Role.STUDENT]: Scope.SELF,
  },
  [Permission.STUDENT_WRITE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.TEACHER_READ]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ORG,
    [Role.PARENT]: Scope.CHILDREN,
    [Role.STUDENT]: Scope.SELF,
  },
  [Permission.TEACHER_WRITE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.PARENT_READ]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ASSIGNED,
    [Role.PARENT]: Scope.SELF,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.PARENT_WRITE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.USER_READ]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ASSIGNED,
    [Role.PARENT]: Scope.SELF,
    [Role.STUDENT]: Scope.SELF,
  },
  [Permission.USER_WRITE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.SELF,
    [Role.TEACHER]: Scope.SELF,
    [Role.PARENT]: Scope.SELF,
    [Role.STUDENT]: Scope.SELF,
  },
  [Permission.TIMETABLE_READ]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ASSIGNED,
    [Role.PARENT]: Scope.CHILDREN,
    [Role.STUDENT]: Scope.SELF,
  },
  [Permission.TIMETABLE_WRITE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.TIMETABLE_DELETE]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.NONE,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.FILE_UPLOAD]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.ORG,
    [Role.TEACHER]: Scope.ORG,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
  [Permission.ORG_SETTINGS]: {
    [Role.OWNER]: Scope.ORG,
    [Role.ADMIN]: Scope.ORG,
    [Role.STAFF]: Scope.NONE,
    [Role.TEACHER]: Scope.NONE,
    [Role.PARENT]: Scope.NONE,
    [Role.STUDENT]: Scope.NONE,
  },
}

describe('RBAC enums', () => {
  it('Role enum matches the org_role Postgres enum', () => {
    expect([...ORG_ROLE_VALUES].sort()).toEqual(Object.values(Role).sort())
  })

  it('user_type values are a subset of org roles', () => {
    for (const userType of USER_TYPE_VALUES) {
      expect(ORG_ROLE_VALUES).toContain(userType)
    }
  })

  it('every role has an entry for every permission', () => {
    for (const role of Object.values(Role)) {
      for (const permission of Object.values(Permission)) {
        expect(ROLE_PERMISSIONS[role][permission]).toBeDefined()
      }
    }
  })
})

describe('permission matrix', () => {
  for (const [permission, byRole] of Object.entries(MATRIX)) {
    for (const [role, expected] of Object.entries(byRole)) {
      it(`${role} -> ${permission} = ${expected}`, () => {
        expect(scopeFor(role as Role, permission as Permission)).toBe(expected)
      })
    }
  }
})

describe('privilege separation', () => {
  const WRITE_PERMISSIONS = [
    Permission.ATTENDANCE_WRITE,
    Permission.CLASSROOM_WRITE,
    Permission.CURRICULUM_WRITE,
    Permission.LATEPASS_ISSUE,
    Permission.ROOM_WRITE,
    Permission.NOTE_WRITE,
    Permission.STUDENT_WRITE,
    Permission.TEACHER_WRITE,
    Permission.PARENT_WRITE,
    Permission.TIMETABLE_WRITE,
  ]

  it('students cannot write anything', () => {
    for (const permission of WRITE_PERMISSIONS) {
      expect(can(Role.STUDENT, permission)).toBe(false)
    }
  })

  it('parents cannot write anything', () => {
    for (const permission of WRITE_PERMISSIONS) {
      expect(can(Role.PARENT, permission)).toBe(false)
    }
  })

  it('only owner and admin may delete', () => {
    const deletes = [Permission.ATTENDANCE_DELETE, Permission.ROOM_DELETE, Permission.TIMETABLE_DELETE]
    for (const permission of deletes) {
      expect(scopeFor(Role.OWNER, permission)).toBe(Scope.ORG)
      expect(scopeFor(Role.ADMIN, permission)).toBe(Scope.ORG)
      for (const role of [Role.STAFF, Role.TEACHER, Role.PARENT, Role.STUDENT]) {
        expect(can(role, permission)).toBe(false)
      }
    }
  })

  it('no two roles have identical permission sets', () => {
    const fingerprints = new Map<string, Role>()
    for (const role of Object.values(Role)) {
      if (role === Role.OWNER || role === Role.ADMIN) continue
      const fingerprint = JSON.stringify(ROLE_PERMISSIONS[role])
      expect(fingerprints.has(fingerprint)).toBe(false)
      fingerprints.set(fingerprint, role)
    }
  })
})
