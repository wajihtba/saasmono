import { user } from '@/db/schema/auth'
import { attendance } from '@/db/schema/attendance'
import { classroom, classroomStudentEnrollment, classroomGroup, classroomGroupMembership } from '@/db/schema/classroom'
import { educationSubject } from '@/db/schema/education'
import { timetable } from '@/db/schema/timetable'
import type {
  AttendanceListItem,
  AttendanceQuery,
  AttendanceSummary,
  CreateAttendanceInput,
  CreateBulkAttendanceInput,
  StudentAttendanceSummary,
  StudentBasicInfo,
  UpdateAttendanceInput
} from '@/types/attendance'
import { and, count, eq, gte, isNull, lte, sql } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'

export class AttendanceManagementService {
  private db: NodePgDatabase

  constructor(db: NodePgDatabase) {
    this.db = db
  }

  async getStudentsByTimetable(timetableId: string, orgId: string): Promise<StudentBasicInfo[]> {
    // Get timetable with classroom and classroomGroup
    const timetableResult = await this.db
      .select({
        classroomId: timetable.classroomId,
        classroomGroupId: timetable.classroomGroupId,
      })
      .from(timetable)
      .where(and(
        eq(timetable.id, timetableId),
        eq(timetable.orgId, orgId),
        isNull(timetable.deletedAt)
      ))

    if (!timetableResult[0]) {
      throw new Error('Timetable not found')
    }

    const { classroomId, classroomGroupId } = timetableResult[0]

    // Get students based on classroom or classroomGroup
    if (classroomId) {
      // Fetch from classroomStudentEnrollment
      const students = await this.db
        .select({
          id: user.id,
          name: user.name,
          lastName: user.lastName,
        })
        .from(classroomStudentEnrollment)
        .innerJoin(user, eq(classroomStudentEnrollment.studentId, user.id))
        .where(and(
          eq(classroomStudentEnrollment.classroomId, classroomId),
          eq(classroomStudentEnrollment.status, 'active'),
          eq(classroomStudentEnrollment.orgId, orgId),
          isNull(classroomStudentEnrollment.deletedAt)
        ))
        .orderBy(user.name, user.lastName)

      return students as StudentBasicInfo[]
    } else if (classroomGroupId) {
      // Fetch from classroomGroupMembership
      const students = await this.db
        .select({
          id: user.id,
          name: user.name,
          lastName: user.lastName,
        })
        .from(classroomGroupMembership)
        .innerJoin(user, eq(classroomGroupMembership.studentId, user.id))
        .where(and(
          eq(classroomGroupMembership.classroomGroupId, classroomGroupId),
          eq(classroomGroupMembership.isActive, true),
          eq(classroomGroupMembership.orgId, orgId)
        ))
        .orderBy(user.name, user.lastName)

      return students as StudentBasicInfo[]
    }

    throw new Error('Timetable must have either classroomId or classroomGroupId')
  }

