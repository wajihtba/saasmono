# RBAC Plan — Roles, Routes, Permissions

Status: **implemented for `apps/server` + `apps/web`**. Sections 2–6 describe what
now exists in the code; section 9 lists what shipped and what is still open.
Section 8 still needs your answers — the matrix was built on the defaults noted
there.

---

## 1. Current State (before this change)

| Field | Type today | Values today | Enforced? |
|---|---|---|---|
| `user.userType` | `text` | `student \| teacher \| parent \| staff` | No — display only |
| `user.role` | `text` | better-auth `admin` plugin | Only on better-auth's own `/admin/*` endpoints |
| `member.role` | `text` default `'member'` | seeded with **userType values** (`teacher`, `student`…) | No |

Enforcement today is exactly two gates:

- `apps/server/src/lib/orpc.ts:9` — `requireAuth`: session exists or `UNAUTHORIZED`.
- `apps/server/src/lib/errors/orpc-errors.ts:66` — `getOrgId`: reads `session.activeOrganizationId`.

**Consequence: any authenticated user can call any of the 71 management procedures inside their org.** A student can `updateUser`, `deleteTeacherAssignment`, `generateTicket`.

Frontend: `apps/web/src/middleware.ts` checks cookie presence on `/dashboard/*`; `apps/web/src/config/dashboard.ts` has zero role filtering.

### Existing defects found while mapping

| # | Defect | Location |
|---|---|---|
| D1 | `member.role` seeded with userType strings, breaking better-auth org plugin's `owner\|admin\|member` contract | `src/db/seeds/dev/users.ts:137` |
| D2 | Schema comment on `member.role` documents the wrong contract | `src/db/schema/auth.ts:91` |
| D3 | `createParentStudentRelation` + `deleteParentStudentRelation` defined **twice** on identical paths (`user.ts:94,113` and `parents.ts:59,106`) — route collision | `src/routers/managment/` |
| D4 | `updateUser` allows changing `userType` — i.e. self-promotion once auth is per-role | `src/routers/managment/user.ts:42` |
| D5 | No self-profile route; `updateUser` is the only path, so it must serve both admin-edit and self-edit | `src/routers/managment/user.ts` |
| D6 | `raqeem-backend` has identical auth-only `orpc.ts` — same exposure | `apps/raqeem-backend/src/lib/orpc.ts` |

---

## 2. Proposed Role Enum

**Single source of truth: `member.role`** (per-organization). `user.userType` becomes a domain label only (or is dropped — see Q1). `user.role` is reserved for **platform** superadmin, not tenant roles.

### 2.1 The enum, shared by every app

`packages/rbac/src/roles.ts` — one definition, consumed by server and web:

```ts
export enum Role {
  OWNER   = 'owner',
  ADMIN   = 'admin',
  STAFF   = 'staff',
  TEACHER = 'teacher',
  PARENT  = 'parent',
  STUDENT = 'student',
}

export const ROLE_VALUES = ['owner', 'admin', 'staff', 'teacher', 'parent', 'student'] as const
export const USER_TYPE_VALUES = ['staff', 'teacher', 'parent', 'student'] as const
```

`apps/server/src/db/schema/enums.ts` turns those same values into real Postgres
enum types — no free-text role column survives:

```ts
import { ROLE_VALUES, USER_TYPE_VALUES } from '@repo/rbac'

export const orgRoleEnum = pgEnum('org_role', ROLE_VALUES)          // member.role, invitation.role
export const userTypeEnum = pgEnum('user_type', USER_TYPE_VALUES)   // user.user_type
export const platformRoleEnum = pgEnum('platform_role', ['user', 'admin']) // user.role
```

`user_type` stays a union type rather than a TS enum: it is compared against zod
literals throughout the response schemas and never used for authorization. The
column is still a Postgres enum.

### 2.2 Scope and permission enums

`apps/server/src/types/rbac.ts`:

