import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '../db'
import { attendance, attendanceSession } from '../db/schema/attendance'
import { classroomStudentEnrollment, classroomTeacherAssignment } from '../db/schema/classroom'
import { sessionNote, sessionNoteAttachment } from '../db/schema/sessionNote'
import { timetable } from '../db/schema/timetable'
import { parentStudentRelation } from '../db/schema/users'
import { Role, Scope } from '../types/rbac'
import { OrpcErrorHelper } from './errors/orpc-errors'

/**
 * The row-level filter a handler must apply. Produced from the scope the
 * permission middleware resolved, never from raw user input.
 */
export type ScopeFilter =
  | { kind: Scope.ORG; orgId: string }
  | { kind: Scope.ASSIGNED; orgId: string; teacherId: string }
  | { kind: Scope.CHILDREN; orgId: string; parentId: string }
  | { kind: Scope.SELF; orgId: string; userId: string }

/** Shape of the context after `authorized(...)` has run. */
export interface AuthorizedContext {
  orgId: string
  userId: string
  role: Role
  scope: Scope
}

function readAuthorized(context: any): AuthorizedContext {
  const orgId = context?.orgId ?? context?.session?.session?.activeOrganizationId
  const userId = context?.userId ?? context?.session?.user?.id
  const role = context?.role as Role | undefined
  const scope = context?.scope as Scope | undefined

  if (!userId) throw OrpcErrorHelper.userNotInSession()
  if (!orgId) throw OrpcErrorHelper.noActiveOrganization()
  if (!role || !scope) throw OrpcErrorHelper.noOrganizationRole()

  return { orgId, userId, role, scope }
}

export function resolveScope(context: any): ScopeFilter {
  const { orgId, userId, scope } = readAuthorized(context)

  switch (scope) {
    case Scope.ORG:
      return { kind: Scope.ORG, orgId }
    case Scope.ASSIGNED:
      return { kind: Scope.ASSIGNED, orgId, teacherId: userId }
    case Scope.CHILDREN:
      return { kind: Scope.CHILDREN, orgId, parentId: userId }
    case Scope.SELF:
      return { kind: Scope.SELF, orgId, userId }
    default:
      throw OrpcErrorHelper.forbidden()
  }
}

export const isOrgWide = (filter: ScopeFilter): filter is { kind: Scope.ORG; orgId: string } =>
  filter.kind === Scope.ORG

/**
 * For routes that cannot be scoped row by row and must simply be refused to
 * anyone narrower than the whole organization.
 */
export function requireOrgWideScope(context: any): { kind: Scope.ORG; orgId: string } {
  const filter = resolveScope(context)
  if (filter.kind !== Scope.ORG) throw OrpcErrorHelper.forbidden('This action requires organization-wide access')
  return filter
}

/** Student ids a parent is linked to. */
export async function getChildStudentIds(parentId: string): Promise<string[]> {
  const rows = await db
    .select({ studentId: parentStudentRelation.studentId })
    .from(parentStudentRelation)
    .where(eq(parentStudentRelation.parentId, parentId))

  return rows.map((row) => row.studentId)
}

/** Classroom ids a teacher is assigned to, either directly or through a session. */
export async function getTeacherClassroomIds(teacherId: string, orgId: string): Promise<string[]> {
  const [assigned, scheduled] = await Promise.all([
    db
      .select({ classroomId: classroomTeacherAssignment.classroomId })
      .from(classroomTeacherAssignment)
      .where(
        and(
          eq(classroomTeacherAssignment.teacherId, teacherId),
          eq(classroomTeacherAssignment.orgId, orgId),
          isNull(classroomTeacherAssignment.deletedAt)
        )
      ),
    db
      .select({ classroomId: timetable.classroomId })
      .from(timetable)
      .where(and(eq(timetable.teacherId, teacherId), eq(timetable.orgId, orgId), isNull(timetable.deletedAt))),
  ])

  const ids = new Set<string>()
  for (const row of assigned) if (row.classroomId) ids.add(row.classroomId)
  for (const row of scheduled) if (row.classroomId) ids.add(row.classroomId)
  return [...ids]
}