  async getAttendancesList(orgId: string, query?: AttendanceQuery) {
    // This method now returns attendance sessions grouped by timetable
    // We need to query attendanceSession table instead
    const { attendanceSession } = await import('@/db/schema/attendance')

    let whereConditions = [
      eq(attendanceSession.orgId, orgId)
    ]

    // Add query filters
    if (query?.timetableId) {
      whereConditions.push(eq(timetable.id, query.timetableId))
    }
    if (query?.startDate) {
      whereConditions.push(gte(timetable.startDateTime, query.startDate))
    }
    if (query?.endDate) {
      whereConditions.push(lte(timetable.startDateTime, query.endDate))
    }
    if (query?.classroomId) {
      whereConditions.push(eq(timetable.classroomId, query.classroomId))
    }
    if (query?.classroomGroupId) {
      whereConditions.push(eq(timetable.classroomGroupId, query.classroomGroupId))
    }
    if (query?.educationSubjectId) {
      whereConditions.push(eq(timetable.educationSubjectId, query.educationSubjectId))
    }
    if (query?.createdByUserType) {
      whereConditions.push(eq(user.userType, query.createdByUserType))
    }
    if (query?.attendanceCreatedStartDate) {
      whereConditions.push(gte(attendanceSession.createdAt, query.attendanceCreatedStartDate))
    }
    if (query?.attendanceCreatedEndDate) {
      whereConditions.push(lte(attendanceSession.createdAt, query.attendanceCreatedEndDate))
    }

    const results = await this.db
      .select({
        sessionId: attendanceSession.id,
        sessionTimetableId: attendanceSession.timetableId,
        sessionCreatedAt: attendanceSession.createdAt,
        // Timetable data
        timetableId: timetable.id,
        timetableTitle: timetable.title,
        timetableStartDateTime: timetable.startDateTime,
        timetableEndDateTime: timetable.endDateTime,
        timetableClassroomId: timetable.classroomId,
        timetableClassroomGroupId: timetable.classroomGroupId,
        // Classroom data
        classroomId: classroom.id,
        classroomName: classroom.name,
        // Classroom group data
        classroomGroupId: classroomGroup.id,
        classroomGroupName: classroomGroup.name,
        // Creator data
        creatorId: user.id,
        creatorName: user.name,
        creatorLastName: user.lastName,
        creatorUserType: user.userType,
      })
      .from(attendanceSession)
      .innerJoin(timetable, eq(attendanceSession.timetableId, timetable.id))
      .leftJoin(classroom, eq(timetable.classroomId, classroom.id))
      .leftJoin(classroomGroup, eq(timetable.classroomGroupId, classroomGroup.id))
      .leftJoin(user, eq(attendanceSession.createdByUserId, user.id))
      .where(and(...whereConditions))
      .orderBy(timetable.startDateTime)

    // For each session, count students marked
    const sessionsWithCounts = await Promise.all(
      results.map(async (row) => {
        const attendanceCount = await this.db
          .select({ count: count(attendance.id) })
          .from(attendance)
          .where(and(
            eq(attendance.attendanceSessionId, row.sessionId),
            isNull(attendance.deletedAt)
          ))

        return {
          id: row.sessionId,
          timetableId: row.sessionTimetableId,
          timetable: {
            id: row.timetableId!,
            title: row.timetableTitle!,
            startDateTime: row.timetableStartDateTime!,
            endDateTime: row.timetableEndDateTime!,
          },
          classroom: row.classroomId ? {
            id: row.classroomId,
            name: row.classroomName!,
          } : null,
          classroomGroup: row.classroomGroupId ? {
            id: row.classroomGroupId,
            name: row.classroomGroupName!,
          } : null,
          createdBy: {
            id: row.creatorId!,
            name: row.creatorName!,
            lastName: row.creatorLastName!,
            userType: row.creatorUserType!,
          },
          studentsMarked: attendanceCount[0]?.count || 0,
          createdAt: row.sessionCreatedAt,
        }
      })
    )

    return sessionsWithCounts
  }

  async getAttendanceSessionById(sessionId: string, orgId: string) {
    const { attendanceSession } = await import('@/db/schema/attendance')

    // Get session with timetable, classroom/group, and creator info
    const sessionResult = await this.db
      .select({
        sessionId: attendanceSession.id,
        sessionTimetableId: attendanceSession.timetableId,
        sessionGeneralNotes: attendanceSession.generalNotes,
        sessionOrgId: attendanceSession.orgId,
        sessionCreatedAt: attendanceSession.createdAt,
        sessionUpdatedAt: attendanceSession.updatedAt,
        // Timetable data
        timetableId: timetable.id,
        timetableTitle: timetable.title,
        timetableStartDateTime: timetable.startDateTime,
        timetableEndDateTime: timetable.endDateTime,
        // Classroom data
        classroomId: classroom.id,
        classroomName: classroom.name,
        // Classroom group data
        classroomGroupId: classroomGroup.id,
        classroomGroupName: classroomGroup.name,
        // Creator data
        creatorId: user.id,
        creatorName: user.name,
        creatorLastName: user.lastName,
        creatorUserType: user.userType,
      })
      .from(attendanceSession)
      .innerJoin(timetable, eq(attendanceSession.timetableId, timetable.id))
      .leftJoin(classroom, eq(timetable.classroomId, classroom.id))
      .leftJoin(classroomGroup, eq(timetable.classroomGroupId, classroomGroup.id))
      .leftJoin(user, eq(attendanceSession.createdByUserId, user.id))
      .where(and(
        eq(attendanceSession.id, sessionId),
        eq(attendanceSession.orgId, orgId)
      ))

    if (!sessionResult[0]) {
      throw new Error('Attendance session not found')
    }

    const session = sessionResult[0]

    // Get all attendance records for this session
    const attendances = await this.db
      .select({
        attendanceId: attendance.id,
        attendanceStudentId: attendance.studentId,
        attendanceStatus: attendance.status,
        attendanceNote: attendance.note,
        // Student data
        studentId: user.id,
        studentName: user.name,
        studentLastName: user.lastName,
      })
      .from(attendance)
      .innerJoin(user, eq(attendance.studentId, user.id))
      .where(and(
        eq(attendance.attendanceSessionId, sessionId),
        isNull(attendance.deletedAt)
      ))
      .orderBy(user.name, user.lastName)

    return {
      id: session.sessionId,
      timetableId: session.sessionTimetableId,
      generalNotes: session.sessionGeneralNotes,
      orgId: session.sessionOrgId,
      createdAt: session.sessionCreatedAt,
      updatedAt: session.sessionUpdatedAt,
      timetable: {
        id: session.timetableId!,
        title: session.timetableTitle!,
        startDateTime: session.timetableStartDateTime!,
        endDateTime: session.timetableEndDateTime!,
      },
      classroom: session.classroomId ? {
        id: session.classroomId,
        name: session.classroomName!,
      } : null,
      classroomGroup: session.classroomGroupId ? {
        id: session.classroomGroupId,
        name: session.classroomGroupName!,
      } : null,
      createdBy: {
        id: session.creatorId!,
        name: session.creatorName!,
        lastName: session.creatorLastName!,
        userType: session.creatorUserType!,
      },
      attendances: attendances.map(a => ({
        id: a.attendanceId,
        studentId: a.attendanceStudentId,
        status: a.attendanceStatus,
        note: a.attendanceNote,
        student: {
          id: a.studentId!,
          name: a.studentName!,
          lastName: a.studentLastName!,
        },
      })),
    }
  }