```ts

export enum Scope {
  ORG      = 'org',       // every row in the organization
  ASSIGNED = 'assigned',  // rows tied to the actor's assignments
  CHILDREN = 'children',  // rows tied to the actor's linked students
  SELF     = 'self',      // rows where the actor is the subject
  NONE     = 'none',      // denied
}

export enum Permission {
  // attendance
  ATTENDANCE_READ    = 'attendance:read',
  ATTENDANCE_WRITE   = 'attendance:write',
  ATTENDANCE_DELETE  = 'attendance:delete',
  // classroom
  CLASSROOM_READ     = 'classroom:read',
  CLASSROOM_WRITE    = 'classroom:write',
  // curriculum
  CURRICULUM_READ    = 'curriculum:read',
  CURRICULUM_WRITE   = 'curriculum:write',
  // late pass
  LATEPASS_READ      = 'latepass:read',
  LATEPASS_ISSUE     = 'latepass:issue',
  LATEPASS_VALIDATE  = 'latepass:validate',
  LATEPASS_CONFIG    = 'latepass:config',
  // rooms
  ROOM_READ          = 'room:read',
  ROOM_WRITE         = 'room:write',
  ROOM_DELETE        = 'room:delete',
  // session notes
  NOTE_READ          = 'note:read',
  NOTE_WRITE         = 'note:write',
  NOTE_DELETE        = 'note:delete',
  // people
  STUDENT_READ       = 'student:read',
  STUDENT_WRITE      = 'student:write',
  TEACHER_READ       = 'teacher:read',
  TEACHER_WRITE      = 'teacher:write',
  PARENT_READ        = 'parent:read',
  PARENT_WRITE       = 'parent:write',
  USER_READ          = 'user:read',
  USER_WRITE         = 'user:write',
  // timetable
  TIMETABLE_READ     = 'timetable:read',
  TIMETABLE_WRITE    = 'timetable:write',
  TIMETABLE_DELETE   = 'timetable:delete',
  // misc
  FILE_UPLOAD        = 'file:upload',
  ORG_SETTINGS       = 'org:settings',
}
```

Zod at the boundary: `z.enum(ROLE_VALUES)` or `z.nativeEnum(Role)` — never `z.string()`.

### 2.3 Role definitions

| Enum | DB value | Arabic | Meaning |
|---|---|---|---|
| `Role.OWNER` | `owner` | مالك المؤسسة | Institution owner. Full control incl. destructive + billing. Exactly one per org. |
| `Role.ADMIN` | `admin` | مدير | School director. Everything except org deletion/ownership transfer. |
| `Role.STAFF` | `staff` | إداري / قيّم | Administrative staff — daily operations (attendance, tickets, enrollment). No destructive deletes. |
| `Role.TEACHER` | `teacher` | أستاذ | Scoped to own assignments: own timetables, own students, own notes. |
| `Role.PARENT` | `parent` | ولي أمر | Read-only, scoped to linked children. |
| `Role.STUDENT` | `student` | طالب | Read-only, scoped to self. |

---

## 3. Permission Matrix (role → permission → scope)

