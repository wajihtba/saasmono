import { z } from 'zod'
import { db } from '../../db/index'
import { OrpcErrorHelper, getCurrentUserId, getOrgId } from '../../lib/errors/orpc-errors'
import { authorized } from '../../lib/orpc'
import { assertClassroomVisible, assertTimetableVisible, resolveScope, visibleTimetableIds } from '../../lib/scope'
import { Permission } from '../../types/rbac'
import { createTimetableManagementService } from '../../services/managment/timetable'
import {
  CreateTimetableInputSchema,
  TimetableListItemSchema,
  TimetableQuerySchema,
  TimetableSchema,
  UpdateTimetableInputSchema,
  TimetableImageGenerationRequestSchema,
  TimetableImageResponseSchema
} from '../../types/timetable'

const timetableService = createTimetableManagementService(db)

export const timetableManagementRouter = {
  // Session Instances
  getTimetablesList: authorized(Permission.TIMETABLE_READ)
    .input(TimetableQuerySchema.optional())
    .output(z.array(TimetableListItemSchema))
    .route({
      method: 'GET',
      path: '/management/session-instances',
      tags: ['Session Instance Management'],
      summary: 'List session instances',
      description: 'Retrieves all session instances with optional filtering',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const allowedTimetableIds = await visibleTimetableIds(resolveScope(context))
      try {
        const timetables = await timetableService.getTimetablesList(orgId, input)
        if (allowedTimetableIds === null) return timetables
        const allowed = new Set(allowedTimetableIds)
        return timetables.filter((timetable: { id: string }) => allowed.has(timetable.id))
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch session instances')
      }
    }),

  getTimetableById: authorized(Permission.TIMETABLE_READ)
    .input(
      z.object({
        timetableId: z.uuid().describe('Session Instance ID'),
      })
    )
    .output(TimetableSchema)
    .route({
      method: 'GET',
      path: '/management/session-instances/{timetableId}',
      tags: ['Session Instance Management'],
      summary: 'Get session instance',
      description: 'Retrieves a single session instance by ID',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      await assertTimetableVisible(resolveScope(context), input.timetableId)
      try {
        return await timetableService.getTimetableById(input.timetableId, orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch session instance')
      }
    }),

  createTimetable: authorized(Permission.TIMETABLE_WRITE)
    .input(CreateTimetableInputSchema)
    .output(TimetableSchema.omit({
      teacher: true,
      educationSubject: true,
      room: true,
      classroom: true,
      classroomGroup: true,
    }))
    .route({
      method: 'POST',
      path: '/management/session-instances',
      tags: ['Session Instance Management'],
      summary: 'Create session instance',
      description: 'Creates a new session instance',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      try {
        return await timetableService.createTimetable(input, orgId, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to create session instance')
      }
    }),

  updateTimetable: authorized(Permission.TIMETABLE_WRITE)
    .input(
      z.object({
        timetableId: z.uuid().describe('Session Instance ID'),
        data: UpdateTimetableInputSchema,
      })
    )
    .output(TimetableSchema.omit({
      teacher: true,
      educationSubject: true,
      room: true,
      classroom: true,
      classroomGroup: true,
    }))
    .route({
      method: 'PUT',
      path: '/management/session-instances/{timetableId}',
      tags: ['Session Instance Management'],
      summary: 'Update session instance',
      description: 'Updates an existing session instance',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      try {
        return await timetableService.updateTimetable(input.timetableId, input.data, orgId, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to update session instance')
      }
    }),

  deleteTimetable: authorized(Permission.TIMETABLE_DELETE)
    .input(
      z.object({
        timetableId: z.uuid().describe('Session Instance ID'),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .route({
      method: 'DELETE',
      path: '/management/session-instances/{timetableId}',
      tags: ['Session Instance Management'],
      summary: 'Delete session instance',
      description: 'Deletes a session instance (soft delete)',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      try {
        return await timetableService.deleteTimetable(input.timetableId, orgId, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to delete session instance')
      }
    }),

  generateTimetableImage: authorized(Permission.TIMETABLE_READ)
    .input(TimetableImageGenerationRequestSchema)
    .output(TimetableImageResponseSchema)
    .route({
      method: 'POST',
      path: '/management/session-instances/generate-image',
      tags: ['Session Instance Management'],
      summary: 'Generate timetable image',
      description: 'Generates a timetable image with caching support',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      if (input.classroomId) {
        await assertClassroomVisible(resolveScope(context), input.classroomId)
      }
      try {
        return await timetableService.generateTimetableImage(input, orgId, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to generate timetable image')
      }
    }),
}