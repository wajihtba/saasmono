import { z } from 'zod'
import { db } from '../../db/index'
import { OrpcErrorHelper, getCurrentUserId, getOrgId } from '../../lib/errors/orpc-errors'
import { authorized } from '../../lib/orpc'
import { Permission } from '../../types/rbac'
import { createRoomManagementService } from '../../services/managment/rooms'
import { CreateRoomInputSchema, RoomListItemSchema, RoomSchema, UpdateRoomInputSchema } from '../../types/room'

const roomService = createRoomManagementService(db)

export const roomManagementRouter = {
  // Rooms
  getRoomsList: authorized(Permission.ROOM_READ)
    .output(z.array(RoomListItemSchema))
    .route({
      method: 'GET',
      path: '/management/rooms',
      tags: ['Room Management'],
      summary: 'List rooms',
      description: 'Retrieves all rooms for the organization',
    })
    .handler(async ({ context }) => {
      const orgId = getOrgId(context)
      try {
        return await roomService.getRoomsList(orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch rooms')
      }
    }),

  getRoomById: authorized(Permission.ROOM_READ)
    .input(
      z.object({
        roomId: z.uuid().describe('Room ID'),
      })
    )
    .output(RoomSchema)
    .route({
      method: 'GET',
      path: '/management/rooms/{roomId}',
      tags: ['Room Management'],
      summary: 'Get room',
      description: 'Retrieves a single room by ID',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      try {
        return await roomService.getRoomById(input.roomId, orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch room')
      }
    }),

  createRoom: authorized(Permission.ROOM_WRITE)
    .input(CreateRoomInputSchema)
    .output(RoomSchema)
    .route({
      method: 'POST',
      path: '/management/rooms',
      tags: ['Room Management'],
      summary: 'Create room',
      description: 'Creates a new room in the organization',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      try {
        return await roomService.createRoom(input, orgId, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to create room')
      }
    }),

  updateRoom: authorized(Permission.ROOM_WRITE)
    .input(
      z.object({
        roomId: z.uuid().describe('Room ID'),
        data: UpdateRoomInputSchema,
      })
    )
    .output(RoomSchema)
    .route({
      method: 'PUT',
      path: '/management/rooms/{roomId}',
      tags: ['Room Management'],
      summary: 'Update room',
      description: 'Updates an existing room',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      try {
        return await roomService.updateRoom(input.roomId, input.data, orgId, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to update room')
      }
    }),

  deleteRoom: authorized(Permission.ROOM_DELETE)
    .input(
      z.object({
        roomId: z.uuid().describe('Room ID'),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .route({
      method: 'DELETE',
      path: '/management/rooms/{roomId}',
      tags: ['Room Management'],
      summary: 'Delete room',
      description: 'Deletes a room (soft delete)',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      const userId = getCurrentUserId(context)
      if (!userId) {
        throw OrpcErrorHelper.unauthorized('User ID is required')
      }
      try {
        return await roomService.deleteRoom(input.roomId, orgId, userId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to delete room')
      }
    }),
}