| Permission | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|
| `ATTENDANCE_READ` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| `ATTENDANCE_WRITE` | ORG | ORG | ORG | ASSIGNED | — | — |
| `ATTENDANCE_DELETE` | ORG | ORG | — | — | — | — |
| `CLASSROOM_READ` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| `CLASSROOM_WRITE` | ORG | ORG | ORG | — | — | — |
| `CURRICULUM_READ` | ORG | ORG | ORG | ORG | ORG | ORG |
| `CURRICULUM_WRITE` | ORG | ORG | — | — | — | — |
| `LATEPASS_READ` | ORG | ORG | ORG | — | CHILDREN | SELF |
| `LATEPASS_ISSUE` | ORG | ORG | ORG | — | — | — |
| `LATEPASS_VALIDATE` | ORG | ORG | ORG | ORG | — | — |
| `LATEPASS_CONFIG` | ORG | ORG | — | — | — | — |
| `ROOM_READ` | ORG | ORG | ORG | ORG | — | — |
| `ROOM_WRITE` | ORG | ORG | ORG | — | — | — |
| `ROOM_DELETE` | ORG | ORG | — | — | — | — |
| `NOTE_READ` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| `NOTE_WRITE` | ORG | ORG | ORG | ASSIGNED | — | — |
| `NOTE_DELETE` | ORG | ORG | — | SELF (own-authored) | — | — |
| `STUDENT_READ` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| `STUDENT_WRITE` | ORG | ORG | ORG | — | — | — |
| `TEACHER_READ` | ORG | ORG | ORG | ORG | CHILDREN | SELF |
| `TEACHER_WRITE` | ORG | ORG | ORG | — | — | — |
| `PARENT_READ` | ORG | ORG | ORG | ASSIGNED | SELF | — |
| `PARENT_WRITE` | ORG | ORG | ORG | — | — | — |
| `USER_READ` | ORG | ORG | ORG | ASSIGNED | SELF | SELF |
| `USER_WRITE` | ORG | ORG | — | SELF | SELF | SELF |
| `TIMETABLE_READ` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| `TIMETABLE_WRITE` | ORG | ORG | ORG | — | — | — |
| `TIMETABLE_DELETE` | ORG | ORG | — | — | — | — |
| `FILE_UPLOAD` | ORG | ORG | ORG | ORG | — | — |
| `ORG_SETTINGS` | ORG | ORG | — | — | — | — |

Legend: **ORG** = all rows in org · **ASSIGNED** = only own assignments · **CHILDREN** = only linked children · **SELF** = only own record · **—** = `FORBIDDEN`

---

## 4. Full API Route Matrix

71 management procedures + 2 root. Same legend as above.

### 4.1 Root — `src/routers/index.ts`

| Method | Path | Procedure | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|---|
| GET | `/health` | `healthCheck` | public | public | public | public | public | public |
| GET | `/private` | `privateData` | ORG | ORG | ORG | SELF | SELF | SELF |

### 4.2 Attendances — `managment/attendances.ts` (10)

| Method | Path | Procedure | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|---|
| GET | `/management/attendances/timetables/{timetableId}/students` | `getStudentsByTimetable` | ORG | ORG | ORG | ASSIGNED | — | — |
| GET | `/management/attendances` | `getAttendancesList` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| GET | `/management/attendances/sessions/{sessionId}` | `getAttendanceSessionById` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| GET | `/management/attendances/{attendanceId}` | `getAttendanceById` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| POST | `/management/attendances` | `createAttendance` | ORG | ORG | ORG | ASSIGNED | — | — |
| POST | `/management/attendances/bulk` | `createBulkAttendance` | ORG | ORG | ORG | ASSIGNED | — | — |
| PUT | `/management/attendances/{attendanceId}` | `updateAttendance` | ORG | ORG | ORG | ASSIGNED | — | — |
| DELETE | `/management/attendances/{attendanceId}` | `deleteAttendance` | ORG | ORG | — | — | — | — |
| GET | `/management/attendances/sessions/{timetableId}/summary` | `getSessionAttendanceSummary` | ORG | ORG | ORG | ASSIGNED | — | — |
| GET | `/management/attendances/students/{studentId}/summary` | `getStudentAttendanceSummary` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |

### 4.3 Classrooms — `managment/classrooms.ts` (3)

| Method | Path | Procedure | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|---|
| GET | `/management/classrooms` | `getClassroomsList` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| GET | `/management/classrooms/{classroomId}` | `getClassroomById` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| GET | `/management/classroom-groups` | `getClassroomGroupsList` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |

> No create/update/delete classroom routes exist yet. Reserve `CLASSROOM_WRITE` for when they land.

