import { timetable } from '@/db/schema/timetable'
import { sessionNote, sessionNoteAttachment } from '@/db/schema/sessionNote'
import { classroom, classroomGroup } from '@/db/schema/classroom'
import { educationLevel } from '@/db/schema/education'
import { user } from '@/db/schema/auth'
import type {
  CreateSessionNoteAttachmentInput,
  CreateSessionNoteInput,
  SessionNoteListItem,
  SessionNoteQuery,
  UpdateSessionNoteInput
} from '@/types/sessionNote'
import { and, count, eq, gte, isNull, lte } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import path from 'path'
import { cleanKeywords, moveFileFromTemp, PUBLIC_DIR, toFullFileUrl } from '@/lib/fileUtils'

export class SessionNoteManagementService {
  private db: NodePgDatabase

  constructor(db: NodePgDatabase) {
    this.db = db
  }

  async getSessionNotesList(orgId: string, query?: SessionNoteQuery) {
    let whereConditions = [eq(sessionNote.orgId, orgId), isNull(sessionNote.deletedAt)]

    // Add query filters
    if (query?.timetableId) {
      whereConditions.push(eq(sessionNote.timetableId, query.timetableId))
    }
    if (query?.isPrivate !== undefined) {
      whereConditions.push(eq(sessionNote.isPrivate, query.isPrivate))
    }
    if (query?.startDate) {
      whereConditions.push(gte(timetable.startDateTime, query.startDate))
    }
    if (query?.endDate) {
      whereConditions.push(lte(timetable.startDateTime, query.endDate))
    }

    const results = await this.db
      .select({
        noteId: sessionNote.id,
        noteTitle: sessionNote.title,
        noteIsPrivate: sessionNote.isPrivate,
        noteTimetableId: sessionNote.timetableId,
        noteCreatedAt: sessionNote.createdAt,
        noteCreatedById: sessionNote.createdByUserId,
        // Session instance data
        sessionId: timetable.id,
        sessionTitle: timetable.title,
        sessionStartDateTime: timetable.startDateTime,
      })
      .from(sessionNote)
      .leftJoin(timetable, eq(sessionNote.timetableId, timetable.id))
      .where(and(...whereConditions))

    // Get attachment counts for each note
    const noteIds = results.map((r) => r.noteId)

    const attachmentCounts = noteIds.length > 0 ? await this.db
      .select({
        sessionNoteId: sessionNoteAttachment.sessionNoteId,
        attachmentCount: count(sessionNoteAttachment.id),
      })
      .from(sessionNoteAttachment)
      .where(
        and(
          eq(sessionNoteAttachment.orgId, orgId),
          isNull(sessionNoteAttachment.deletedAt)
        )
      )
      .groupBy(sessionNoteAttachment.sessionNoteId) : []

    // Create map for quick lookup
    const attachmentCountMap = new Map(attachmentCounts.map((ac) => [ac.sessionNoteId, ac.attachmentCount]))

    return results.map((row) => ({
      id: row.noteId,
      title: row.noteTitle,
      isPrivate: row.noteIsPrivate,
      timetableId: row.noteTimetableId,
      createdAt: row.noteCreatedAt,
      createdById: row.noteCreatedById,
      timetable: {
        id: row.sessionId!,
        title: row.sessionTitle!,
        startDateTime: row.sessionStartDateTime!,
      },
      attachmentCount: attachmentCountMap.get(row.noteId) || 0,
    })) as SessionNoteListItem[]
  }

