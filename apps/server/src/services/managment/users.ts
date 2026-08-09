import { and, eq, isNull, sql } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { member, user } from '../../db/schema/auth'
import { parentStudentRelation, teacherEducationSubjectLevelAssignment } from '../../db/schema/users'
import {
  type ParentStudentRelation,
  type UserListItem,
  type UserResponse,
  type UserType,
  type UserUpdateInput,
} from '../../types/user'

export interface CreateParentStudentRelationData {
  parentId: string
  studentId: string
  relationshipType?: string
}


export class UserManagementService {
  private db: NodePgDatabase

  constructor(db: NodePgDatabase) {
    this.db = db
  }

  // 1. Simple CRUD operations for users
  async updateUser(userId: string, orgId: string, updateData: UserUpdateInput) {
    // Verify user belongs to organization
    const userMembership = await this.db
      .select()
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, orgId)))

    if (userMembership.length === 0) {
      throw new Error('User not found in organization')
    }

    const [updatedUser] = await this.db
      .update(user)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning()

    return updatedUser as UserUpdateInput
  }

  async getUserById(userId: string, orgId: string) {
    const result = await this.db
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
      .where(and(eq(user.id, userId), eq(member.organizationId, orgId)))

    if (result.length === 0) {
      throw new Error('User not found in organization')
    }

    const userData = result[0]
    if (!userData) {
      throw new Error('User data not found')
    }

    // Get parent-children relationships (where user is parent OR child)
    const parentChildrenRelations = await this.db
      .select()
      .from(parentStudentRelation)
      .where(sql`(${parentStudentRelation.parentId} = ${userId} OR ${parentStudentRelation.studentId} = ${userId})`)

    // Get teacher assignments (only if user is a teacher)
    const teacherAssignments = await this.db
      .select()
      .from(teacherEducationSubjectLevelAssignment)
      .where(
        and(
          eq(teacherEducationSubjectLevelAssignment.teacherId, userId),
          eq(teacherEducationSubjectLevelAssignment.orgId, orgId)
        )
      )
      .orderBy(teacherEducationSubjectLevelAssignment.createdAt)

    return {
      ...userData,
      userType: userData.userType as UserType,
      parentChildrenRelations: parentChildrenRelations || [],
      teacherAssignments: teacherAssignments || [],
    } as unknown as UserResponse
  }

  // 2. List users filtered by type
  async listUsersByType(orgId: string, userType?: UserType) {
    const conditions = [eq(member.organizationId, orgId)]

    if (userType) {
      conditions.push(eq(user.userType, userType))
    }

    const users = await this.db
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
      .where(and(...conditions))
      .orderBy(user.lastName, user.name)

    return users as UserListItem[]
  }


  // 3. Parent-Student Relation CRUD
  async createParentStudentRelation(orgId: string, data: CreateParentStudentRelationData) {
    // Verify both parent and student belong to organization and get their details
    const [parentResult, studentResult] = await Promise.all([
      this.db
        .select({
          id: user.id,
          name: user.name,
          lastName: user.lastName,
        })
        .from(user)
        .innerJoin(member, eq(user.id, member.userId))
        .where(and(eq(user.id, data.parentId), eq(member.organizationId, orgId))),
      this.db
        .select({
          id: user.id,
          name: user.name,
          lastName: user.lastName,
        })
        .from(user)
        .innerJoin(member, eq(user.id, member.userId))
        .where(and(eq(user.id, data.studentId), eq(member.organizationId, orgId))),
    ])

    if (parentResult.length === 0) {
      throw new Error('Parent not found in organization')
    }
    if (studentResult.length === 0) {
      throw new Error('Student not found in organization')
    }

    const parent = parentResult[0]
    const student = studentResult[0]
    if (!parent || !student) {
      throw new Error('Parent or student data not found')
    }

    const [relation] = await this.db
      .insert(parentStudentRelation)
      .values({
        parentId: data.parentId,
        studentId: data.studentId,
        relationshipType: data.relationshipType || 'parent',
      })
      .returning()

    if (!relation) {
      throw new Error('Failed to create parent-student relation')
    }

    // Return relation with names included
    return {
      id: relation.id,
      parentId: relation.parentId,
      studentId: relation.studentId,
      relationshipType: relation.relationshipType,
      parentName: parent.name,
      parentLastName: parent.lastName,
      studentName: student.name,
      studentLastName: student.lastName,
      createdAt: relation.createdAt,
    } as unknown as ParentStudentRelation
  }

  async deleteParentStudentRelation(orgId: string, relationId: string) {
    // Verify the relation exists and both users belong to organization
    const relation = await this.db
      .select({
        id: parentStudentRelation.id,
        parentId: parentStudentRelation.parentId,
        studentId: parentStudentRelation.studentId,
      })
      .from(parentStudentRelation)
      .where(eq(parentStudentRelation.id, relationId))

    if (relation.length === 0) {
      throw new Error('Parent-student relation not found')
    }

    const relationData = relation[0]
    if (!relationData) {
      throw new Error('Relation data not found')
    }

    const [parentMember, studentMember] = await Promise.all([
      this.db
        .select()
        .from(member)
        .where(and(eq(member.userId, relationData.parentId), eq(member.organizationId, orgId))),
      this.db
        .select()
        .from(member)
        .where(and(eq(member.userId, relationData.studentId), eq(member.organizationId, orgId))),
    ])

    if (parentMember.length === 0 || studentMember.length === 0) {
      throw new Error('Users not found in organization')
    }

    await this.db.delete(parentStudentRelation).where(eq(parentStudentRelation.id, relationId))

    return { success: true }
  }

}

// Factory function to create service instance
export function createUserManagementService(db: NodePgDatabase) {
  return new UserManagementService(db)
}