### 4.4 Curriculum — `managment/curriculum.ts` (8) — all read-only reference data

| Method | Path | Procedure | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|---|
| GET | `/management/curriculum/education-subjects` | `getEducationSubjectsList` | ORG | ORG | ORG | ORG | ORG | ORG |
| GET | `/management/curriculum/education-subjects/{subjectId}` | `getEducationSubjectById` | ORG | ORG | ORG | ORG | ORG | ORG |
| GET | `/management/curriculum/education-levels` | `getEducationLevelsList` | ORG | ORG | ORG | ORG | ORG | ORG |
| GET | `/management/curriculum/education-levels/{levelId}` | `getEducationLevelById` | ORG | ORG | ORG | ORG | ORG | ORG |
| GET | `/management/curriculum/institution-levels` | `getInstitutionLevelsList` | ORG | ORG | ORG | ORG | ORG | ORG |
| GET | `/management/curriculum/institution-levels/{levelId}` | `getInstitutionLevelById` | ORG | ORG | ORG | ORG | ORG | ORG |
| GET | `/management/curriculum/education-level-subjects` | `getEducationLevelSubjectsList` | ORG | ORG | ORG | ORG | ORG | ORG |
| GET | `/management/curriculum/education-level-subjects/{associationId}` | `getEducationLevelSubjectById` | ORG | ORG | ORG | ORG | ORG | ORG |

### 4.5 Late-Pass Tickets — `managment/late-pass-tickets.ts` (11)

| Method | Path | Procedure | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|---|
| GET | `/management/late-pass-tickets/config` | `getConfig` | ORG | ORG | ORG | — | — | — |
| PUT | `/management/late-pass-tickets/config` | `updateConfig` | ORG | ORG | — | — | — | — |
| GET | `/management/late-pass-tickets/eligible-students` | `getEligibleStudents` | ORG | ORG | ORG | — | — | — |
| GET | `/management/late-pass-tickets/students/{studentId}/upcoming-timetables` | `getStudentUpcomingTimetables` | ORG | ORG | ORG | — | — | — |
| POST | `/management/late-pass-tickets` | `generateTicket` | ORG | ORG | ORG | — | — | — |
| GET | `/management/late-pass-tickets/{ticketId}` | `getTicketById` | ORG | ORG | ORG | — | CHILDREN | SELF |
| GET | `/management/late-pass-tickets` | `getTickets` | ORG | ORG | ORG | — | CHILDREN | SELF |
| POST | `/management/late-pass-tickets/cancel` | `cancelTicket` | ORG | ORG | ORG | — | — | — |
| POST | `/management/late-pass-tickets/validate-qr` | `validateQRCode` | ORG | ORG | ORG | ORG | — | — |
| POST | `/management/late-pass-tickets/use` | `useTicket` | ORG | ORG | ORG | ORG | — | — |
| POST | `/management/late-pass-tickets/expire-old` | `expireOldTickets` | ORG | ORG | — | — | — | — |

> `expireOldTickets` is a maintenance job. Consider moving it off the user-facing router to a cron/service token (Q5).

### 4.6 Parents — `managment/parents.ts` (5)

| Method | Path | Procedure | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|---|
| GET | `/management/parents/list` | `getParentsList` | ORG | ORG | ORG | ASSIGNED | — | — |
| GET | `/management/parents/{parentId}` | `getParentById` | ORG | ORG | ORG | ASSIGNED | SELF | — |
| POST | `/management/parent-student-relations` | `createParentStudentRelation` | ORG | ORG | ORG | — | — | — |
| PUT | `/management/parent-student-relations/{relationId}` | `updateParentStudentRelation` | ORG | ORG | ORG | — | — | — |
| DELETE | `/management/parent-student-relations/{relationId}` | `deleteParentStudentRelation` | ORG | ORG | — | — | — | — |