/** Student ids a teacher may see: everyone enrolled in a classroom they teach. */
export async function getTeacherStudentIds(teacherId: string, orgId: string): Promise<string[]> {
  const classroomIds = await getTeacherClassroomIds(teacherId, orgId)
  if (classroomIds.length === 0) return []

  const rows = await db
    .select({ studentId: classroomStudentEnrollment.studentId })
    .from(classroomStudentEnrollment)
    .where(
      and(
        inArray(classroomStudentEnrollment.classroomId, classroomIds),
        eq(classroomStudentEnrollment.orgId, orgId),
        isNull(classroomStudentEnrollment.deletedAt)
      )
    )

  return [...new Set(rows.map((row) => row.studentId))]
}

/** Classroom ids a student is enrolled in. */
export async function getStudentClassroomIds(studentId: string, orgId: string): Promise<string[]> {
  const rows = await db
    .select({ classroomId: classroomStudentEnrollment.classroomId })
    .from(classroomStudentEnrollment)
    .where(
      and(
        eq(classroomStudentEnrollment.studentId, studentId),
        eq(classroomStudentEnrollment.orgId, orgId),
        isNull(classroomStudentEnrollment.deletedAt)
      )
    )

  return [...new Set(rows.map((row) => row.classroomId))]
}

/**
 * Student ids visible under a scope filter.
 * `null` means "no restriction" (organization-wide).
 */
export async function visibleStudentIds(filter: ScopeFilter): Promise<string[] | null> {
  switch (filter.kind) {
    case Scope.ORG:
      return null
    case Scope.ASSIGNED:
      return getTeacherStudentIds(filter.teacherId, filter.orgId)
    case Scope.CHILDREN:
      return getChildStudentIds(filter.parentId)
    case Scope.SELF:
      return [filter.userId]
  }
}

/** Classroom ids visible under a scope filter. `null` means no restriction. */
export async function visibleClassroomIds(filter: ScopeFilter): Promise<string[] | null> {
  switch (filter.kind) {
    case Scope.ORG:
      return null
    case Scope.ASSIGNED:
      return getTeacherClassroomIds(filter.teacherId, filter.orgId)
    case Scope.CHILDREN: {
      const childIds = await getChildStudentIds(filter.parentId)
      if (childIds.length === 0) return []
      const rows = await db
        .select({ classroomId: classroomStudentEnrollment.classroomId })
        .from(classroomStudentEnrollment)
        .where(
          and(
            inArray(classroomStudentEnrollment.studentId, childIds),
            eq(classroomStudentEnrollment.orgId, filter.orgId),
            isNull(classroomStudentEnrollment.deletedAt)
          )
        )
      return [...new Set(rows.map((row) => row.classroomId))]
    }
    case Scope.SELF:
      return getStudentClassroomIds(filter.userId, filter.orgId)
  }
}

/** Teacher ids visible under a scope filter. `null` means no restriction. */
export async function visibleTeacherIds(filter: ScopeFilter): Promise<string[] | null> {
  if (filter.kind === Scope.ORG) return null
  if (filter.kind === Scope.ASSIGNED) return null

  // Families see the teachers of the classrooms they are attached to.
  const classroomIds = await visibleClassroomIds(filter)
  if (!classroomIds || classroomIds.length === 0) return []

  const [assigned, scheduled] = await Promise.all([
    db
      .select({ teacherId: classroomTeacherAssignment.teacherId })
      .from(classroomTeacherAssignment)
      .where(
        and(
          inArray(classroomTeacherAssignment.classroomId, classroomIds),
          eq(classroomTeacherAssignment.orgId, filter.orgId),
          isNull(classroomTeacherAssignment.deletedAt)
        )
      ),
    db
      .select({ teacherId: timetable.teacherId })
      .from(timetable)
      .where(
        and(inArray(timetable.classroomId, classroomIds), eq(timetable.orgId, filter.orgId), isNull(timetable.deletedAt))
      ),
  ])

  return [...new Set([...assigned, ...scheduled].map((row) => row.teacherId))]
}

