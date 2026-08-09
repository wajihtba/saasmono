import { z } from 'zod'

// Session Note Schema
export const SessionNoteSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  content: z.string(),
  // Cornell Notes fields
  keywords: z.string().nullable(), // Comma-separated, cleaned keywords
  notes: z.string().nullable(), // QuillJS Delta JSON
  summary: z.string().nullable(), // Summary text
  isPrivate: z.boolean(),
  timetableId: z.uuid(),
  orgId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  // Joined data
  timetable: z.object({
    id: z.uuid(),
    title: z.string(),
    startDateTime: z.date(),
    endDateTime: z.date(),
  }),
  createdBy: z.object({
    id: z.string(),
    name: z.string(),
    lastName: z.string(),
  }),
  attachments: z.array(z.object({
    id: z.uuid(),
    fileName: z.string(),
    fileUrl: z.string(),
    fileSize: z.string().nullable(),
    mimeType: z.string().nullable(),
    description: z.string().nullable(),
  })).optional(),
})

// Session Note List Item Schema (simplified for list views)
export const SessionNoteListItemSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  isPrivate: z.boolean(),
  timetableId: z.uuid(),
  createdAt: z.date(),
  /** Author, so a client can tell the rows its actor may edit from the rest. */
  createdById: z.string(),
  timetable: z.object({
    id: z.uuid(),
    title: z.string(),
    startDateTime: z.date(),
  }),
  attachmentCount: z.number().optional(),
})

// Session Note Attachment Schema
export const SessionNoteAttachmentSchema = z.object({
  id: z.uuid(),
  fileName: z.string(),
  fileUrl: z.string(),
  fileSize: z.string().nullable(),
  mimeType: z.string().nullable(),
  description: z.string().nullable(),
  sessionNoteId: z.uuid(),
  orgId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})

// Input Schemas for Creating/Updating
export const CreateSessionNoteInputSchema = z.object({
  title: z.string().min(1, 'Note title is required'),
  content: z.string().min(1, 'Note content is required'),
  // Cornell Notes fields
  keywords: z.string().optional(), // Will be cleaned on backend
  notes: z.string().optional(), // QuillJS Delta JSON
  summary: z.string().optional(),
  isPrivate: z.boolean().default(false),
  timetableId: z.uuid(),
  // Temp file paths for attachments (will be moved on save)
  tempAttachments: z.array(z.object({
    tempPath: z.string(),
    fileName: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
    originalName: z.string(),
  })).optional(),
})

export const UpdateSessionNoteInputSchema = CreateSessionNoteInputSchema.partial().omit({ timetableId: true })

export const CreateSessionNoteAttachmentInputSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().url('Valid file URL is required'),
  fileSize: z.string().optional(),
  mimeType: z.string().optional(),
  description: z.string().optional(),
  sessionNoteId: z.uuid(),
})

// Query Schemas
export const SessionNoteQuerySchema = z.object({
  timetableId: z.uuid().optional(),
  isPrivate: z.boolean().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})

// Type exports
export type SessionNote = z.infer<typeof SessionNoteSchema>
export type SessionNoteListItem = z.infer<typeof SessionNoteListItemSchema>
export type SessionNoteAttachment = z.infer<typeof SessionNoteAttachmentSchema>
export type CreateSessionNoteInput = z.infer<typeof CreateSessionNoteInputSchema>
export type UpdateSessionNoteInput = z.infer<typeof UpdateSessionNoteInputSchema>
export type CreateSessionNoteAttachmentInput = z.infer<typeof CreateSessionNoteAttachmentInputSchema>
export type SessionNoteQuery = z.infer<typeof SessionNoteQuerySchema>