### 4.7 Rooms — `managment/rooms.ts` (5)

| Method | Path | Procedure | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|---|
| GET | `/management/rooms` | `getRoomsList` | ORG | ORG | ORG | ORG | — | — |
| GET | `/management/rooms/{roomId}` | `getRoomById` | ORG | ORG | ORG | ORG | — | — |
| POST | `/management/rooms` | `createRoom` | ORG | ORG | ORG | — | — | — |
| PUT | `/management/rooms/{roomId}` | `updateRoom` | ORG | ORG | ORG | — | — | — |
| DELETE | `/management/rooms/{roomId}` | `deleteRoom` | ORG | ORG | — | — | — | — |

### 4.8 Session Notes (كراس القسم) — `managment/sessionNotes.ts` (7)

| Method | Path | Procedure | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|---|
| GET | `/management/session-notes` | `getSessionNotesList` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| GET | `/management/session-notes/{sessionNoteId}` | `getSessionNoteById` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| POST | `/management/session-notes` | `createSessionNote` | ORG | ORG | ORG | ASSIGNED | — | — |
| PUT | `/management/session-notes/{sessionNoteId}` | `updateSessionNote` | ORG | ORG | ORG | ASSIGNED (own-authored) | — | — |
| DELETE | `/management/session-notes/{sessionNoteId}` | `deleteSessionNote` | ORG | ORG | — | SELF (own-authored) | — | — |
| POST | `/management/session-note-attachments` | `createSessionNoteAttachment` | ORG | ORG | ORG | ASSIGNED | — | — |
| DELETE | `/management/session-note-attachments/{attachmentId}` | `deleteSessionNoteAttachment` | ORG | ORG | — | SELF (own-authored) | — | — |

### 4.9 Students — `managment/students.ts` (6)

| Method | Path | Procedure | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|---|
| GET | `/management/students/{studentId}` | `getStudentById` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| GET | `/management/students/list` | `getStudentsList` | ORG | ORG | ORG | ASSIGNED | — | — |
| POST | `/management/student-enrollments` | `createStudentEnrollment` | ORG | ORG | ORG | — | — | — |
| PUT | `/management/student-enrollments/{enrollmentId}/status` | `updateStudentEnrollmentStatus` | ORG | ORG | ORG | — | — | — |
| POST | `/management/student-group-memberships` | `createStudentGroupMembership` | ORG | ORG | ORG | — | — | — |
| PUT | `/management/student-group-memberships/{membershipId}/status` | `updateStudentGroupMembershipStatus` | ORG | ORG | ORG | — | — | — |

### 4.10 Teachers — `managment/teachers.ts` (4)

| Method | Path | Procedure | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|---|
| GET | `/management/teachers/list` | `getTeachersList` | ORG | ORG | ORG | ORG | CHILDREN | SELF |
| POST | `/management/teacher-assignments` | `createTeacherAssignment` | ORG | ORG | ORG | — | — | — |
| PUT | `/management/teacher-assignments/{assignmentId}` | `updateTeacherAssignment` | ORG | ORG | ORG | — | — | — |
| DELETE | `/management/teacher-assignments/{assignmentId}` | `deleteTeacherAssignment` | ORG | ORG | — | — | — | — |

### 4.11 Timetable — `managment/timetable.ts` (6)

| Method | Path | Procedure | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|---|
| GET | `/management/session-instances` | `getTimetablesList` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| GET | `/management/session-instances/{timetableId}` | `getTimetableById` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |
| POST | `/management/session-instances` | `createTimetable` | ORG | ORG | ORG | — | — | — |
| PUT | `/management/session-instances/{timetableId}` | `updateTimetable` | ORG | ORG | ORG | — | — | — |
| DELETE | `/management/session-instances/{timetableId}` | `deleteTimetable` | ORG | ORG | — | — | — | — |
| POST | `/management/session-instances/generate-image` | `generateTimetableImage` | ORG | ORG | ORG | ASSIGNED | CHILDREN | SELF |