  async getAttendanceById(attendanceId: string, orgId: string) {
    const result = await this.db
      .select({
        attendanceId: attendance.id,
        attendanceStatus: attendance.status,
        attendanceNote: attendance.note,
        attendanceStudentId: attendance.studentId,
        attendanceTimetableId: attendance.timetableId,
        attendanceOrgId: attendance.orgId,
        attendanceMarkedAt: attendance.markedAt,
        attendanceArrivedAt: attendance.arrivedAt,
        attendanceCreatedAt: attendance.createdAt,
        attendanceUpdatedAt: attendance.updatedAt,
        attendanceDeletedAt: attendance.deletedAt,
        // Student data
        studentId: user.id,
        studentName: user.name,
        studentLastName: user.lastName,
        studentEmail: user.email,
        // Session instance data
        sessionId: timetable.id,
        sessionTitle: timetable.title,
        sessionStartDateTime: timetable.startDateTime,
        sessionEndDateTime: timetable.endDateTime,
      })
      .from(attendance)
      .leftJoin(user, eq(attendance.studentId, user.id))
      .leftJoin(timetable, eq(attendance.timetableId, timetable.id))
      .where(and(
        eq(attendance.id, attendanceId),
        eq(attendance.orgId, orgId),
        isNull(attendance.deletedAt)
      ))

    if (!result[0] || result.length === 0) {
      throw new Error('Attendance record not found')
    }

    const row = result[0]

    return {
      id: row.attendanceId,
      status: row.attendanceStatus,
      note: row.attendanceNote,
      studentId: row.attendanceStudentId,
      timetableId: row.attendanceTimetableId,
      orgId: row.attendanceOrgId,
      markedAt: row.attendanceMarkedAt,
      arrivedAt: row.attendanceArrivedAt,
      createdAt: row.attendanceCreatedAt,
      updatedAt: row.attendanceUpdatedAt,
      deletedAt: row.attendanceDeletedAt,
      student: {
        id: row.studentId!,
        name: row.studentName!,
        lastName: row.studentLastName!,
        email: row.studentEmail!,
      },
      timetable: {
        id: row.sessionId!,
        title: row.sessionTitle!,
        startDateTime: row.sessionStartDateTime!,
        endDateTime: row.sessionEndDateTime!,
      },
    }
  }

  async createAttendance(input: CreateAttendanceInput, orgId: string, userId: string) {
    // Check if attendance already exists for this student and session
    const existingAttendance = await this.db
      .select({ id: attendance.id })
      .from(attendance)
      .where(and(
        eq(attendance.studentId, input.studentId),
        eq(attendance.timetableId, input.timetableId),
        eq(attendance.orgId, orgId),
        isNull(attendance.deletedAt)
      ))

    if (existingAttendance.length > 0) {
      throw new Error('Attendance already exists for this student and session')
    }

    const result = await this.db
      .insert(attendance)
      .values({
        status: input.status,
        note: input.note || null,
        studentId: input.studentId,
        timetableId: input.timetableId,
        arrivedAt: input.arrivedAt || null,
        orgId,
        createdByUserId: userId,
      })
      .returning({
        id: attendance.id,
        status: attendance.status,
        note: attendance.note,
        studentId: attendance.studentId,
        timetableId: attendance.timetableId,
        orgId: attendance.orgId,
        markedAt: attendance.markedAt,
        arrivedAt: attendance.arrivedAt,
        createdAt: attendance.createdAt,
        updatedAt: attendance.updatedAt,
        deletedAt: attendance.deletedAt,
      })

    if (!result[0]) {
      throw new Error('Failed to create attendance record')
    }

    return result[0]
  }

