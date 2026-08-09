import { classroom, classroomStudentEnrollment } from '@/db/schema/classroom'
import { educationLevel } from '@/db/schema/education'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { member, user } from '../../db/schema/auth'
import { parentStudentRelation } from '../../db/schema/users'

export interface CreateParentStudentRelationData {
  parentId: string
  studentId: string
  relationshipType?: string
  createdByUserId?: string
}

export class ParentManagementService {
  private db: NodePgDatabase

  constructor(db: NodePgDatabase) {
    this.db = db
  }

  // Get parents with their children (students) information
  async getParentsList(orgId: string) {
    const conditions = [eq(member.organizationId, orgId), eq(user.userType, 'parent')]

    const results = await this.db
      .select({
        parentId: user.id,
        parentName: user.name,
        parentLastName: user.lastName,
        parentEmail: user.email,
        parentCreatedAt: user.createdAt,
        parentUpdatedAt: user.updatedAt,
        relationId: parentStudentRelation.id,
        relationshipType: parentStudentRelation.relationshipType,
        relationCreatedAt: parentStudentRelation.createdAt,
        studentId: sql<string>`student_user.id`.as('studentId'),
        studentName: sql<string>`student_user.name`.as('studentName'),
        studentLastName: sql<string>`student_user.last_name`.as('studentLastName'),
        studentEmail: sql<string>`student_user.email`.as('studentEmail'),
        studentCreatedAt: sql<Date>`student_user.created_at`.as('studentCreatedAt'),
        classroomId: classroom.id,
        classroomName: classroom.name,
        classroomCode: classroom.code,
        classroomAcademicYear: classroom.academicYear,
        enrollmentStatus: classroomStudentEnrollment.status,
        enrollmentDate: classroomStudentEnrollment.enrollmentDate,
        educationLevelId: educationLevel.id,
        educationLevelLevel: educationLevel.level,
        educationLevelDisplayNameAr: educationLevel.displayNameAr,
      })
      .from(user)
      .innerJoin(member, eq(user.id, member.userId))
      .leftJoin(parentStudentRelation, eq(user.id, parentStudentRelation.parentId))
      .leftJoin(sql`${user} as student_user`, sql`student_user.id = ${parentStudentRelation.studentId}`)
      .leftJoin(classroomStudentEnrollment,
        and(
          sql`student_user.id = ${classroomStudentEnrollment.studentId}`,
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
      .where(and(...conditions))
      .orderBy(user.lastName, user.name)

    // Group results by parent
    const parentsMap = new Map()

    results.forEach((row) => {
      const parentId = row.parentId

      if (!parentsMap.has(parentId)) {
        parentsMap.set(parentId, {
          id: row.parentId,
          name: row.parentName,
          lastName: row.parentLastName,
          email: row.parentEmail,
          userType: 'parent' as const,
          createdAt: row.parentCreatedAt,
          updatedAt: row.parentUpdatedAt,
          children: [],
        })
      }

      // If there's a student relation, add it
      if (row.studentId && row.relationId) {
        const parent = parentsMap.get(parentId)

        // Check if child already exists for this parent
        let child = parent.children.find((c: any) => c.id === row.studentId)

        if (!child) {
          child = {
            id: row.studentId,
            name: row.studentName,
            lastName: row.studentLastName,
            email: row.studentEmail,
            createdAt: row.studentCreatedAt,
            relationshipType: row.relationshipType,
            relationId: row.relationId,
            relationCreatedAt: row.relationCreatedAt,
            classroom: null,
          }
          parent.children.push(child)
        }

        // Add classroom info if available
        if (row.classroomId && !child.classroom) {
          child.classroom = {
            id: row.classroomId,
            name: row.classroomName,
            code: row.classroomCode,
            academicYear: row.classroomAcademicYear,
            enrollmentStatus: row.enrollmentStatus,
            enrollmentDate: row.enrollmentDate,
            educationLevel: {
              id: row.educationLevelId,
              level: row.educationLevelLevel,
              displayNameAr: row.educationLevelDisplayNameAr,
            },
          }
        }
      }
    })

    return Array.from(parentsMap.values())
  }

  // Get detailed parent information including all children
  async getParentById(parentId: string, orgId: string) {
    // First get basic parent info and verify they belong to the organization
    const parentResult = await this.db
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
      .where(and(eq(user.id, parentId), eq(member.organizationId, orgId), eq(user.userType, 'parent')))

    if (parentResult.length === 0) {
      throw new Error('Parent not found in organization')
    }

    const parent = parentResult[0]
    if (!parent) {
      throw new Error('Parent data not found')
    }

    // Get all children relationships with their details
    const childrenResults = await this.db
      .select({
        relationId: parentStudentRelation.id,
        relationshipType: parentStudentRelation.relationshipType,
        relationCreatedAt: parentStudentRelation.createdAt,
        studentId: sql<string>`student_user.id`.as('studentId'),
        studentName: sql<string>`student_user.name`.as('studentName'),
        studentLastName: sql<string>`student_user.last_name`.as('studentLastName'),
        studentEmail: sql<string>`student_user.email`.as('studentEmail'),
        studentCreatedAt: sql<Date>`student_user.created_at`.as('studentCreatedAt'),
        classroomId: classroom.id,
        classroomName: classroom.name,
        classroomCode: classroom.code,
        classroomAcademicYear: classroom.academicYear,
        enrollmentStatus: classroomStudentEnrollment.status,
        enrollmentDate: classroomStudentEnrollment.enrollmentDate,
        educationLevelId: educationLevel.id,
        educationLevelLevel: educationLevel.level,
        educationLevelDisplayNameAr: educationLevel.displayNameAr,
      })
      .from(parentStudentRelation)
      .innerJoin(sql`${user} as student_user`, sql`student_user.id = ${parentStudentRelation.studentId}`)
      .leftJoin(classroomStudentEnrollment,
        and(
          sql`student_user.id = ${classroomStudentEnrollment.studentId}`,
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
      .where(eq(parentStudentRelation.parentId, parentId))
      .orderBy(sql`student_user.name`, sql`student_user.last_name`)

    // Group children data
    const childrenMap = new Map()
    childrenResults.forEach((row) => {
      const studentId = row.studentId

      if (!childrenMap.has(studentId)) {
        childrenMap.set(studentId, {
          id: row.studentId,
          name: row.studentName,
          lastName: row.studentLastName,
          email: row.studentEmail,
          createdAt: row.studentCreatedAt,
          relationshipType: row.relationshipType,
          relationId: row.relationId,
          relationCreatedAt: row.relationCreatedAt,
          classroom: null,
        })
      }

      const child = childrenMap.get(studentId)

      // Add classroom info if available
      if (row.classroomId && !child.classroom) {
        child.classroom = {
          id: row.classroomId,
          name: row.classroomName,
          code: row.classroomCode,
          academicYear: row.classroomAcademicYear,
          enrollmentStatus: row.enrollmentStatus,
          enrollmentDate: row.enrollmentDate,
          educationLevel: {
            id: row.educationLevelId,
            level: row.educationLevelLevel,
            displayNameAr: row.educationLevelDisplayNameAr,
          },
        }
      }
    })

    return {
      ...parent,
      // The query filters on `user_type = 'parent'`, so the column's wide union
      // narrows here rather than at the route's output schema.
      userType: 'parent' as const,
      children: Array.from(childrenMap.values()),
    }
  }

  // Parent-Student Relation CRUD
  async createParentStudentRelation(orgId: string, data: CreateParentStudentRelationData) {
    // Verify parent belongs to organization
    const parentMember = await this.db
      .select()
      .from(member)
      .where(and(eq(member.userId, data.parentId), eq(member.organizationId, orgId)))

    if (parentMember.length === 0) {
      throw new Error('Parent not found in organization')
    }

    // Verify student belongs to organization
    const studentMember = await this.db
      .select()
      .from(member)
      .where(and(eq(member.userId, data.studentId), eq(member.organizationId, orgId)))

    if (studentMember.length === 0) {
      throw new Error('Student not found in organization')
    }

    // Check if relation already exists
    const existingRelation = await this.db
      .select()
      .from(parentStudentRelation)
      .where(
        and(
          eq(parentStudentRelation.parentId, data.parentId),
          eq(parentStudentRelation.studentId, data.studentId)
        )
      )

    if (existingRelation.length > 0) {
      throw new Error('Parent-student relation already exists')
    }

    const result = await this.db
      .insert(parentStudentRelation)
      .values({
        parentId: data.parentId,
        studentId: data.studentId,
        relationshipType: data.relationshipType || 'parent',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    const [record] = result
    if (!record) {
      throw new Error('Failed to create parent-student relation')
    }

    return record
  }

  async updateParentStudentRelation(orgId: string, relationId: string, data: Partial<CreateParentStudentRelationData>) {
    // Verify relation exists and both parent and student belong to organization
    const existingRelation = await this.db
      .select({
        id: parentStudentRelation.id,
        parentId: parentStudentRelation.parentId,
        studentId: parentStudentRelation.studentId,
      })
      .from(parentStudentRelation)
      .where(eq(parentStudentRelation.id, relationId))

    const [relation] = existingRelation
    if (!relation) {
      throw new Error('Parent-student relation not found')
    }

    // Verify both users belong to organization
    const parentMember = await this.db
      .select()
      .from(member)
      .where(and(eq(member.userId, relation.parentId), eq(member.organizationId, orgId)))

    const studentMember = await this.db
      .select()
      .from(member)
      .where(and(eq(member.userId, relation.studentId), eq(member.organizationId, orgId)))

    if (parentMember.length === 0 || studentMember.length === 0) {
      throw new Error('Relation not found in organization')
    }

    const result = await this.db
      .update(parentStudentRelation)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(parentStudentRelation.id, relationId))
      .returning()

    const [record] = result
    if (!record) {
      throw new Error('Failed to update parent-student relation')
    }

    return record
  }

  async deleteParentStudentRelation(orgId: string, relationId: string) {
    // Verify relation exists and belongs to organization
    const existingRelation = await this.db
      .select({
        id: parentStudentRelation.id,
        parentId: parentStudentRelation.parentId,
        studentId: parentStudentRelation.studentId,
      })
      .from(parentStudentRelation)
      .where(eq(parentStudentRelation.id, relationId))

    const [relation] = existingRelation
    if (!relation) {
      throw new Error('Parent-student relation not found')
    }

    // Verify both users belong to organization
    const parentMember = await this.db
      .select()
      .from(member)
      .where(and(eq(member.userId, relation.parentId), eq(member.organizationId, orgId)))

    const studentMember = await this.db
      .select()
      .from(member)
      .where(and(eq(member.userId, relation.studentId), eq(member.organizationId, orgId)))

    if (parentMember.length === 0 || studentMember.length === 0) {
      throw new Error('Relation not found in organization')
    }

    // Hard delete for relations (no soft delete needed)
    await this.db
      .delete(parentStudentRelation)
      .where(eq(parentStudentRelation.id, relationId))

    return { success: true }
  }
}

// Factory function to create service instance
export function createParentManagementService(db: NodePgDatabase) {
  return new ParentManagementService(db)
}