### 4.12 Upload — `managment/upload.ts` (1)

| Method | Path | Procedure | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|---|
| POST | `/management/upload-temp-file` | `uploadTempFile` | ORG | ORG | ORG | ORG | — | — |

### 4.13 Users — `managment/user.ts` (5)

| Method | Path | Procedure | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|---|
| GET | `/management/users/{userId}` | `getUserById` | ORG | ORG | ORG | ASSIGNED | SELF | SELF |
| PUT | `/management/users/{userId}` | `updateUser` | ORG | ORG | — | SELF | SELF | SELF |
| GET | `/management/users` | `listUsers` | ORG | ORG | ORG | — | — | — |
| POST | `/management/parent-student-relations` | `createParentStudentRelation` ⚠️ **dup of 4.6** | ORG | ORG | ORG | — | — | — |
| DELETE | `/management/parent-student-relations/{relationId}` | `deleteParentStudentRelation` ⚠️ **dup of 4.6** | ORG | ORG | — | — | — | — |

> ⚠️ D3: delete the duplicates from `user.ts`, keep `parents.ts` as owner of parent-student relations.
> ⚠️ D4: `updateUser` must **strip `userType`/role from input** unless actor is OWNER/ADMIN. Otherwise a student promotes itself.
> ⚠️ D5: split into `updateUser` (admin) + `updateMyProfile` (self, name/email/avatar only).

---

## 5. Web Route Matrix — `apps/web/src/app`

| Route | Nav label | OWNER | ADMIN | STAFF | TEACHER | PARENT | STUDENT |
|---|---|---|---|---|---|---|---|
| `/` | landing | public | public | public | public | public | public |
| `/login` | login | public | public | public | public | public | public |
| `/dashboard` | لوحة التحكم | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/classrooms` | الأقسام | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/timetable` | جدول الحصص | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/session-notes` | كراس القسم | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/session-notes/new` | — | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/dashboard/session-notes/[noteId]` | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/session-notes/[noteId]/edit` | — | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/dashboard/attendances` | سجلات الحضور | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/attendances/new` | — | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/dashboard/attendances/[sessionId]` | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/attendances/[sessionId]/edit` | — | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/dashboard/late-pass-tickets` | تذاكر الدخول | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `/dashboard/late-pass-tickets/generate` | — | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/dashboard/institution-settings/teachers` | المعلمون | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/dashboard/institution-settings/students` | الطلاب | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/dashboard/institution-settings/parents` | أولياء الأمور | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/dashboard/institution-settings/curriculum` | المناهج | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/dashboard/user/settings` | الإعدادات | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Nav config items in `src/config/dashboard.ts` get an `allowedRoles: Role[]` field and the sidebar filters on it. **Nav filtering is cosmetic — the API matrix in §4 is the actual control.**

---

## 6. Implementation Sketch

### 6.1 Context carries the role

`src/lib/context.ts` — resolve the member row alongside the session:

```ts
const member = session?.session.activeOrganizationId
  ? await db.query.member.findFirst({
      where: and(
        eq(schema.member.userId, session.user.id),
        eq(schema.member.organizationId, session.session.activeOrganizationId),
      ),
    })
  : null

return { session, role: member?.role as Role | undefined, orgId: member?.organizationId }
```

### 6.2 Procedure builders

`src/lib/orpc.ts` — every management route declares the permission it needs, and
the middleware hands the resolved scope down to the handler:

```ts
export const authorized = (permission: Permission) => publicProcedure.use(requirePermission(permission))
```

`requirePermission` rejects before any handler runs when the role's scope for
that permission is `Scope.NONE`. Role-list builders (`ownerProcedure`,
`adminProcedure`, `staffProcedure`, `teacherProcedure`) also exist for routes
that are about who you are rather than what you touch.