  async createBulkAttendance(input: CreateBulkAttendanceInput, orgId: string, userId: string) {
    const { attendanceSession } = await import('@/db/schema/attendance')

    // Check if attendance session already exists for this timetable
    const existingSession = await this.db
      .select({ id: attendanceSession.id })
      .from(attendanceSession)
      .where(and(
        eq(attendanceSession.timetableId, input.timetableId),
        eq(attendanceSession.orgId, orgId)
      ))

    let sessionId: string

    const [existing] = existingSession

    if (existing) {
      // Update existing session
      sessionId = existing.id
      await this.db
        .update(attendanceSession)
        .set({
          generalNotes: (input as any).generalNotes || null,
          updatedByUserId: userId,
        })
        .where(eq(attendanceSession.id, sessionId))
    } else {
      // Create new session
      const newSession = await this.db
        .insert(attendanceSession)
        .values({
          timetableId: input.timetableId,
          generalNotes: (input as any).generalNotes || null,
          orgId,
          createdByUserId: userId,
        })
        .returning({ id: attendanceSession.id })

      const [created] = newSession
      if (!created) {
        throw new Error('Failed to create attendance session')
      }
      sessionId = created.id
    }

    // Check for existing attendance records
    const existingAttendances = await this.db
      .select({
        studentId: attendance.studentId,
        id: attendance.id,
      })
      .from(attendance)
      .where(and(
        eq(attendance.attendanceSessionId, sessionId),
        isNull(attendance.deletedAt)
      ))

    const existingMap = new Map(existingAttendances.map(a => [a.studentId, a.id]))

    // Separate new vs existing records
    const newAttendances = input.attendances.filter(a => !existingMap.has(a.studentId))
    const updateAttendances = input.attendances.filter(a => existingMap.has(a.studentId))

    // Insert new records
    let created = 0
    if (newAttendances.length > 0) {
      const attendanceRecords = newAttendances.map(a => ({
        status: a.status,
        note: a.note || null,
        studentId: a.studentId,
        timetableId: input.timetableId,
        attendanceSessionId: sessionId,
        arrivedAt: a.arrivedAt || null,
        orgId,
        createdByUserId: userId,
      }))

      const result = await this.db
        .insert(attendance)
        .values(attendanceRecords)
        .returning({ id: attendance.id })

      created = result.length
    }

    // Update existing records
    let updated = 0
    for (const att of updateAttendances) {
      const attId = existingMap.get(att.studentId)!
      await this.db
        .update(attendance)
        .set({
          status: att.status,
          note: att.note || null,
          arrivedAt: att.arrivedAt || null,
          updatedByUserId: userId,
        })
        .where(eq(attendance.id, attId))
      updated++
    }

    return {
      sessionId,
      created,
      updated,
      total: input.attendances.length,
    }
  }

  async updateAttendance(attendanceId: string, input: UpdateAttendanceInput, orgId: string, userId: string) {
    const result = await this.db
      .update(attendance)
      .set({
        ...input,
        updatedByUserId: userId,
      })
      .where(and(
        eq(attendance.id, attendanceId),
        eq(attendance.orgId, orgId),
        isNull(attendance.deletedAt)
      ))
      .returning({
        id: attendance.id,
        status: attendance.status,
        note: attendance.note,
        studentId: attendance.studentId,
        timetableId: attendance.timetableId,
        orgId: attendance.orgId,
        markedAt: attendance.markedAt,
        arrivedAt: attendance.arrivedAt,
        createdAt: attendance.createdAt,
        updatedAt: attendance.updatedAt,
        deletedAt: attendance.deletedAt,
      })

    if (!result[0] || result.length === 0) {
      throw new Error('Attendance record not found or failed to update')
    }

    return result[0]
  }

  async deleteAttendance(attendanceId: string, orgId: string, userId: string) {
    const result = await this.db
      .update(attendance)
      .set({
        deletedAt: new Date(),
        deletedByUserId: userId,
      })
      .where(and(
        eq(attendance.id, attendanceId),
        eq(attendance.orgId, orgId),
        isNull(attendance.deletedAt)
      ))
      .returning({ id: attendance.id })

    if (!result[0] || result.length === 0) {
      throw new Error('Attendance record not found or failed to delete')
    }

    return { success: true }
  }

