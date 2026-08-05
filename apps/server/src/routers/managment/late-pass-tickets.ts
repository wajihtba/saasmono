import { z } from 'zod'
import { db } from '../../db/index'
import { OrpcErrorHelper, getCurrentUserId, getOrgId } from '../../lib/errors/orpc-errors'
import { authorized } from '../../lib/orpc'
import { assertStudentVisible, resolveScope, visibleStudentIds } from '../../lib/scope'
import { Permission } from '../../types/rbac'
import { createLatePassTicketService } from '../../services/managment/late-pass-tickets'
import {
  CancelTicketInputSchema,
  EligibleStudentSchema,
  GenerateTicketInputSchema,
  GetEligibleStudentsQuerySchema,
  GetTicketsQuerySchema,
  LatePassConfigSchema,
  LatePassTicketListItemSchema,
  LatePassTicketSchema,
  QRValidationResultSchema,
  UpdateLatePassConfigInputSchema,
  UpcomingTimetableSchema,
  UseTicketInputSchema,
  ValidateTicketQRInputSchema
} from '../../types/late-pass-ticket'

const latePassTicketService = createLatePassTicketService(db)

export const latePassTicketRouter = {
  // Configuration Management
  getConfig: authorized(Permission.LATEPASS_READ)
    .output(LatePassConfigSchema)
    .route({
      method: 'GET',
      path: '/management/late-pass-tickets/config',
      tags: ['Late Pass Tickets'],
      summary: 'Get late pass configuration',
      description: 'Retrieves the late pass ticket configuration for the organization',
    })
    .handler(async ({ context }) => {
      const orgId = getOrgId(context)
      try {
        return await latePassTicketService.getConfig(orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch late pass configuration')
      }
    }),

  updateConfig: authorized(Permission.LATEPASS_CONFIG)
    .input(UpdateLatePassConfigInputSchema)
    .output(LatePassConfigSchema)
    .route({
      method: 'PUT',
      path: '/management/late-pass-tickets/config',
      tags: ['Late Pass Tickets'],
      summary: 'Update late pass configuration',
      description: 'Updates the late pass ticket configuration settings',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      try {
        return await latePassTicketService.updateConfig(orgId, input, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to update late pass configuration')
      }
    }),

  // Student Eligibility
  getEligibleStudents: authorized(Permission.LATEPASS_ISSUE)
    .input(GetEligibleStudentsQuerySchema)
    .output(z.array(EligibleStudentSchema))
    .route({
      method: 'GET',
      path: '/management/late-pass-tickets/eligible-students',
      tags: ['Late Pass Tickets'],
      summary: 'Get eligible students',
      description: 'Retrieves students who are eligible for late pass tickets (those marked as absent)',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      try {
        return await latePassTicketService.getEligibleStudents(orgId, input)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch eligible students')
      }
    }),

  getStudentUpcomingTimetables: authorized(Permission.LATEPASS_ISSUE)
    .input(
      z.object({
        studentId: z.string().describe('Student ID'),
      })
    )
    .output(z.array(UpcomingTimetableSchema))
    .route({
      method: 'GET',
      path: '/management/late-pass-tickets/students/{studentId}/upcoming-timetables',
      tags: ['Late Pass Tickets'],
      summary: 'Get student upcoming timetables',
      description: 'Retrieves upcoming timetables for a student within the validity window',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      try {
        const config = await latePassTicketService.getConfig(orgId)
        return await latePassTicketService.getStudentUpcomingTimetables(input.studentId, orgId, config)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch student upcoming timetables')
      }
    }),

  // Ticket Management
  generateTicket: authorized(Permission.LATEPASS_ISSUE)
    .input(GenerateTicketInputSchema)
    .output(LatePassTicketSchema)
    .route({
      method: 'POST',
      path: '/management/late-pass-tickets',
      tags: ['Late Pass Tickets'],
      summary: 'Generate late pass ticket',
      description: 'Generates a new late pass ticket for a student for a specific timetable',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      try {
        return await latePassTicketService.generateTicket(input, orgId, userId)
      } catch (error) {        
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to generate late pass ticket')
      }
    }),

  getTicketById: authorized(Permission.LATEPASS_READ)
    .input(
      z.object({
        ticketId: z.uuid().describe('Ticket ID'),
      })
    )
    .output(LatePassTicketSchema)
    .route({
      method: 'GET',
      path: '/management/late-pass-tickets/{ticketId}',
      tags: ['Late Pass Tickets'],
      summary: 'Get ticket by ID',
      description: 'Retrieves a complete late pass ticket with all relations',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const scope = resolveScope(context)
      try {
        const ticket = await latePassTicketService.getTicketById(input.ticketId, orgId)
        await assertStudentVisible(scope, ticket.studentId)
        return ticket
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch late pass ticket')
      }
    }),

  getTickets: authorized(Permission.LATEPASS_READ)
    .input(GetTicketsQuerySchema.optional())
    .output(z.array(LatePassTicketListItemSchema))
    .route({
      method: 'GET',
      path: '/management/late-pass-tickets',
      tags: ['Late Pass Tickets'],
      summary: 'List late pass tickets',
      description: 'Retrieves a list of late pass tickets with optional filtering',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const allowedStudentIds = await visibleStudentIds(resolveScope(context))
      try {
        const tickets = await latePassTicketService.getTickets(orgId, input)
        if (allowedStudentIds === null) return tickets
        const allowed = new Set(allowedStudentIds)
        return tickets.filter((ticket: { studentId: string }) => allowed.has(ticket.studentId))
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch late pass tickets')
      }
    }),

  cancelTicket: authorized(Permission.LATEPASS_ISSUE)
    .input(CancelTicketInputSchema)
    .output(LatePassTicketSchema)
    .route({
      method: 'POST',
      path: '/management/late-pass-tickets/cancel',
      tags: ['Late Pass Tickets'],
      summary: 'Cancel ticket',
      description: 'Cancels an issued late pass ticket with a reason',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      try {
        return await latePassTicketService.cancelTicket(input, orgId, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to cancel late pass ticket')
      }
    }),

  // QR Code Validation & Usage
  validateQRCode: authorized(Permission.LATEPASS_VALIDATE)
    .input(ValidateTicketQRInputSchema)
    .output(QRValidationResultSchema)
    .route({
      method: 'POST',
      path: '/management/late-pass-tickets/validate-qr',
      tags: ['Late Pass Tickets'],
      summary: 'Validate QR code',
      description: 'Validates a late pass ticket QR code for a specific timetable',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      try {
        return await latePassTicketService.validateQRCode(input, orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to validate QR code')
      }
    }),

  useTicket: authorized(Permission.LATEPASS_VALIDATE)
    .input(UseTicketInputSchema)
    .output(
      z.object({
        ticket: LatePassTicketSchema,
        attendanceId: z.uuid(),
      })
    )
    .route({
      method: 'POST',
      path: '/management/late-pass-tickets/use',
      tags: ['Late Pass Tickets'],
      summary: 'Use ticket',
      description: 'Marks a late pass ticket as used and creates attendance record',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      try {
        return await latePassTicketService.useTicket(input, orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to use late pass ticket')
      }
    }),

  // Admin Utilities
  expireOldTickets: authorized(Permission.LATEPASS_CONFIG)
    .output(
      z.object({
        expiredCount: z.number(),
      })
    )
    .route({
      method: 'POST',
      path: '/management/late-pass-tickets/expire-old',
      tags: ['Late Pass Tickets'],
      summary: 'Expire old tickets',
      description: 'Manually triggers expiration of old tickets (for admin/cron use)',
    })
    .handler(async ({ context }) => {
      const orgId = getOrgId(context)
      try {
        const expiredCount = await latePassTicketService.expireOldTickets(orgId)
        return { expiredCount }
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to expire old tickets')
      }
    }),
}