  async getSessionNoteById(sessionNoteId: string, orgId: string) {
    const result = await this.db
      .select({
        noteId: sessionNote.id,
        noteTitle: sessionNote.title,
        noteContent: sessionNote.content,
        noteKeywords: sessionNote.keywords,
        noteNotes: sessionNote.notes,
        noteSummary: sessionNote.summary,
        noteIsPrivate: sessionNote.isPrivate,
        noteTimetableId: sessionNote.timetableId,
        noteOrgId: sessionNote.orgId,
        noteCreatedAt: sessionNote.createdAt,
        noteUpdatedAt: sessionNote.updatedAt,
        noteDeletedAt: sessionNote.deletedAt,
        // Session instance data
        sessionId: timetable.id,
        sessionTitle: timetable.title,
        sessionStartDateTime: timetable.startDateTime,
        sessionEndDateTime: timetable.endDateTime,
        // Creator data
        creatorId: user.id,
        creatorName: user.name,
        creatorLastName: user.lastName,
      })
      .from(sessionNote)
      .leftJoin(timetable, eq(sessionNote.timetableId, timetable.id))
      .leftJoin(user, eq(sessionNote.createdByUserId, user.id))
      .where(and(
        eq(sessionNote.id, sessionNoteId),
        eq(sessionNote.orgId, orgId),
        isNull(sessionNote.deletedAt)
      ))

    if (!result[0] || result.length === 0) {
      throw new Error('Session note not found')
    }

    // Get attachments for this note
    const attachments = await this.db
      .select({
        id: sessionNoteAttachment.id,
        fileName: sessionNoteAttachment.fileName,
        fileUrl: sessionNoteAttachment.fileUrl,
        fileSize: sessionNoteAttachment.fileSize,
        mimeType: sessionNoteAttachment.mimeType,
        description: sessionNoteAttachment.description,
      })
      .from(sessionNoteAttachment)
      .where(and(
        eq(sessionNoteAttachment.sessionNoteId, sessionNoteId),
        eq(sessionNoteAttachment.orgId, orgId),
        isNull(sessionNoteAttachment.deletedAt)
      ))

    // Convert relative file URLs to full URLs
    const attachmentsWithFullUrls = attachments.map(attachment => ({
      ...attachment,
      fileUrl: toFullFileUrl(attachment.fileUrl),
    }))

    const row = result[0]

    return {
      id: row.noteId,
      title: row.noteTitle,
      content: row.noteContent,
      keywords: row.noteKeywords,
      notes: row.noteNotes,
      summary: row.noteSummary,
      isPrivate: row.noteIsPrivate,
      timetableId: row.noteTimetableId,
      orgId: row.noteOrgId,
      createdAt: row.noteCreatedAt,
      updatedAt: row.noteUpdatedAt,
      deletedAt: row.noteDeletedAt,
      timetable: {
        id: row.sessionId!,
        title: row.sessionTitle!,
        startDateTime: row.sessionStartDateTime!,
        endDateTime: row.sessionEndDateTime!,
      },
      createdBy: {
        id: row.creatorId!,
        name: row.creatorName!,
        lastName: row.creatorLastName!,
      },
      attachments: attachmentsWithFullUrls,
    }
  }

  async createSessionNote(input: CreateSessionNoteInput, orgId: string, userId: string) {
    // Clean keywords if provided
    const cleanedKeywords = input.keywords ? cleanKeywords(input.keywords) : null

    // Create the session note
    let result
    try {
      console.log('[SessionNote] Attempting to create session note with:', {
        title: input.title,
        timetableId: input.timetableId,
        orgId,
        userId,
      })

      result = await this.db
        .insert(sessionNote)
        .values({
          title: input.title,
          content: input.content,
          keywords: cleanedKeywords,
          notes: input.notes || null,
          summary: input.summary || null,
          isPrivate: input.isPrivate,
          timetableId: input.timetableId,
          orgId,
          createdByUserId: userId,
        })
        .returning({
          id: sessionNote.id,
          title: sessionNote.title,
          content: sessionNote.content,
          keywords: sessionNote.keywords,
          notes: sessionNote.notes,
          summary: sessionNote.summary,
          isPrivate: sessionNote.isPrivate,
          timetableId: sessionNote.timetableId,
          orgId: sessionNote.orgId,
          createdAt: sessionNote.createdAt,
          updatedAt: sessionNote.updatedAt,
          deletedAt: sessionNote.deletedAt,
        })
    } catch (error) {
      console.error('[SessionNote] Database insert error:', error)
      if (error instanceof Error) {
        console.error('[SessionNote] Error message:', error.message)
        console.error('[SessionNote] Error stack:', error.stack)
      }
      // Re-throw with more context
      throw new Error(`Failed to insert session note into database: ${error instanceof Error ? error.message : String(error)}`)
    }

    if (!result[0]) {
      throw new Error('Failed to create session note: No data returned from insert')
    }

    const createdNote = result[0]

    // Handle file attachments if provided
    if (input.tempAttachments && input.tempAttachments.length > 0) {
      await this.moveAndCreateAttachments(
        createdNote.id,
        createdNote.timetableId,
        input.tempAttachments,
        orgId,
        userId
      )
    }

    return createdNote
  }

