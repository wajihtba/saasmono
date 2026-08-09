import { user } from '@/db/schema/auth'
import { classroom, classroomGroup } from '@/db/schema/classroom'
import { educationSubject, educationLevel, institutionLevel } from '@/db/schema/education'
import { room } from '@/db/schema/room'
import { timetable, timetableImages } from '@/db/schema/timetable'
import type {
  CreateTimetableInput,
  TimetableListItem,
  TimetableQuery,
  UpdateTimetableInput,
  TimetableImageGenerationRequest,
  TimetableImageResponse,
  CreateTimetableImageInput
} from '@/types/timetable'
import { and, eq, gte, isNull, lte } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { createCanvas, registerFont } from 'canvas'
import CryptoJS from 'crypto-js'
import fs from 'fs'
import path from 'path'

export class TimetableManagementService {
  private db: NodePgDatabase

  constructor(db: NodePgDatabase) {
    this.db = db
  }

  async getTimetablesList(orgId: string, query?: TimetableQuery) {
    let whereConditions = [eq(timetable.orgId, orgId), isNull(timetable.deletedAt)]

    // Add query filters
    if (query?.startDate) {
      whereConditions.push(gte(timetable.startDateTime, query.startDate))
    }
    if (query?.endDate) {
      whereConditions.push(lte(timetable.startDateTime, query.endDate))
    }
    if (query?.teacherId) {
      whereConditions.push(eq(timetable.teacherId, query.teacherId))
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
    if (query?.roomId) {
      whereConditions.push(eq(timetable.roomId, query.roomId))
    }
    if (query?.status) {
      whereConditions.push(eq(timetable.status, query.status))
    }

    const results = await this.db
      .select({
        sessionId: timetable.id,
        sessionTitle: timetable.title,
        sessionStartDateTime: timetable.startDateTime,
        sessionEndDateTime: timetable.endDateTime,
        sessionStatus: timetable.status,
        // Teacher data
        teacherId: user.id,
        teacherName: user.name,
        teacherLastName: user.lastName,
        // Subject data
        subjectId: educationSubject.id,
        subjectName: educationSubject.name,
        subjectDisplayNameAr: educationSubject.displayNameAr,
        // Institution level data
        institutionLevelId: institutionLevel.id,
        institutionLevelName: institutionLevel.name,
        // Room data
        roomId: room.id,
        roomName: room.name,
        roomCode: room.code,
        // Classroom data (nullable)
        classroomId: classroom.id,
        classroomName: classroom.name,
        // Classroom group data (nullable)
        classroomGroupId: classroomGroup.id,
        classroomGroupName: classroomGroup.name,
      })
      .from(timetable)
      .leftJoin(user, eq(timetable.teacherId, user.id))
      .leftJoin(educationSubject, eq(timetable.educationSubjectId, educationSubject.id))
      .leftJoin(room, eq(timetable.roomId, room.id))
      .leftJoin(classroom, eq(timetable.classroomId, classroom.id))
      .leftJoin(educationLevel, eq(classroom.educationLevelId, educationLevel.id))
      .leftJoin(institutionLevel, eq(educationLevel.institutionLevelId, institutionLevel.id))
      .leftJoin(classroomGroup, eq(timetable.classroomGroupId, classroomGroup.id))
      .where(and(...whereConditions))

    return results.map((row) => ({
      id: row.sessionId,
      title: row.sessionTitle,
      startDateTime: row.sessionStartDateTime,
      endDateTime: row.sessionEndDateTime,
      status: row.sessionStatus,
      teacher: {
        id: row.teacherId!,
        name: row.teacherName!,
        lastName: row.teacherLastName!,
      },
      educationSubject: {
        id: row.subjectId!,
        name: row.subjectName!,
        displayNameAr: row.subjectDisplayNameAr!,
      },
      institutionLevel: row.institutionLevelId ? {
        id: row.institutionLevelId,
        name: row.institutionLevelName!,
      } : null,
      room: {
        id: row.roomId!,
        name: row.roomName!,
        code: row.roomCode!,
      },
      classroom: row.classroomId ? {
        id: row.classroomId,
        name: row.classroomName!,
      } : null,
      classroomGroup: row.classroomGroupId ? {
        id: row.classroomGroupId,
        name: row.classroomGroupName!,
      } : null,
    })) as TimetableListItem[]
  }

  async getTimetableById(timetableId: string, orgId: string) {
    const result = await this.db
      .select({
        sessionId: timetable.id,
        sessionTitle: timetable.title,
        sessionStartDateTime: timetable.startDateTime,
        sessionEndDateTime: timetable.endDateTime,
        sessionStatus: timetable.status,
        sessionClassroomId: timetable.classroomId,
        sessionClassroomGroupId: timetable.classroomGroupId,
        sessionTeacherId: timetable.teacherId,
        sessionEducationSubjectId: timetable.educationSubjectId,
        sessionRoomId: timetable.roomId,
        sessionOrgId: timetable.orgId,
        sessionActualStartDateTime: timetable.actualStartDateTime,
        sessionActualEndDateTime: timetable.actualEndDateTime,
        sessionNotes: timetable.notes,
        sessionAdditionalData: timetable.additionalData,
        sessionCreatedAt: timetable.createdAt,
        sessionUpdatedAt: timetable.updatedAt,
        sessionDeletedAt: timetable.deletedAt,
        // Teacher data
        teacherId: user.id,
        teacherName: user.name,
        teacherLastName: user.lastName,
        teacherEmail: user.email,
        // Subject data
        subjectId: educationSubject.id,
        subjectName: educationSubject.name,
        subjectDisplayNameEn: educationSubject.displayNameEn,
        subjectDisplayNameFr: educationSubject.displayNameFr,
        subjectDisplayNameAr: educationSubject.displayNameAr,
        // Room data
        roomId: room.id,
        roomName: room.name,
        roomCode: room.code,
        // Classroom data (nullable)
        classroomId: classroom.id,
        classroomName: classroom.name,
        classroomCode: classroom.code,
        // Classroom group data (nullable)
        classroomGroupId: classroomGroup.id,
        classroomGroupName: classroomGroup.name,
        classroomGroupCode: classroomGroup.code,
      })
      .from(timetable)
      .leftJoin(user, eq(timetable.teacherId, user.id))
      .leftJoin(educationSubject, eq(timetable.educationSubjectId, educationSubject.id))
      .leftJoin(room, eq(timetable.roomId, room.id))
      .leftJoin(classroom, eq(timetable.classroomId, classroom.id))
      .leftJoin(classroomGroup, eq(timetable.classroomGroupId, classroomGroup.id))
      .where(and(
        eq(timetable.id, timetableId),
        eq(timetable.orgId, orgId),
        isNull(timetable.deletedAt)
      ))

    if (!result[0] || result.length === 0) {
      throw new Error('Session instance not found')
    }

    const row = result[0]

    return {
      id: row.sessionId,
      title: row.sessionTitle,
      startDateTime: row.sessionStartDateTime,
      endDateTime: row.sessionEndDateTime,
      status: row.sessionStatus,
      classroomId: row.sessionClassroomId,
      classroomGroupId: row.sessionClassroomGroupId,
      teacherId: row.sessionTeacherId,
      educationSubjectId: row.sessionEducationSubjectId,
      roomId: row.sessionRoomId,
      orgId: row.sessionOrgId,
      actualStartDateTime: row.sessionActualStartDateTime,
      actualEndDateTime: row.sessionActualEndDateTime,
      notes: row.sessionNotes,
      additionalData: row.sessionAdditionalData,
      createdAt: row.sessionCreatedAt,
      updatedAt: row.sessionUpdatedAt,
      deletedAt: row.sessionDeletedAt,
      teacher: {
        id: row.teacherId!,
        name: row.teacherName!,
        lastName: row.teacherLastName!,
        email: row.teacherEmail!,
      },
      educationSubject: {
        id: row.subjectId!,
        name: row.subjectName!,
        displayNameEn: row.subjectDisplayNameEn!,
        displayNameFr: row.subjectDisplayNameFr!,
        displayNameAr: row.subjectDisplayNameAr!,
      },
      room: {
        id: row.roomId!,
        name: row.roomName!,
        code: row.roomCode!,
      },
      classroom: row.classroomId ? {
        id: row.classroomId,
        name: row.classroomName!,
        code: row.classroomCode!,
      } : null,
      classroomGroup: row.classroomGroupId ? {
        id: row.classroomGroupId,
        name: row.classroomGroupName!,
        code: row.classroomGroupCode!,
      } : null,
    }
  }

  async createTimetable(input: CreateTimetableInput, orgId: string, userId: string) {
    const result = await this.db
      .insert(timetable)
      .values({
        title: input.title,
        startDateTime: input.startDateTime,
        endDateTime: input.endDateTime,
        classroomId: input.classroomId || null,
        classroomGroupId: input.classroomGroupId || null,
        teacherId: input.teacherId,
        educationSubjectId: input.educationSubjectId,
        roomId: input.roomId,
        notes: input.notes || null,
        additionalData: input.additionalData || null,
        orgId,
        createdByUserId: userId,
      })
      .returning({
        id: timetable.id,
        title: timetable.title,
        startDateTime: timetable.startDateTime,
        endDateTime: timetable.endDateTime,
        status: timetable.status,
        classroomId: timetable.classroomId,
        classroomGroupId: timetable.classroomGroupId,
        teacherId: timetable.teacherId,
        educationSubjectId: timetable.educationSubjectId,
        roomId: timetable.roomId,
        orgId: timetable.orgId,
        actualStartDateTime: timetable.actualStartDateTime,
        actualEndDateTime: timetable.actualEndDateTime,
        notes: timetable.notes,
        additionalData: timetable.additionalData,
        createdAt: timetable.createdAt,
        updatedAt: timetable.updatedAt,
        deletedAt: timetable.deletedAt,
      })

    if (!result[0]) {
      throw new Error('Failed to create session instance')
    }

    return result[0]
  }

  async updateTimetable(timetableId: string, input: UpdateTimetableInput, orgId: string, userId: string) {
    const result = await this.db
      .update(timetable)
      .set({
        ...input,
        updatedByUserId: userId,
      })
      .where(and(
        eq(timetable.id, timetableId),
        eq(timetable.orgId, orgId),
        isNull(timetable.deletedAt)
      ))
      .returning({
        id: timetable.id,
        title: timetable.title,
        startDateTime: timetable.startDateTime,
        endDateTime: timetable.endDateTime,
        status: timetable.status,
        classroomId: timetable.classroomId,
        classroomGroupId: timetable.classroomGroupId,
        teacherId: timetable.teacherId,
        educationSubjectId: timetable.educationSubjectId,
        roomId: timetable.roomId,
        orgId: timetable.orgId,
        actualStartDateTime: timetable.actualStartDateTime,
        actualEndDateTime: timetable.actualEndDateTime,
        notes: timetable.notes,
        additionalData: timetable.additionalData,
        createdAt: timetable.createdAt,
        updatedAt: timetable.updatedAt,
        deletedAt: timetable.deletedAt,
      })

    if (!result[0] || result.length === 0) {
      throw new Error('Session instance not found or failed to update')
    }

    return result[0]
  }

  async deleteTimetable(timetableId: string, orgId: string, userId: string) {
    const result = await this.db
      .update(timetable)
      .set({
        deletedAt: new Date(),
        deletedByUserId: userId,
      })
      .where(and(
        eq(timetable.id, timetableId),
        eq(timetable.orgId, orgId),
        isNull(timetable.deletedAt)
      ))
      .returning({ id: timetable.id })

    if (!result[0] || result.length === 0) {
      throw new Error('Session instance not found or failed to delete')
    }

    return { success: true }
  }

  async generateTimetableImage(request: TimetableImageGenerationRequest, orgId: string, userId: string): Promise<TimetableImageResponse> {
    try {
      // Get timetable data based on request
      const timetableData = await this.getTimetablesList(orgId, request)

      // Generate hash from the timetable data
      const dataHash = this.generateDataHash(timetableData, request)

      // Check if image already exists in cache
      const existingImage = await this.findCachedImage(dataHash, orgId)
      if (existingImage) {
        // Update last accessed time
        await this.updateLastAccessed(existingImage.id)
        return {
          success: true,
          imagePath: existingImage.imagePath,
          message: 'تم استرجاع الصورة من الذاكرة المؤقتة'
        }
      }

      // Generate new image
      const imagePath = await this.createTimetableImage(timetableData, request, orgId)

      // Save image record to database
      await this.saveTimetableImage({
        dataHash,
        imagePath,
        classroomId: request.classroomId,
        classroomGroupId: request.classroomGroupId
      }, orgId, userId)

      return {
        success: true,
        imagePath,
        message: 'تم إنشاء صورة جدول الحصص بنجاح'
      }
    } catch (error) {
      console.error('Error generating timetable image:', error)
      return {
        success: false,
        message: 'فشل في إنشاء صورة جدول الحصص'
      }
    }
  }

  private generateDataHash(data: TimetableListItem[], request: TimetableImageGenerationRequest): string {
    const hashData = {
      timetableData: data,
      request,
      timestamp: new Date().toDateString() // Daily cache
    }
    return CryptoJS.MD5(JSON.stringify(hashData)).toString()
  }

  private async findCachedImage(dataHash: string, orgId: string) {
    const result = await this.db
      .select()
      .from(timetableImages)
      .where(and(
        eq(timetableImages.dataHash, dataHash),
        eq(timetableImages.orgId, orgId)
      ))
      .limit(1)

    return result[0] || null
  }

  private async updateLastAccessed(imageId: string) {
    await this.db
      .update(timetableImages)
      .set({ lastAccessedAt: new Date() })
      .where(eq(timetableImages.id, imageId))
  }

  private async saveTimetableImage(input: CreateTimetableImageInput, orgId: string, userId: string) {
    return await this.db
      .insert(timetableImages)
      .values({
        dataHash: input.dataHash,
        imagePath: input.imagePath,
        classroomId: input.classroomId || null,
        classroomGroupId: input.classroomGroupId || null,
        orgId,
        createdByUserId: userId,
      })
      .returning({ id: timetableImages.id })
  }

  private async createTimetableImage(timetableData: TimetableListItem[] = [], request: TimetableImageGenerationRequest, orgId: string): Promise<string> {

    const canvas = createCanvas(1400, 900)
    const ctx = canvas.getContext('2d')

    // Set background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 1400, 900)

    // Set font
    ctx.font = '16px Arial'
    ctx.fillStyle = '#000000'

    // Title - include classroom or classroom group name
    let title = ''
    if (!timetableData || !timetableData.length) {
      title = 'لا توجد حصص مجدولة'
      return title
    }

    const firstSession: any = timetableData[0] || {}
    if (request.classroomId && firstSession.classroom) {
      title = `جدول حصص الفصل: ${firstSession.classroom.name}`
    } else if (request.classroomGroupId && firstSession.classroomGroup) {
      title = `جدول حصص المجموعة: ${firstSession.classroomGroup.name}`
    } else {
      // Fallback
      title = request.classroomId ? 'جدول حصص الفصل' : 'جدول حصص المجموعة'
    }


    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(title, 700, 40)

    // Layout configuration
    const timeColumnWidth = 120
    const dayWidth = 180
    const headerHeight = 40
    const slotHeight = 60
    const totalWidth = (dayWidth * 6) + timeColumnWidth
    const startX = (1400 - totalWidth) / 2 // Center the table horizontally
    const startY = 100
    const timeColumnX = startX + (dayWidth * 6) // Time column on the right

    // Days of week (Saturday to Monday from right to left)
    const days = ['السبت', 'الجمعة', 'الخميس', 'الأربعاء', 'الثلاثاء', 'الإثنين']

    // Draw day headers from right to left
    ctx.font = 'bold 16px Arial'
    days.forEach((day, index) => {
      const x = startX + index * dayWidth

      // Draw header background (dark gray)
      ctx.fillStyle = '#374151'
      ctx.fillRect(x, startY, dayWidth, headerHeight)

      // Draw day text (white)
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.fillText(day, x + dayWidth / 2, startY + headerHeight / 2 + 6)
    })

    // Draw time column header (on the right)
    ctx.fillStyle = '#111827' // Darker gray for time column
    ctx.fillRect(timeColumnX, startY, timeColumnWidth, headerHeight)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('الوقت', timeColumnX + timeColumnWidth / 2, startY + headerHeight / 2 + 6)

    // Time slots (8 AM to 6 PM - 10 hours)
    const timeSlots = []
    for (let hour = 8; hour < 18; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`
      timeSlots.push(`${startTime} - ${endTime}`)
    }

    let currentY = startY + headerHeight

    // Draw timetable grid and data
    timeSlots.forEach((timeSlot, timeIndex) => {
      // Draw day columns
      days.forEach((day, dayIndex) => {
        const x = startX + dayIndex * dayWidth
        const y = currentY

        // Draw cell background (white)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x, y, dayWidth, slotHeight)

        // Draw cell border (light gray)
        ctx.strokeStyle = '#d1d5db'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, dayWidth, slotHeight)

        // Find session for this time slot and day
        // dayIndex 0 = Saturday (JS day 6), 1 = Friday (JS day 5), etc.
        const dayMapping = [6, 5, 4, 3, 2, 1] // Saturday to Monday
        const dayNumber = dayMapping[dayIndex]

        const sessionForSlot = timetableData.find(session => {
          const sessionDate = new Date(session.startDateTime)
          const sessionDay = sessionDate.getUTCDay() // Use UTC day
          const sessionHour = sessionDate.getUTCHours() // Use UTC hours

          const matches = sessionDay === dayNumber && sessionHour === (timeIndex + 8)

          return matches
        })

        if (sessionForSlot) {

          // Fill cell with session info (light gray background)
          ctx.fillStyle = '#f3f4f6'
          ctx.fillRect(x + 1, y + 1, dayWidth - 2, slotHeight - 2)

          // Session title (black, bold)
          ctx.fillStyle = '#000000'
          ctx.font = 'bold 12px Arial'
          ctx.textAlign = 'center'
          ctx.fillText(sessionForSlot.educationSubject.displayNameAr || sessionForSlot.educationSubject.name, x +  dayWidth / 2, y + 16)

          // Teacher name (dark gray)
          ctx.font = '10px Arial'
          ctx.fillStyle = '#374151'
          ctx.fillText(`${sessionForSlot.teacher.name} ${sessionForSlot.teacher.lastName}`, x + dayWidth / 2, y + 35)

          // Room (gray)
          ctx.fillText(`${sessionForSlot.room.name}`, x + dayWidth / 2, y + 54)
        }
      })

      // Draw time column cell (on the right)
      ctx.fillStyle = '#f9fafb' // Very light gray background
      ctx.fillRect(timeColumnX, currentY, timeColumnWidth, slotHeight)
      ctx.strokeStyle = '#d1d5db' // Light gray border
      ctx.lineWidth = 1
      ctx.strokeRect(timeColumnX, currentY, timeColumnWidth, slotHeight)

      // Draw time text (black)
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 11px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(timeSlot, timeColumnX + timeColumnWidth / 2, currentY + slotHeight / 2 + 4)

      currentY += slotHeight
    })

    // Create structured file path
    const timestamp = Date.now()

    // Build path structure based on classroom or classroomGroup
    let pathSegments = ['organization', orgId]

    // Get institution level from the first timetable session (they should all have the same institution level)
    const institutionLevelId = timetableData[0]?.institutionLevel?.id ?? 'default'

    pathSegments.push('institution-level', institutionLevelId)

    if (request.classroomId) {
      pathSegments.push('classroom', request.classroomId)
    } else if (request.classroomGroupId) {
      pathSegments.push('classroom-group', request.classroomGroupId)
    }

    const fileName = `timetable-${timestamp}.png`
    const relativePath = path.join(...pathSegments, fileName)
    const fullPath = path.join(process.cwd(), 'src', 'images', relativePath)
    const urlPath = `/images/${relativePath.replace(/\\/g, '/')}` // Ensure forward slashes for URL

    // Ensure directory exists
    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const buffer = canvas.toBuffer('image/png')
    fs.writeFileSync(fullPath, buffer)

    // Return full URL including server origin
    const serverUrl = process.env.SERVER_URL
    return `${serverUrl}${urlPath}`
  }
}

// Factory function to create service instance
export function createTimetableManagementService(db: NodePgDatabase) {
  return new TimetableManagementService(db)
}