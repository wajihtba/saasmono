import {
  classroom,
  classroomGroup,
  classroomGroupMembership,
  classroomStudentEnrollment,
  classroomTeacherAssignment,
} from '@/db/schema/classroom'
import { educationLevel, educationSubject } from '@/db/schema/education'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { member, user } from '../../db/schema/auth'
import { parentStudentRelation } from '../../db/schema/users'

export interface CreateStudentEnrollmentData {
  studentId: string
  classroomId: string
  enrollmentDate?: Date
  createdByUserId?: string
}

export interface CreateStudentGroupMembershipData {
  studentId: string
  classroomGroupId: string
  educationSubjectId?: string
  createdByUserId?: string
}

export class StudentManagementService {
  private db: NodePgDatabase

  constructor(db: NodePgDatabase) {
    this.db = db
  }

  // Get detailed student information including parents, classroom, groups, subjects and teachers
  async getStudentById(studentId: string, orgId: string) {
    // First get basic student info and verify they belong to the organization
    const studentResult = await this.db
      .select({
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .innerJoin(member, eq(user.id, member.userId))
      .where(and(eq(user.id, studentId), eq(member.organizationId, orgId), eq(user.userType, 'student')))

    if (studentResult.length === 0) {
      throw new Error('Student not found in organization')
    }

    const student = studentResult[0]
    if (!student) {
      throw new Error('Student data not found')
    }

    // Get parent relationships
    const parents = await this.db
      .select({
        relationId: parentStudentRelation.id,
        parentId: parentStudentRelation.parentId,
        parentName: sql<string>`parent_user.name`.as('parentName'),
        parentLastName: sql<string>`parent_user.last_name`.as('parentLastName'),
        parentEmail: sql<string>`parent_user.email`.as('parentEmail'),
        relationshipType: parentStudentRelation.relationshipType,
        createdAt: parentStudentRelation.createdAt,
      })
      .from(parentStudentRelation)
      .innerJoin(sql`${user} as parent_user`, sql`parent_user.id = ${parentStudentRelation.parentId}`)
      .where(eq(parentStudentRelation.studentId, studentId))

    // Get current classroom enrollment
    const classroomEnrollment = await this.db
      .select({
        enrollmentId: classroomStudentEnrollment.id,
        classroomId: classroom.id,
        classroomName: classroom.name,
        classroomCode: classroom.code,
        academicYear: classroom.academicYear,
        capacity: classroom.capacity,
        enrollmentDate: classroomStudentEnrollment.enrollmentDate,
        enrollmentStatus: classroomStudentEnrollment.status,
        educationLevelId: educationLevel.id,
        educationLevelLevel: educationLevel.level,
        educationLevelDisplayNameAr: educationLevel.displayNameAr,
        educationLevelDisplayNameEn: educationLevel.displayNameEn,
        educationLevelDisplayNameFr: educationLevel.displayNameFr,
        educationLevelSection: educationLevel.section,
      })
      .from(classroomStudentEnrollment)
      .innerJoin(classroom, eq(classroomStudentEnrollment.classroomId, classroom.id))
      .innerJoin(educationLevel, eq(classroom.educationLevelId, educationLevel.id))
      .where(
        and(
          eq(classroomStudentEnrollment.studentId, studentId),
          eq(classroomStudentEnrollment.status, 'active'),
          isNull(classroomStudentEnrollment.deletedAt),
          isNull(classroom.deletedAt)
        )
      )

    // Get group memberships
    const groupMemberships = await this.db
      .select({
        membershipId: classroomGroupMembership.id,
        groupId: classroomGroup.id,
        groupName: classroomGroup.name,
        groupCode: classroomGroup.code,
        groupDescription: classroomGroup.description,
        groupMaxCapacity: classroomGroup.maxCapacity,
        groupIsDefault: classroomGroup.isDefault,
        membershipIsActive: classroomGroupMembership.isActive,
        membershipSubjectId: classroomGroupMembership.educationSubjectId,
        subjectName: educationSubject.name,
        subjectDisplayNameAr: educationSubject.displayNameAr,
        subjectDisplayNameEn: educationSubject.displayNameEn,
        subjectDisplayNameFr: educationSubject.displayNameFr,
      })
      .from(classroomGroupMembership)
      .innerJoin(classroomGroup, eq(classroomGroupMembership.classroomGroupId, classroomGroup.id))
      .leftJoin(educationSubject, eq(classroomGroupMembership.educationSubjectId, educationSubject.id))
      .where(
        and(
          eq(classroomGroupMembership.studentId, studentId),
          eq(classroomGroupMembership.isActive, true),
          isNull(classroomGroup.deletedAt)
        )
      )

    // Get subjects and teachers (if student is enrolled in a classroom)
    let subjectsWithTeachers: any[] = []
    if (classroomEnrollment.length > 0 && classroomEnrollment[0]) {
      const currentClassroomId = classroomEnrollment[0].classroomId

      subjectsWithTeachers = await this.db
        .select({
          subjectId: educationSubject.id,
          subjectName: educationSubject.name,
          subjectDisplayNameAr: educationSubject.displayNameAr,
          subjectDisplayNameEn: educationSubject.displayNameEn,
          subjectDisplayNameFr: educationSubject.displayNameFr,
          teacherId: sql<string>`teacher_user.id`.as('teacherId'),
          teacherName: sql<string>`teacher_user.name`.as('teacherName'),
          teacherLastName: sql<string>`teacher_user.last_name`.as('teacherLastName'),
          teacherEmail: sql<string>`teacher_user.email`.as('teacherEmail'),
          assignmentRole: classroomTeacherAssignment.role,
          isMainTeacher: classroomTeacherAssignment.isMainTeacher,
          assignmentId: classroomTeacherAssignment.id,
        })
        .from(classroomTeacherAssignment)
        .innerJoin(educationSubject, eq(classroomTeacherAssignment.educationSubjectId, educationSubject.id))
        .innerJoin(sql`${user} as teacher_user`, sql`teacher_user.id = ${classroomTeacherAssignment.teacherId}`)
        .where(
          and(
            eq(classroomTeacherAssignment.classroomId, currentClassroomId),
            isNull(classroomTeacherAssignment.deletedAt),
            isNull(educationSubject.deletedAt)
          )
        )
        .orderBy(educationSubject.name, sql`teacher_user.last_name`)
    }

    // Group subjects with their teachers
    const subjectsMap = new Map()
    subjectsWithTeachers.forEach((row) => {
      const subjectId = row.subjectId

      if (!subjectsMap.has(subjectId)) {
        subjectsMap.set(subjectId, {
          id: row.subjectId,
          name: row.subjectName,
          displayNameAr: row.subjectDisplayNameAr,
          displayNameEn: row.subjectDisplayNameEn,
          displayNameFr: row.subjectDisplayNameFr,
          teachers: [],
        })
      }

      if (row.teacherId) {
        subjectsMap.get(subjectId).teachers.push({
          id: row.teacherId,
          name: row.teacherName,
          lastName: row.teacherLastName,
          email: row.teacherEmail,
          role: row.assignmentRole,
          isMainTeacher: row.isMainTeacher === 'true',
          assignmentId: row.assignmentId,
        })
      }
    })

    const [enrollment] = classroomEnrollment

    return {
      ...student,
      parents: parents || [],
      // The joins are left joins, so every column reads as nullable; a row that
      // matched carries the columns its own table declares NOT NULL.
      classroom: enrollment
        ? {
            id: enrollment.classroomId!,
            name: enrollment.classroomName!,
            code: enrollment.classroomCode!,
            academicYear: enrollment.academicYear!,
            capacity: enrollment.capacity,
            enrollmentDate: enrollment.enrollmentDate,
            enrollmentStatus: enrollment.enrollmentStatus,
            educationLevel: {
              id: enrollment.educationLevelId!,
              level: enrollment.educationLevelLevel!,
              displayNameAr: enrollment.educationLevelDisplayNameAr,
              displayNameEn: enrollment.educationLevelDisplayNameEn,
              displayNameFr: enrollment.educationLevelDisplayNameFr,
              section: enrollment.educationLevelSection,
            },
          }
        : null,
      groups: groupMemberships.map((group) => ({
        id: group.groupId,
        name: group.groupName,
        code: group.groupCode,
        description: group.groupDescription,
        maxCapacity: group.groupMaxCapacity,
        isDefault: group.groupIsDefault,
        isActive: group.membershipIsActive,
        subject: group.membershipSubjectId ? {
          id: group.membershipSubjectId,
          name: group.subjectName,
          displayNameAr: group.subjectDisplayNameAr,
          displayNameEn: group.subjectDisplayNameEn,
          displayNameFr: group.subjectDisplayNameFr,
        } : null,
        membershipId: group.membershipId,
      })),
      subjects: Array.from(subjectsMap.values()),
    }
  }

  // Get list of students with basic info and classroom
  async getStudentsList(
    orgId: string,
    filters?: { classroomId?: string; educationLevelId?: string }
  ) {
    const conditions = [eq(member.organizationId, orgId), eq(user.userType, 'student')]

    // Add filtering conditions if provided
    if (filters?.classroomId) {
      conditions.push(eq(classroom.id, filters.classroomId))
    }
    if (filters?.educationLevelId) {
      conditions.push(eq(educationLevel.id, filters.educationLevelId))
    }

    let query = this.db
      .select({
        studentId: user.id,
        studentName: user.name,
        studentLastName: user.lastName,
        studentEmail: user.email,
        studentCreatedAt: user.createdAt,
        studentUpdatedAt: user.updatedAt,
        classroomId: classroom.id,
        classroomName: classroom.name,
        classroomCode: classroom.code,
        academicYear: classroom.academicYear,
        enrollmentId: classroomStudentEnrollment.id,
        enrollmentDate: classroomStudentEnrollment.enrollmentDate,
        enrollmentStatus: classroomStudentEnrollment.status,
        educationLevelId: educationLevel.id,
        educationLevelLevel: educationLevel.level,
        educationLevelDisplayNameAr: educationLevel.displayNameAr,
      })
      .from(user)
      .innerJoin(member, eq(user.id, member.userId))
      .leftJoin(classroomStudentEnrollment,
        and(
          eq(user.id, classroomStudentEnrollment.studentId),
          eq(classroomStudentEnrollment.status, 'active'),
          isNull(classroomStudentEnrollment.deletedAt)
        )
      )
      .leftJoin(classroom,
        and(
          eq(classroomStudentEnrollment.classroomId, classroom.id),
          isNull(classroom.deletedAt)
        )
      )
      .leftJoin(educationLevel, eq(classroom.educationLevelId, educationLevel.id))

    const results = await query
      .where(and(...conditions))
      .orderBy(user.lastName, user.name)

    return results.map((row) => ({
      id: row.studentId,
      name: row.studentName,
      lastName: row.studentLastName,
      email: row.studentEmail,
      userType: 'student' as const,
      createdAt: row.studentCreatedAt,
      updatedAt: row.studentUpdatedAt,
      classroom: row.classroomId ? {
        id: row.classroomId,
        name: row.classroomName!,
        code: row.classroomCode!,
        academicYear: row.academicYear!,
        enrollmentDate: row.enrollmentDate!,
        enrollmentStatus: row.enrollmentStatus!,
        educationLevel: {
          id: row.educationLevelId!,
          level: row.educationLevelLevel!,
          displayNameAr: row.educationLevelDisplayNameAr,
        },
      } : null,
    }))
  }

  // Enroll student in classroom
  async createStudentEnrollment(orgId: string, data: CreateStudentEnrollmentData) {
    // Verify student belongs to organization
    const studentMember = await this.db
      .select()
      .from(member)
      .where(and(eq(member.userId, data.studentId), eq(member.organizationId, orgId)))

    if (studentMember.length === 0) {
      throw new Error('Student not found in organization')
    }

    // Verify classroom exists and belongs to organization
    const classroomResult = await this.db
      .select()
      .from(classroom)
      .where(and(eq(classroom.id, data.classroomId), eq(classroom.orgId, orgId), isNull(classroom.deletedAt)))

    if (classroomResult.length === 0) {
      throw new Error('Classroom not found in organization')
    }

    // Check if student is already enrolled in this classroom
    const existingEnrollment = await this.db
      .select()
      .from(classroomStudentEnrollment)
      .where(
        and(
          eq(classroomStudentEnrollment.studentId, data.studentId),
          eq(classroomStudentEnrollment.classroomId, data.classroomId),
          eq(classroomStudentEnrollment.status, 'active'),
          isNull(classroomStudentEnrollment.deletedAt)
        )
      )

    if (existingEnrollment.length > 0) {
      throw new Error('Student is already enrolled in this classroom')
    }

    const result = await this.db
      .insert(classroomStudentEnrollment)
      .values({
        studentId: data.studentId,
        classroomId: data.classroomId,
        enrollmentDate: data.enrollmentDate || new Date(),
        status: 'active',
        orgId: orgId,
        createdByUserId: data.createdByUserId,
      })
      .returning()

    const [record] = result
    if (!record) {
      throw new Error('Failed to create student enrollment')
    }

    return record
  }

  // Add student to group
  async createStudentGroupMembership(orgId: string, data: CreateStudentGroupMembershipData) {
    // Verify student belongs to organization
    const studentMember = await this.db
      .select()
      .from(member)
      .where(and(eq(member.userId, data.studentId), eq(member.organizationId, orgId)))

    if (studentMember.length === 0) {
      throw new Error('Student not found in organization')
    }

    // Verify group exists and belongs to organization
    const groupResult = await this.db
      .select()
      .from(classroomGroup)
      .where(and(eq(classroomGroup.id, data.classroomGroupId), eq(classroomGroup.orgId, orgId), isNull(classroomGroup.deletedAt)))

    if (groupResult.length === 0) {
      throw new Error('Classroom group not found in organization')
    }

    // Check if student is already in this group for the same subject (or general)
    const existingMembership = await this.db
      .select()
      .from(classroomGroupMembership)
      .where(
        and(
          eq(classroomGroupMembership.studentId, data.studentId),
          eq(classroomGroupMembership.classroomGroupId, data.classroomGroupId),
          eq(classroomGroupMembership.isActive, true),
          data.educationSubjectId
            ? eq(classroomGroupMembership.educationSubjectId, data.educationSubjectId)
            : isNull(classroomGroupMembership.educationSubjectId)
        )
      )

    if (existingMembership.length > 0) {
      throw new Error('Student is already a member of this group')
    }

    const result = await this.db
      .insert(classroomGroupMembership)
      .values({
        studentId: data.studentId,
        classroomGroupId: data.classroomGroupId,
        educationSubjectId: data.educationSubjectId,
        isActive: true,
        orgId: orgId,
        createdByUserId: data.createdByUserId,
      })
      .returning()

    const [record] = result
    if (!record) {
      throw new Error('Failed to create group membership')
    }

    return record
  }

  // Remove student from classroom
  async updateStudentEnrollmentStatus(orgId: string, enrollmentId: string, status: string, updatedByUserId?: string) {
    // Verify enrollment exists in organization
    const existingEnrollment = await this.db
      .select()
      .from(classroomStudentEnrollment)
      .innerJoin(classroom, eq(classroomStudentEnrollment.classroomId, classroom.id))
      .where(
        and(
          eq(classroomStudentEnrollment.id, enrollmentId),
          eq(classroom.orgId, orgId),
          isNull(classroomStudentEnrollment.deletedAt)
        )
      )

    if (existingEnrollment.length === 0) {
      throw new Error('Enrollment not found in organization')
    }

    const result = await this.db
      .update(classroomStudentEnrollment)
      .set({
        status: status,
        updatedByUserId: updatedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(classroomStudentEnrollment.id, enrollmentId))
      .returning()

    const [record] = result
    if (!record) {
      throw new Error('Failed to update enrollment status')
    }

    return record
  }

  // Remove student from group
  async updateStudentGroupMembershipStatus(orgId: string, membershipId: string, isActive: boolean, updatedByUserId?: string) {
    // Verify membership exists in organization
    const existingMembership = await this.db
      .select()
      .from(classroomGroupMembership)
      .innerJoin(classroomGroup, eq(classroomGroupMembership.classroomGroupId, classroomGroup.id))
      .where(
        and(
          eq(classroomGroupMembership.id, membershipId),
          eq(classroomGroup.orgId, orgId)
        )
      )

    if (existingMembership.length === 0) {
      throw new Error('Group membership not found in organization')
    }

    const result = await this.db
      .update(classroomGroupMembership)
      .set({
        isActive: isActive,
        updatedByUserId: updatedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(classroomGroupMembership.id, membershipId))
      .returning()

    const [record] = result
    if (!record) {
      throw new Error('Failed to update group membership status')
    }

    return record
  }
}

// Factory function to create service instance
export function createStudentManagementService(db: NodePgDatabase) {
  return new StudentManagementService(db)
}