Usage: `getStudentById: authorized(Permission.STUDENT_READ)`.

### 6.3 Scope resolution

`src/lib/scope.ts` turns the scope into a row filter:

```ts
type ScopeFilter =
  | { kind: Scope.ORG;      orgId: string }
  | { kind: Scope.ASSIGNED; orgId: string; teacherId: string }
  | { kind: Scope.CHILDREN; orgId: string; parentId: string }
  | { kind: Scope.SELF;     orgId: string; userId: string }
```

Handlers use two families of helper:

- `visibleStudentIds` / `visibleClassroomIds` / `visibleTimetableIds` /
  `visibleTeacherIds` / `visibleParentIds` — return the allowed ids, or `null`
  for organization-wide actors, and list routes filter on them.
- `assertStudentVisible` / `assertClassroomVisible` / `assertTimetableVisible` /
  `assertAttendanceVisible` / `assertAttendanceSessionVisible` /
  `assertSessionNoteVisible` / `assertSessionNoteAuthored` /
  `assertAttachmentAuthored` / `assertUserVisible` / `assertParentVisible` —
  throw `FORBIDDEN` before a single-row route acts on an id outside the scope.

A teacher's reach is derived from `classroom_teacher_assignment` plus the
sessions they actually teach (`timetable.teacher_id`); a parent's from
`parent_student_relation`.

`OrpcErrorHelper.handleServiceError` now passes `ORPCError` through untouched, so
an authorization failure raised inside a handler's `try` block cannot be
rewritten into a 500.

---

## 7. Migration Steps

1. ✅ `packages/rbac` + `apps/server/src/db/schema/enums.ts` — enum definitions.
2. ✅ `apps/server/src/db/migrations/0001_pale_starhawk.sql`. Hand-edited on top
   of the generated file: legacy free-text values (`member` from better-auth, a
   stale `admin` user type) are normalized **before** the `USING` casts, and the
   `member.role` default is dropped and re-set around the type change. Without
   that prelude the migration fails on the first unexpected row.
3. ✅ Seeds emit `Role` values; the dev seed now creates one user per role
   (`admin@school.com` = owner, `director@school.com` = admin, `staff@`, ten
   `teacher{n}@`, ten `student{n}@`, five `parent{n}@`).
4. ✅ D3 duplicate parent-relation routes removed from `user.ts`; D4 `updateUser`
   refuses a `userType` change from anyone narrower than organization-wide; D5
   added `PUT /management/users/me`.
5. ✅ All 71 management procedures carry a `Permission`.
6. ✅ Scope filters applied to every ASSIGNED / CHILDREN / SELF row in §4.
7. ✅ `src/types/rbac.test.ts` — 187 assertions pinning the §3 matrix, including
   "no two non-admin roles have the same permission set". Per-route 403 tests are
   still open (see §9).
8. ✅ Web: nav filtered from the same route table the guard uses, plus a redirect
   in the dashboard layout.
9. ⛔ `apps/raqeem-backend` deliberately untouched — see §9.

---

## 9. What Shipped

**New files**

| File | Purpose |
|---|---|
| `packages/rbac/src/roles.ts` | `Role` enum, `ROLE_VALUES`, `USER_TYPE_VALUES`, Arabic labels |
| `packages/rbac/src/routes.ts` | `DASHBOARD_ROUTE_ROLES`, `rolesForRoute`, `canAccessRoute` |
| `apps/server/src/db/schema/enums.ts` | `org_role`, `user_type`, `platform_role` Postgres enums |
| `apps/server/src/types/rbac.ts` | `Scope`, `Permission`, `ROLE_PERMISSIONS`, `scopeFor`, `can` |
| `apps/server/src/types/rbac.test.ts` | Executable form of §3 |
| `apps/server/src/lib/permissions.ts` | better-auth org access control for the 6 roles |
| `apps/server/src/lib/scope.ts` | `ScopeFilter` + the visibility helpers |
| `apps/web/src/hooks/use-org-role.ts` | Reads the active membership role |
| `apps/web/src/lib/nav-access.ts` | Filters sidebar / mobile nav / drawer |

