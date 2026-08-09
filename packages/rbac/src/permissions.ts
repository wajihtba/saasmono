import { Role } from './roles'

/**
 * How wide a permission reaches once it is granted.
 */
export enum Scope {
  /** Every row in the organization. */
  ORG = 'org',
  /** Only rows tied to the actor's teaching assignments. */
  ASSIGNED = 'assigned',
  /** Only rows tied to the actor's linked children. */
  CHILDREN = 'children',
  /** Only rows where the actor is the subject. */
  SELF = 'self',
  /** Denied. */
  NONE = 'none',
}

export enum Permission {
  ATTENDANCE_READ = 'attendance:read',
  ATTENDANCE_WRITE = 'attendance:write',
  ATTENDANCE_DELETE = 'attendance:delete',

  CLASSROOM_READ = 'classroom:read',
  CLASSROOM_WRITE = 'classroom:write',

  CURRICULUM_READ = 'curriculum:read',
  CURRICULUM_WRITE = 'curriculum:write',

  LATEPASS_READ = 'latepass:read',
  LATEPASS_ISSUE = 'latepass:issue',
  LATEPASS_VALIDATE = 'latepass:validate',
  LATEPASS_CONFIG = 'latepass:config',

  ROOM_READ = 'room:read',
  ROOM_WRITE = 'room:write',
  ROOM_DELETE = 'room:delete',

  NOTE_READ = 'note:read',
  NOTE_WRITE = 'note:write',
  NOTE_DELETE = 'note:delete',

  STUDENT_READ = 'student:read',
  STUDENT_WRITE = 'student:write',
  TEACHER_READ = 'teacher:read',
  TEACHER_WRITE = 'teacher:write',
  PARENT_READ = 'parent:read',
  PARENT_WRITE = 'parent:write',
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',

  TIMETABLE_READ = 'timetable:read',
  TIMETABLE_WRITE = 'timetable:write',
  TIMETABLE_DELETE = 'timetable:delete',

  FILE_UPLOAD = 'file:upload',
  ORG_SETTINGS = 'org:settings',
}

type PermissionScopes = Record<Permission, Scope>

const deny = (): PermissionScopes =>
  Object.values(Permission).reduce((acc, permission) => {
    acc[permission] = Scope.NONE
    return acc
  }, {} as PermissionScopes)

const orgWide = (): PermissionScopes =>
  Object.values(Permission).reduce((acc, permission) => {
    acc[permission] = Scope.ORG
    return acc
  }, {} as PermissionScopes)

/**
 * Role -> permission -> scope. Mirrors RBAC_PLAN.md section 3.
 * `Scope.NONE` means the call is rejected before it reaches a handler.
 *
 * Shared by the API, which enforces it, and by the dashboard, which hides the
 * controls it forbids. Both read this table so a button and its route can never
 * disagree about who may act.
 */
export const ROLE_PERMISSIONS: Record<Role, PermissionScopes> = {
  [Role.OWNER]: orgWide(),

  [Role.ADMIN]: orgWide(),

  [Role.STAFF]: {
    ...deny(),
    [Permission.ATTENDANCE_READ]: Scope.ORG,
    [Permission.ATTENDANCE_WRITE]: Scope.ORG,
    [Permission.CLASSROOM_READ]: Scope.ORG,
    [Permission.CLASSROOM_WRITE]: Scope.ORG,
    [Permission.CURRICULUM_READ]: Scope.ORG,
    [Permission.LATEPASS_READ]: Scope.ORG,
    [Permission.LATEPASS_ISSUE]: Scope.ORG,
    [Permission.LATEPASS_VALIDATE]: Scope.ORG,
    [Permission.ROOM_READ]: Scope.ORG,
    [Permission.ROOM_WRITE]: Scope.ORG,
    [Permission.NOTE_READ]: Scope.ORG,
    [Permission.NOTE_WRITE]: Scope.ORG,
    [Permission.STUDENT_READ]: Scope.ORG,
    [Permission.STUDENT_WRITE]: Scope.ORG,
    [Permission.TEACHER_READ]: Scope.ORG,
    [Permission.TEACHER_WRITE]: Scope.ORG,
    [Permission.PARENT_READ]: Scope.ORG,
    [Permission.PARENT_WRITE]: Scope.ORG,
    [Permission.USER_READ]: Scope.ORG,
    [Permission.USER_WRITE]: Scope.SELF,
    [Permission.TIMETABLE_READ]: Scope.ORG,
    [Permission.TIMETABLE_WRITE]: Scope.ORG,
    [Permission.FILE_UPLOAD]: Scope.ORG,
  },

  [Role.TEACHER]: {
    ...deny(),
    [Permission.ATTENDANCE_READ]: Scope.ASSIGNED,
    [Permission.ATTENDANCE_WRITE]: Scope.ASSIGNED,
    [Permission.CLASSROOM_READ]: Scope.ASSIGNED,
    [Permission.CURRICULUM_READ]: Scope.ORG,
    [Permission.LATEPASS_VALIDATE]: Scope.ORG,
    [Permission.ROOM_READ]: Scope.ORG,
    [Permission.NOTE_READ]: Scope.ASSIGNED,
    [Permission.NOTE_WRITE]: Scope.ASSIGNED,
    [Permission.NOTE_DELETE]: Scope.SELF,
    [Permission.STUDENT_READ]: Scope.ASSIGNED,
    [Permission.TEACHER_READ]: Scope.ORG,
    [Permission.PARENT_READ]: Scope.ASSIGNED,
    [Permission.USER_READ]: Scope.ASSIGNED,
    [Permission.USER_WRITE]: Scope.SELF,
    [Permission.TIMETABLE_READ]: Scope.ASSIGNED,
    [Permission.FILE_UPLOAD]: Scope.ORG,
  },

  [Role.PARENT]: {
    ...deny(),
    [Permission.ATTENDANCE_READ]: Scope.CHILDREN,
    [Permission.CLASSROOM_READ]: Scope.CHILDREN,
    [Permission.CURRICULUM_READ]: Scope.ORG,
    [Permission.LATEPASS_READ]: Scope.CHILDREN,
    [Permission.NOTE_READ]: Scope.CHILDREN,
    [Permission.STUDENT_READ]: Scope.CHILDREN,
    [Permission.TEACHER_READ]: Scope.CHILDREN,
    [Permission.PARENT_READ]: Scope.SELF,
    [Permission.USER_READ]: Scope.SELF,
    [Permission.USER_WRITE]: Scope.SELF,
    [Permission.TIMETABLE_READ]: Scope.CHILDREN,
  },

  [Role.STUDENT]: {
    ...deny(),
    [Permission.ATTENDANCE_READ]: Scope.SELF,
    [Permission.CLASSROOM_READ]: Scope.SELF,
    [Permission.CURRICULUM_READ]: Scope.ORG,
    [Permission.LATEPASS_READ]: Scope.SELF,
    [Permission.NOTE_READ]: Scope.SELF,
    [Permission.STUDENT_READ]: Scope.SELF,
    [Permission.TEACHER_READ]: Scope.SELF,
    [Permission.USER_READ]: Scope.SELF,
    [Permission.USER_WRITE]: Scope.SELF,
    [Permission.TIMETABLE_READ]: Scope.SELF,
  },
}

export const scopeFor = (role: Role, permission: Permission): Scope =>
  ROLE_PERMISSIONS[role]?.[permission] ?? Scope.NONE

export const can = (role: Role, permission: Permission): boolean => scopeFor(role, permission) !== Scope.NONE
