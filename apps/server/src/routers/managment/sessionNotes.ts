import { z } from 'zod'
import { db } from '../../db/index'
import { OrpcErrorHelper, getCurrentUserId, getOrgId } from '../../lib/errors/orpc-errors'
import { authorized } from '../../lib/orpc'
import {
  assertAttachmentAuthored,
  assertSessionNoteAuthored,
  assertSessionNoteVisible,
  assertTimetableVisible,
  filterSessionNotes,
  resolveScope,
} from '../../lib/scope'
import { Permission } from '../../types/rbac'
import { createSessionNoteManagementService } from '../../services/managment/sessionNotes'
import {
  CreateSessionNoteAttachmentInputSchema,
  CreateSessionNoteInputSchema,
  SessionNoteAttachmentSchema,
  SessionNoteListItemSchema,
  SessionNoteQuerySchema,
  SessionNoteSchema,
  UpdateSessionNoteInputSchema
} from '../../types/sessionNote'

const sessionNoteService = createSessionNoteManagementService(db)

export const sessionNoteManagementRouter = {
  // Session Notes
  getSessionNotesList: authorized(Permission.NOTE_READ)
    .input(SessionNoteQuerySchema.optional())
    .output(z.array(SessionNoteListItemSchema))
    .route({
      method: 'GET',
      path: '/management/session-notes',
      tags: ['Session Note Management'],
      summary: 'List session notes',
      description: 'Retrieves all session notes with optional filtering',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const scope = resolveScope(context)
      try {
        const notes = await sessionNoteService.getSessionNotesList(orgId, input)
        return await filterSessionNotes(scope, notes)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch session notes')
      }
    }),

  getSessionNoteById: authorized(Permission.NOTE_READ)
    .input(
      z.object({
        sessionNoteId: z.uuid().describe('Session Note ID'),
      })
    )
    .output(SessionNoteSchema)
    .route({
      method: 'GET',
      path: '/management/session-notes/{sessionNoteId}',
      tags: ['Session Note Management'],
      summary: 'Get session note',
      description: 'Retrieves a single session note by ID with attachments',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      await assertSessionNoteVisible(resolveScope(context), input.sessionNoteId)
      try {
        return await sessionNoteService.getSessionNoteById(input.sessionNoteId, orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch session note')
      }
    }),

  createSessionNote: authorized(Permission.NOTE_WRITE)
    .input(CreateSessionNoteInputSchema)
    .output(SessionNoteSchema.omit({
      timetable: true,
      attachments: true,
      createdBy: true,
    }))
    .route({
      method: 'POST',
      path: '/management/session-notes',
      tags: ['Session Note Management'],
      summary: 'Create session note',
      description: 'Creates a new session note',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      await assertTimetableVisible(resolveScope(context), input.timetableId)
      try {
        return await sessionNoteService.createSessionNote(input, orgId, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to create session note')
      }
    }),

  updateSessionNote: authorized(Permission.NOTE_WRITE)
    .input(
      z.object({
        sessionNoteId: z.uuid().describe('Session Note ID'),
        data: UpdateSessionNoteInputSchema,
      })
    )
    .output(SessionNoteSchema.omit({
      timetable: true,
      attachments: true,
      createdBy: true,
    }))
    .route({
      method: 'PUT',
      path: '/management/session-notes/{sessionNoteId}',
      tags: ['Session Note Management'],
      summary: 'Update session note',
      description: 'Updates an existing session note',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      await assertSessionNoteAuthored(resolveScope(context), input.sessionNoteId)
      try {
        return await sessionNoteService.updateSessionNote(input.sessionNoteId, input.data, orgId, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to update session note')
      }
    }),

  deleteSessionNote: authorized(Permission.NOTE_DELETE)
    .input(
      z.object({
        sessionNoteId: z.uuid().describe('Session Note ID'),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .route({
      method: 'DELETE',
      path: '/management/session-notes/{sessionNoteId}',
      tags: ['Session Note Management'],
      summary: 'Delete session note',
      description: 'Deletes a session note (soft delete)',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      await assertSessionNoteAuthored(resolveScope(context), input.sessionNoteId)
      try {
        return await sessionNoteService.deleteSessionNote(input.sessionNoteId, orgId, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to delete session note')
      }
    }),

  // Session Note Attachments
  createSessionNoteAttachment: authorized(Permission.NOTE_WRITE)
    .input(CreateSessionNoteAttachmentInputSchema)
    .output(SessionNoteAttachmentSchema)
    .route({
      method: 'POST',
      path: '/management/session-note-attachments',
      tags: ['Session Note Management'],
      summary: 'Create session note attachment',
      description: 'Creates a new attachment for a session note',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      await assertSessionNoteAuthored(resolveScope(context), input.sessionNoteId)
      try {
        return await sessionNoteService.createSessionNoteAttachment(input, orgId, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to create session note attachment')
      }
    }),

  deleteSessionNoteAttachment: authorized(Permission.NOTE_DELETE)
    .input(
      z.object({
        attachmentId: z.uuid().describe('Attachment ID'),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .route({
      method: 'DELETE',
      path: '/management/session-note-attachments/{attachmentId}',
      tags: ['Session Note Management'],
      summary: 'Delete session note attachment',
      description: 'Deletes a session note attachment (soft delete)',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      await assertAttachmentAuthored(resolveScope(context), input.attachmentId)
      try {
        return await sessionNoteService.deleteSessionNoteAttachment(input.attachmentId, orgId, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to delete session note attachment')
      }
    }),
}