  /**
   * Move files from temp and create attachment records
   * This is a reusable helper method
   */
  private async moveAndCreateAttachments(
    sessionNoteId: string,
    timetableId: string,
    tempAttachments: Array<{
      tempPath: string
      fileName: string
      fileSize: number
      mimeType: string
      originalName: string
    }>,
    orgId: string,
    userId: string
  ) {
    // Get timetable to find institutionLevelId
    const timetableResult = await this.db
      .select({
        classroomId: timetable.classroomId,
        classGroupId: timetable.classroomGroupId,
      })
      .from(timetable)
      .where(eq(timetable.id, timetableId))
      .limit(1)

    if (!timetableResult[0]) {
      throw new Error('Timetable not found')
    }

    let institutionLevelId: string | null = null

    // Get institutionLevelId from classroom or classGroup
    if (timetableResult[0].classroomId) {
      const classroomResult = await this.db
        .select({ institutionLevelId: educationLevel.institutionLevelId })
        .from(classroom)
        .leftJoin(educationLevel, eq(classroom.educationLevelId, educationLevel.id))
        .where(eq(classroom.id, timetableResult[0].classroomId))
        .limit(1)

      institutionLevelId = classroomResult[0]?.institutionLevelId || null
    } else if (timetableResult[0].classGroupId) {
      const classGroupResult = await this.db
        .select({ institutionLevelId: educationLevel.institutionLevelId })
        .from(classroomGroup)
        .leftJoin(classroom, eq(classroomGroup.classroomId, classroom.id))
        .leftJoin(educationLevel, eq(classroom.educationLevelId, educationLevel.id))
        .where(eq(classroomGroup.id, timetableResult[0].classGroupId))
        .limit(1)

      institutionLevelId = classGroupResult[0]?.institutionLevelId || null
    }

    if (!institutionLevelId) {
      throw new Error('Could not determine institution level for file storage')
    }

    // Destination directory for files
    const destinationDir = path.join(
      PUBLIC_DIR,
      'organization',
      orgId,
      'institution-level',
      institutionLevelId,
      'session-notes',
      sessionNoteId
    )

    // Move files and create attachment records
    for (const attachment of tempAttachments) {
      try {
        // Move file from temp to final destination
        // tempPath is a URL path like /tmp/filename.png, convert to filesystem path
        const tempFilePath = path.join(PUBLIC_DIR, attachment.tempPath)
        console.log(`Moving file from ${tempFilePath} to ${destinationDir}/${attachment.fileName}`)
        const finalPath = await moveFileFromTemp(
          tempFilePath,
          destinationDir,
          attachment.fileName
        )
        console.log(`File moved successfully to ${finalPath}`)

        // Create attachment record
        await this.db.insert(sessionNoteAttachment).values({
          sessionNoteId,
          fileName: attachment.fileName,
          fileUrl: finalPath,
          fileSize: attachment.fileSize.toString(),
          mimeType: attachment.mimeType,
          orgId,
          createdByUserId: userId,
        })
      } catch (error) {
        console.error(`Failed to move attachment ${attachment.fileName}:`, error)
        // Log the full error stack for debugging
        if (error instanceof Error) {
          console.error('Error stack:', error.stack)
        }
        // Re-throw to fail the entire operation if file move fails
        throw error
      }
    }
  }