/** Parent ids visible under a scope filter. `null` means no restriction. */
export async function visibleParentIds(filter: ScopeFilter): Promise<string[] | null> {
  switch (filter.kind) {
    case Scope.ORG:
      return null
    case Scope.ASSIGNED: {
      const studentIds = await getTeacherStudentIds(filter.teacherId, filter.orgId)
      if (studentIds.length === 0) return []
      const rows = await db
        .select({ parentId: parentStudentRelation.parentId })
        .from(parentStudentRelation)
        .where(inArray(parentStudentRelation.studentId, studentIds))
      return [...new Set(rows.map((row) => row.parentId))]
    }
    case Scope.CHILDREN:
      return [filter.parentId]
    case Scope.SELF:
      return [filter.userId]
  }
}

export async function assertParentVisible(filter: ScopeFilter, parentId: string): Promise<void> {
  const allowed = await visibleParentIds(filter)
  if (allowed === null) return
  if (!allowed.includes(parentId)) throw OrpcErrorHelper.forbidden('Parent is outside your scope')
}

/** Timetable ids visible under a scope filter. `null` means no restriction. */
export async function visibleTimetableIds(filter: ScopeFilter): Promise<string[] | null> {
  if (filter.kind === Scope.ORG) return null

  if (filter.kind === Scope.ASSIGNED) {
    const rows = await db
      .select({ id: timetable.id })
      .from(timetable)
      .where(
        and(eq(timetable.teacherId, filter.teacherId), eq(timetable.orgId, filter.orgId), isNull(timetable.deletedAt))
      )
    return rows.map((row) => row.id)
  }

  const classroomIds = await visibleClassroomIds(filter)
  if (!classroomIds || classroomIds.length === 0) return []

  const rows = await db
    .select({ id: timetable.id })
    .from(timetable)
    .where(and(inArray(timetable.classroomId, classroomIds), eq(timetable.orgId, filter.orgId), isNull(timetable.deletedAt)))

  return rows.map((row) => row.id)
}

/* -------------------------------------------------------------------------- */
/* Assertions — call these before acting on a specific row id                  */
/* -------------------------------------------------------------------------- */

export async function assertStudentVisible(filter: ScopeFilter, studentId: string): Promise<void> {
  const allowed = await visibleStudentIds(filter)
  if (allowed === null) return
  if (!allowed.includes(studentId)) throw OrpcErrorHelper.forbidden('Student is outside your scope')
}

export async function assertClassroomVisible(filter: ScopeFilter, classroomId: string): Promise<void> {
  const allowed = await visibleClassroomIds(filter)
  if (allowed === null) return
  if (!allowed.includes(classroomId)) throw OrpcErrorHelper.forbidden('Classroom is outside your scope')
}

export async function assertTimetableVisible(filter: ScopeFilter, timetableId: string): Promise<void> {
  const allowed = await visibleTimetableIds(filter)
  if (allowed === null) return
  if (!allowed.includes(timetableId)) throw OrpcErrorHelper.forbidden('Session is outside your scope')
}

export async function assertUserVisible(filter: ScopeFilter, targetUserId: string): Promise<void> {
  if (filter.kind === Scope.ORG) return
  if (filter.kind === Scope.SELF) {
    if (filter.userId !== targetUserId) throw OrpcErrorHelper.forbidden('User is outside your scope')
    return
  }
  if (filter.kind === Scope.CHILDREN) {
    if (filter.parentId === targetUserId) return
    const childIds = await getChildStudentIds(filter.parentId)
    if (!childIds.includes(targetUserId)) throw OrpcErrorHelper.forbidden('User is outside your scope')
    return
  }
  // ASSIGNED: own record, own students, or a parent of one of them
  if (filter.teacherId === targetUserId) return
  const studentIds = await getTeacherStudentIds(filter.teacherId, filter.orgId)
  if (studentIds.includes(targetUserId)) return
  if (studentIds.length > 0) {
    const parents = await db
      .select({ parentId: parentStudentRelation.parentId })
      .from(parentStudentRelation)
      .where(inArray(parentStudentRelation.studentId, studentIds))
    if (parents.some((row) => row.parentId === targetUserId)) return
  }
  throw OrpcErrorHelper.forbidden('User is outside your scope')
}

export async function assertAttendanceSessionVisible(filter: ScopeFilter, sessionId: string): Promise<void> {
  if (filter.kind === Scope.ORG) return

  const [row] = await db
    .select({ timetableId: attendanceSession.timetableId })
    .from(attendanceSession)
    .where(and(eq(attendanceSession.id, sessionId), eq(attendanceSession.orgId, filter.orgId)))
    .limit(1)

  if (!row) throw OrpcErrorHelper.notFound('Attendance session not found')
  await assertTimetableVisible(filter, row.timetableId)
}

