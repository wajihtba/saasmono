import { z } from 'zod'
import { db } from '../../db/index'
import { OrpcErrorHelper, getCurrentUserId, getOrgId } from '../../lib/errors/orpc-errors'
import { authorized } from '../../lib/orpc'
import { assertStudentVisible, resolveScope, visibleStudentIds } from '../../lib/scope'
import { Permission } from '../../types/rbac'
import { createStudentManagementService } from '../../services/managment/students'
import {
  CreateStudentEnrollmentSchema,
  CreateStudentGroupMembershipSchema,
  StudentEnrollmentSchema,
  StudentGroupMembershipSchema,
  StudentListItemSchema,
  UpdateStudentEnrollmentStatusSchema,
  UpdateStudentGroupMembershipStatusSchema,
} from '../../types/user'

const studentService = createStudentManagementService(db)

export const studentManagementRouter = {
  getStudentById: authorized(Permission.STUDENT_READ)
    .input(
      z.object({
        // studentId: z.string().uuid().describe('Student ID'), // this does not work since the student ID is a string not a uuid
        studentId: z.string().describe('Student ID'),
      })
    )
    .output(z.any())
    // .output(StudentDetailedResponseSchema) // this validation cause error
    .route({
      method: 'GET',
      path: '/management/students/{studentId}',
      tags: ['Student Management'],
      summary: 'Get detailed student information',
      description:
        'Retrieves comprehensive student details including parents, classroom, groups, subjects and teachers',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      await assertStudentVisible(resolveScope(context), input.studentId)
      try {
        const student = await studentService.getStudentById(input.studentId, orgId)
        return student
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch student details')
      }
    }),

  getStudentsList: authorized(Permission.STUDENT_READ)
    .input(
      z
        .object({
          classroomId: z.string().uuid().optional().describe('Filter by classroom ID'),
          educationLevelId: z.string().uuid().optional().describe('Filter by education level ID'),
        })
        .optional()
    )
    .output(z.array(StudentListItemSchema))
    .route({
      method: 'GET',
      path: '/management/students/list',
      tags: ['Student Management'],
      summary: 'List students',
      description:
        'Retrieves students with basic info and classroom, optionally filtered by classroom or education level',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const allowedStudentIds = await visibleStudentIds(resolveScope(context))
      try {
        const students = await studentService.getStudentsList(orgId, input)
        if (allowedStudentIds === null) return students
        const allowed = new Set(allowedStudentIds)
        return students.filter((student: { id: string }) => allowed.has(student.id))
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch students')
      }
    }),

  createStudentEnrollment: authorized(Permission.STUDENT_WRITE)
    .input(CreateStudentEnrollmentSchema)
    .output(StudentEnrollmentSchema)
    .route({
      method: 'POST',
      path: '/management/student-enrollments',
      tags: ['Student Management'],
      summary: 'Enroll student in classroom',
      description: 'Creates a new enrollment for a student in a specific classroom',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const currentUserId = getCurrentUserId(context)
      try {
        return await studentService.createStudentEnrollment(orgId, {
          ...input,
          createdByUserId: currentUserId,
        })
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to create student enrollment')
      }
    }),

  updateStudentEnrollmentStatus: authorized(Permission.STUDENT_WRITE)
    .input(UpdateStudentEnrollmentStatusSchema)
    .output(StudentEnrollmentSchema)
    .route({
      method: 'PUT',
      path: '/management/student-enrollments/{enrollmentId}/status',
      tags: ['Student Management'],
      summary: 'Update student enrollment status',
      description: 'Updates the status of a student enrollment (active, inactive, transferred)',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const currentUserId = getCurrentUserId(context)
      try {
        return await studentService.updateStudentEnrollmentStatus(
          orgId,
          input.enrollmentId,
          input.status,
          currentUserId
        )
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to update enrollment status')
      }
    }),

  createStudentGroupMembership: authorized(Permission.STUDENT_WRITE)
    .input(CreateStudentGroupMembershipSchema)
    .output(StudentGroupMembershipSchema)
    .route({
      method: 'POST',
      path: '/management/student-group-memberships',
      tags: ['Student Management'],
      summary: 'Add student to group',
      description: 'Creates a new group membership for a student in a specific classroom group',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const currentUserId = getCurrentUserId(context)
      try {
        return await studentService.createStudentGroupMembership(orgId, {
          ...input,
          createdByUserId: currentUserId,
        })
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to create group membership')
      }
    }),

  updateStudentGroupMembershipStatus: authorized(Permission.STUDENT_WRITE)
    .input(UpdateStudentGroupMembershipStatusSchema)
    .output(StudentGroupMembershipSchema)
    .route({
      method: 'PUT',
      path: '/management/student-group-memberships/{membershipId}/status',
      tags: ['Student Management'],
      summary: 'Update group membership status',
      description: 'Updates the active status of a student group membership',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const currentUserId = getCurrentUserId(context)
      try {
        return await studentService.updateStudentGroupMembershipStatus(
          orgId,
          input.membershipId,
          input.isActive,
          currentUserId
        )
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to update group membership status')
      }
    }),
}