  async updateSessionNote(sessionNoteId: string, input: UpdateSessionNoteInput, orgId: string, userId: string) {
    // Clean keywords if provided
    const updateData: any = { ...input }
    if (input.keywords !== undefined) {
      updateData.keywords = input.keywords ? cleanKeywords(input.keywords) : null
    }

    // Get existing note to find timetableId for file handling
    const existing = await this.db
      .select({ timetableId: sessionNote.timetableId })
      .from(sessionNote)
      .where(and(
        eq(sessionNote.id, sessionNoteId),
        eq(sessionNote.orgId, orgId),
        isNull(sessionNote.deletedAt)
      ))
      .limit(1)

    if (!existing[0]) {
      throw new Error('Session note not found')
    }

    // Remove tempAttachments from update data (handled separately)
    const tempAttachments = updateData.tempAttachments
    delete updateData.tempAttachments

    const result = await this.db
      .update(sessionNote)
      .set({
        ...updateData,
        updatedByUserId: userId,
      })
      .where(and(
        eq(sessionNote.id, sessionNoteId),
        eq(sessionNote.orgId, orgId),
        isNull(sessionNote.deletedAt)
      ))
      .returning({
        id: sessionNote.id,
        title: sessionNote.title,
        content: sessionNote.content,
        keywords: sessionNote.keywords,
        notes: sessionNote.notes,
        summary: sessionNote.summary,
        isPrivate: sessionNote.isPrivate,
        timetableId: sessionNote.timetableId,
        orgId: sessionNote.orgId,
        createdAt: sessionNote.createdAt,
        updatedAt: sessionNote.updatedAt,
        deletedAt: sessionNote.deletedAt,
      })

    if (!result[0] || result.length === 0) {
      throw new Error('Session note not found or failed to update')
    }

    // Handle new file attachments if provided
    if (tempAttachments && tempAttachments.length > 0) {
      await this.moveAndCreateAttachments(
        sessionNoteId,
        existing[0].timetableId,
        tempAttachments,
        orgId,
        userId
      )
    }

    return result[0]
  }

  async deleteSessionNote(sessionNoteId: string, orgId: string, userId: string) {
    const result = await this.db
      .update(sessionNote)
      .set({
        deletedAt: new Date(),
        deletedByUserId: userId,
      })
      .where(and(
        eq(sessionNote.id, sessionNoteId),
        eq(sessionNote.orgId, orgId),
        isNull(sessionNote.deletedAt)
      ))
      .returning({ id: sessionNote.id })

    if (!result[0] || result.length === 0) {
      throw new Error('Session note not found or failed to delete')
    }

    return { success: true }
  }

  async createSessionNoteAttachment(input: CreateSessionNoteAttachmentInput, orgId: string, userId: string) {
    const result = await this.db
      .insert(sessionNoteAttachment)
      .values({
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize || null,
        mimeType: input.mimeType || null,
        description: input.description || null,
        sessionNoteId: input.sessionNoteId,
        orgId,
        createdByUserId: userId,
      })
      .returning({
        id: sessionNoteAttachment.id,
        fileName: sessionNoteAttachment.fileName,
        fileUrl: sessionNoteAttachment.fileUrl,
        fileSize: sessionNoteAttachment.fileSize,
        mimeType: sessionNoteAttachment.mimeType,
        description: sessionNoteAttachment.description,
        sessionNoteId: sessionNoteAttachment.sessionNoteId,
        orgId: sessionNoteAttachment.orgId,
        createdAt: sessionNoteAttachment.createdAt,
        updatedAt: sessionNoteAttachment.updatedAt,
        deletedAt: sessionNoteAttachment.deletedAt,
      })

    if (!result[0]) {
      throw new Error('Failed to create session note attachment')
    }

    return result[0]
  }

  async deleteSessionNoteAttachment(attachmentId: string, orgId: string, userId: string) {
    const result = await this.db
      .update(sessionNoteAttachment)
      .set({
        deletedAt: new Date(),
        deletedByUserId: userId,
      })
      .where(and(
        eq(sessionNoteAttachment.id, attachmentId),
        eq(sessionNoteAttachment.orgId, orgId),
        isNull(sessionNoteAttachment.deletedAt)
      ))
      .returning({ id: sessionNoteAttachment.id })

    if (!result[0] || result.length === 0) {
      throw new Error('Session note attachment not found or failed to delete')
    }

    return { success: true }
  }
}

// Factory function to create service instance
export function createSessionNoteManagementService(db: NodePgDatabase) {
  return new SessionNoteManagementService(db)
}