  async getSessionAttendanceSummary(timetableId: string, orgId: string): Promise<AttendanceSummary> {
    // Get session info and total enrolled students
    const sessionInfo = await this.db
      .select({
        sessionId: timetable.id,
        sessionTitle: timetable.title,
        sessionStartDateTime: timetable.startDateTime,
        classroomId: timetable.classroomId,
      })
      .from(timetable)
      .where(and(
        eq(timetable.id, timetableId),
        eq(timetable.orgId, orgId),
        isNull(timetable.deletedAt)
      ))

    if (!sessionInfo[0]) {
      throw new Error('Session not found')
    }

    // Get attendance counts
    const attendanceCounts = await this.db
      .select({
        status: attendance.status,
        count: count(attendance.id),
      })
      .from(attendance)
      .where(and(
        eq(attendance.timetableId, timetableId),
        eq(attendance.orgId, orgId),
        isNull(attendance.deletedAt)
      ))
      .groupBy(attendance.status)

    // Get total enrolled students in the classroom
    let totalStudents = 0
    if (sessionInfo[0].classroomId) {
      const enrolledStudents = await this.db
        .select({ count: count(classroomStudentEnrollment.studentId) })
        .from(classroomStudentEnrollment)
        .where(and(
          eq(classroomStudentEnrollment.classroomId, sessionInfo[0].classroomId),
          eq(classroomStudentEnrollment.status, 'active'),
          eq(classroomStudentEnrollment.orgId, orgId),
          isNull(classroomStudentEnrollment.deletedAt)
        ))

      totalStudents = enrolledStudents[0]?.count || 0
    }

    const countMap = new Map(attendanceCounts.map(ac => [ac.status, ac.count]))
    const totalMarked = attendanceCounts.reduce((sum, ac) => sum + ac.count, 0)

    return {
      timetableId,
      sessionTitle: sessionInfo[0].sessionTitle,
      sessionStartDateTime: sessionInfo[0].sessionStartDateTime,
      totalStudents,
      presentCount: countMap.get('PRESENT') || 0,
      absentCount: countMap.get('ABSENT') || 0,
      lateCount: countMap.get('LATE') || 0,
      excusedCount: countMap.get('EXCUSED') || 0,
      sickCount: countMap.get('SICK') || 0,
      notMarkedCount: totalStudents - totalMarked,
    }
  }

  async getStudentAttendanceSummary(studentId: string, orgId: string, startDate?: Date, endDate?: Date): Promise<StudentAttendanceSummary> {
    let whereConditions = [
      eq(attendance.studentId, studentId),
      eq(attendance.orgId, orgId),
      isNull(attendance.deletedAt)
    ]

    if (startDate) {
      whereConditions.push(gte(timetable.startDateTime, startDate))
    }
    if (endDate) {
      whereConditions.push(lte(timetable.startDateTime, endDate))
    }

    // Get student info
    const studentInfo = await this.db
      .select({
        id: user.id,
        name: user.name,
        lastName: user.lastName,
      })
      .from(user)
      .where(eq(user.id, studentId))

    if (!studentInfo[0]) {
      throw new Error('Student not found')
    }

    // Get attendance counts by status
    const attendanceCounts = await this.db
      .select({
        status: attendance.status,
        count: count(attendance.id),
      })
      .from(attendance)
      .leftJoin(timetable, eq(attendance.timetableId, timetable.id))
      .where(and(...whereConditions))
      .groupBy(attendance.status)

    const countMap = new Map(attendanceCounts.map(ac => [ac.status, ac.count]))
    const totalSessions = attendanceCounts.reduce((sum, ac) => sum + ac.count, 0)

    const presentCount = countMap.get('PRESENT') || 0
    const absentCount = countMap.get('ABSENT') || 0
    const lateCount = countMap.get('LATE') || 0
    const excusedCount = countMap.get('EXCUSED') || 0
    const sickCount = countMap.get('SICK') || 0

    const attendanceRate = totalSessions > 0 ? (presentCount + lateCount) / totalSessions * 100 : 0

    return {
      studentId,
      studentName: studentInfo[0].name,
      studentLastName: studentInfo[0].lastName,
      totalSessions,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      sickCount,
      attendanceRate: Math.round(attendanceRate * 100) / 100, // Round to 2 decimal places
    }
  }
}

// Factory function to create service instance
export function createAttendanceManagementService(db: NodePgDatabase) {
  return new AttendanceManagementService(db)
}