export async function assertAttendanceVisible(filter: ScopeFilter, attendanceId: string): Promise<void> {
  if (filter.kind === Scope.ORG) return

  const [row] = await db
    .select({ timetableId: attendance.timetableId, studentId: attendance.studentId })
    .from(attendance)
    .where(and(eq(attendance.id, attendanceId), eq(attendance.orgId, filter.orgId)))
    .limit(1)

  if (!row) throw OrpcErrorHelper.notFound('Attendance record not found')

  // Families are scoped by student, the teaching side by session.
  if (filter.kind === Scope.CHILDREN || filter.kind === Scope.SELF) {
    await assertStudentVisible(filter, row.studentId)
    return
  }
  await assertTimetableVisible(filter, row.timetableId)
}

/**
 * A session note may only be edited or deleted by its author once the actor is
 * scoped rather than organization-wide.
 */
export async function assertSessionNoteAuthored(filter: ScopeFilter, sessionNoteId: string): Promise<void> {
  if (filter.kind === Scope.ORG) return

  const actorId = filter.kind === Scope.ASSIGNED ? filter.teacherId : filter.kind === Scope.SELF ? filter.userId : null
  if (!actorId) throw OrpcErrorHelper.forbidden('Note is outside your scope')

  const [note] = await db
    .select({ createdByUserId: sessionNote.createdByUserId, timetableId: sessionNote.timetableId })
    .from(sessionNote)
    .where(and(eq(sessionNote.id, sessionNoteId), eq(sessionNote.orgId, filter.orgId), isNull(sessionNote.deletedAt)))
    .limit(1)

  if (!note) throw OrpcErrorHelper.notFound('Session note not found')
  if (note.createdByUserId !== actorId) throw OrpcErrorHelper.forbidden('You can only modify your own notes')
}

/** Only the teaching side sees notes flagged private. */
const canSeePrivateNotes = (filter: ScopeFilter) => filter.kind === Scope.ORG || filter.kind === Scope.ASSIGNED

export async function assertSessionNoteVisible(filter: ScopeFilter, sessionNoteId: string): Promise<void> {
  if (filter.kind === Scope.ORG) return

  const [note] = await db
    .select({ timetableId: sessionNote.timetableId, isPrivate: sessionNote.isPrivate })
    .from(sessionNote)
    .where(and(eq(sessionNote.id, sessionNoteId), eq(sessionNote.orgId, filter.orgId), isNull(sessionNote.deletedAt)))
    .limit(1)

  if (!note) throw OrpcErrorHelper.notFound('Session note not found')
  if (note.isPrivate && !canSeePrivateNotes(filter)) {
    throw OrpcErrorHelper.forbidden('Note is private')
  }
  await assertTimetableVisible(filter, note.timetableId)
}

/**
 * Filters a session-note list down to what the actor may see. Returns the input
 * untouched for organization-wide actors.
 */
export async function filterSessionNotes<T extends { timetableId: string; isPrivate?: boolean }>(
  filter: ScopeFilter,
  notes: T[]
): Promise<T[]> {
  if (filter.kind === Scope.ORG) return notes

  const timetableIds = await visibleTimetableIds(filter)
  if (!timetableIds) return notes

  const allowed = new Set(timetableIds)
  const allowPrivate = canSeePrivateNotes(filter)
  return notes.filter((note) => allowed.has(note.timetableId) && (allowPrivate || !note.isPrivate))
}

export async function assertAttachmentAuthored(filter: ScopeFilter, attachmentId: string): Promise<void> {
  if (filter.kind === Scope.ORG) return

  const [attachment] = await db
    .select({ sessionNoteId: sessionNoteAttachment.sessionNoteId })
    .from(sessionNoteAttachment)
    .where(and(eq(sessionNoteAttachment.id, attachmentId), eq(sessionNoteAttachment.orgId, filter.orgId)))
    .limit(1)

  if (!attachment) throw OrpcErrorHelper.notFound('Attachment not found')
  await assertSessionNoteAuthored(filter, attachment.sessionNoteId)
}
