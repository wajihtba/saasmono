import { z } from 'zod'
import { db } from '../../db/index'
import { OrpcErrorHelper, getCurrentUserId, getOrgId } from '../../lib/errors/orpc-errors'
import { authorized } from '../../lib/orpc'
import { assertUserVisible, requireOrgWideScope, resolveScope } from '../../lib/scope'
import { Permission, Scope } from '../../types/rbac'
import { createUserManagementService } from '../../services/managment/users'
import {
  CreateParentStudentRelationSchema,
  ParentStudentRelationSchema,
  SuccessResponseSchema,
  UserListItemSchema,
  UserResponseSchema,
  UserTypeSchema,
  UserUpdateSchema,
} from '../../types/user'

const userService = createUserManagementService(db)

export const userManagementRouter = {
  getUserById: authorized(Permission.USER_READ)
    .input(
      z.object({
        userId: z.string().min(1).describe('User ID'),
      })
    )
    .output(UserResponseSchema)
    .route({
      method: 'GET',
      path: '/management/users/{userId}',
      tags: ['User Management'],
      summary: 'Get user with relationships',
      description: 'Retrieves user details including parent-children relationships and teacher assignments',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      await assertUserVisible(resolveScope(context), input.userId)
      try {
        return await userService.getUserById(input.userId, orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch user')
      }
    }),

  updateUser: authorized(Permission.USER_WRITE)
    .input(
      z.object({
        userId: z.string().min(1).describe('User ID'),
        name: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        userType: UserTypeSchema.optional(),
      })
    )
    .output(UserUpdateSchema)
    .route({
      method: 'PUT',
      path: '/management/users/{userId}',
      tags: ['User Management'],
      summary: 'Update user',
      description: "Updates user's basic information",
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const scope = resolveScope(context)
      const { userId, ...updateData } = input

      await assertUserVisible(scope, userId)

      // Only organization-wide actors may change what kind of user someone is.
      // Without this a student could hand itself a different user type.
      if (updateData.userType !== undefined && scope.kind !== Scope.ORG) {
        throw OrpcErrorHelper.forbidden('You cannot change the user type')
      }

      try {
        return await userService.updateUser(userId, orgId, updateData)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to update user')
      }
    }),

  updateMyProfile: authorized(Permission.USER_WRITE)
    .input(
      z.object({
        name: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
      })
    )
    .output(UserUpdateSchema)
    .route({
      method: 'PUT',
      path: '/management/users/me',
      tags: ['User Management'],
      summary: 'Update own profile',
      description: "Updates the signed-in user's own basic information",
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      try {
        return await userService.updateUser(userId, orgId, input)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to update profile')
      }
    }),

  listUsers: authorized(Permission.USER_READ)
    .input(
      z.object({
        userType: UserTypeSchema.optional(),
      })
    )
    .output(z.array(UserListItemSchema))
    .route({
      method: 'GET',
      path: '/management/users',
      tags: ['User Management'],
      summary: 'List users',
      description: 'Retrieves users, optionally filtered by type',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      // USER_READ is organization-wide only for owner/admin/staff; everyone
      // else is rejected by the middleware before reaching this handler.
      requireOrgWideScope(context)
      try {
        return await userService.listUsersByType(orgId, input.userType)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch users')
      }
    }),
}