**Changed** — `schema/auth.ts` (three columns now enums), `lib/auth.ts`
(`organization({ ac, roles, creatorRole: Role.OWNER })` so better-auth stops
writing its built-in `member` role), `lib/context.ts` (resolves the membership
role per request), `lib/orpc.ts`, `lib/errors/orpc-errors.ts`, all 12 management
routers, the dev seed, the test helper, and `apps/web/src/app/dashboard/layout.tsx`.

**Verification**

- Server typecheck: 32 errors, identical to the pre-change baseline — no new ones.
- Web typecheck: 24 errors, identical to baseline.
- `src/types/rbac.test.ts`: 187 passed.
- Both apps build (`pnpm --filter server build`, `pnpm --filter web build`).
- Middleware exercised end-to-end, one context per role, against real procedures:

  | route | owner | admin | staff | teacher | parent | student | no role |
  |---|---|---|---|---|---|---|---|
  | `deleteRoom` | reached | reached | **403** | **403** | **403** | **403** | **403** |
  | `createRoom` | reached | reached | reached | **403** | **403** | **403** | **403** |
  | `getRoomsList` | reached | reached | reached | reached | **403** | **403** | **403** |
  | `getClassroomsList` | reached | reached | reached | reached | reached | reached | **403** |
  | `listUsers` | reached | reached | reached | **403** | **403** | **403** | **403** |
  | `updateUser` sending `userType` for self | reached | reached | **403** | **403** | **403** | **403** | **403** |

  The last row is D4: a staff/teacher/parent/student editing their own record is
  refused the moment the payload tries to change `userType`.
- Existing suites in isolation, before vs after, byte-identical results:
  teachers 6 failed/2 passed, students 9 failed/5 passed, user 10 failed/6 passed.
  **Those suites were already red before this work** — they share one database and
  the whole-suite run is order-dependent. Not caused by, and not fixed by, RBAC.

**Still open**

- Per-route 403 tests for each role (needs the shared-DB flakiness fixed first,
  and a way to set `activeOrganizationId` in the test session).
- `apps/raqeem-backend` has the same auth-only exposure (D6) but a completely
  different domain (cases, clients, courts, trials). Its role list is a separate
  decision — say the word and it gets its own matrix rather than this one.
- List routes filter in the handler rather than in SQL. Correct, but it reads the
  organization-wide rows first; push the id lists into the service queries if a
  large organization makes that slow.

---

## 8. Open Questions — needs your validation

Built on the assumptions in the right column. Change any answer and the matrix
plus §4 change with it.

| # | Question | Assumed |
|---|---|---|
| Q1 | Keep `user.userType` at all, or is `member.role` alone enough? A user could be teacher in one org and parent in another — `member.role` handles that, `user.userType` does not. | Kept as a domain label; `member.role` is the only authorization input |
| Q2 | Is 6 roles right? Do you need to split STAFF (e.g. `قيّم` surveillant vs `كاتب` secretary) with different ticket/attendance rights? | 6 roles, one STAFF |
| Q3 | Do PARENT and STUDENT actually log into the web dashboard today, or is that native-app only / future? | They can; §5 grants them read-only pages |
| Q4 | Should TEACHER see the full student list (`/management/students/list`) or only students in own classrooms? | Only own classrooms (ASSIGNED) |
| Q5 | `expireOldTickets` — cron/service token instead of a user route? | Left as a route, restricted to owner/admin |
| Q6 | Should STAFF be able to delete (attendance, rooms, timetables)? | No — deletes are owner/admin only |
| Q7 | Multi-role per user in one org (e.g. teacher who is also a parent at the same school) — support it, or one role per membership? | One role per membership, matching the schema |
