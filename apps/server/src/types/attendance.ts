import { z } from 'zod'

// Attendance Session Schema (groups all attendances for a timetable)
export const AttendanceSessionSchema = z.object({
  id: z.uuid(),
  timetableId: z.uuid(),
  generalNotes: z.string().nullable(),
  orgId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  // Joined data
  timetable: z.object({
    id: z.uuid(),
    title: z.string(),
    startDateTime: z.date(),
    endDateTime: z.date(),
  }),
  classroom: z.object({
    id: z.uuid(),
    name: z.string(),
  }).nullable(),
  classroomGroup: z.object({
    id: z.uuid(),
    name: z.string(),
  }).nullable(),
  createdBy: z.object({
    id: z.string(),
    name: z.string(),
    lastName: z.string(),
    userType: z.string(),
  }),
  attendances: z.array(z.object({
    id: z.uuid(),
    studentId: z.string(),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'SICK']),
    note: z.string().nullable(),
    student: z.object({
      id: z.string(),
      name: z.string(),
      lastName: z.string(),
    }),
  })),
})

// Attendance Session List Item Schema (for list view)
export const AttendanceSessionListItemSchema = z.object({
  id: z.uuid(),
  timetableId: z.uuid(),
  timetable: z.object({
    id: z.uuid(),
    title: z.string(),
    startDateTime: z.date(),
    endDateTime: z.date(),
  }),
  classroom: z.object({
    id: z.uuid(),
    name: z.string(),
  }).nullable(),
  classroomGroup: z.object({
    id: z.uuid(),
    name: z.string(),
  }).nullable(),
  createdBy: z.object({
    id: z.string(),
    name: z.string(),
    lastName: z.string(),
    userType: z.string(),
  }),
  studentsMarked: z.number(),
  totalStudents: z.number().optional(),
  createdAt: z.date(),
})

// Attendance Schema
export const AttendanceSchema = z.object({
  id: z.uuid(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'SICK']),
  note: z.string().nullable(),
  studentId: z.string(),
  timetableId: z.uuid(),
  orgId: z.string(),
  markedAt: z.date(),
  arrivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  // Joined data
  student: z.object({
    id: z.string(),
    name: z.string(),
    lastName: z.string(),
    email: z.string(),
  }),
  timetable: z.object({
    id: z.uuid(),
    title: z.string(),
    startDateTime: z.date(),
    endDateTime: z.date(),
  }),
})

// Attendance List Item Schema (simplified for list views)
export const AttendanceListItemSchema = z.object({
  id: z.uuid(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'SICK']),
  note: z.string().nullable(),
  studentId: z.string(),
  timetableId: z.uuid(),
  markedAt: z.date(),
  arrivedAt: z.date().nullable(),
  student: z.object({
    id: z.string(),
    name: z.string(),
    lastName: z.string(),
  }),
  timetable: z.object({
    id: z.uuid(),
    title: z.string(),
    startDateTime: z.date(),
  }),
})

// Input Schemas for Creating/Updating
export const CreateAttendanceInputSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'SICK']),
  note: z.string().optional(),
  studentId: z.string().min(1, 'Student is required'),
  timetableId: z.uuid(),
  arrivedAt: z.date().optional(),
})

export const UpdateAttendanceInputSchema = CreateAttendanceInputSchema.partial().omit({
  studentId: true,
  timetableId: true
})

// Bulk attendance creation for multiple students
export const CreateBulkAttendanceInputSchema = z.object({
  timetableId: z.uuid(),
  generalNotes: z.string().optional(),
  attendances: z.array(z.object({
    studentId: z.string().min(1, 'Student is required'),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'SICK']),
    note: z.string().optional(),
    arrivedAt: z.date().optional(),
  })).min(1, 'At least one attendance record is required'),
})

// Attendance Session creation (new approach)
export const CreateAttendanceSessionInputSchema = z.object({
  timetableId: z.uuid(),
  generalNotes: z.string().optional(),
  attendances: z.array(z.object({
    studentId: z.string().min(1, 'Student is required'),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'SICK']),
    note: z.string().optional(),
    arrivedAt: z.date().optional(),
  })).min(1, 'At least one attendance record is required'),
})

export const UpdateAttendanceSessionInputSchema = z.object({
  generalNotes: z.string().optional(),
  attendances: z.array(z.object({
    studentId: z.string().min(1, 'Student is required'),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'SICK']),
    note: z.string().optional(),
    arrivedAt: z.date().optional(),
  })).min(1, 'At least one attendance record is required'),
})

// Student basic info schema
export const StudentBasicInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastName: z.string(),
})

// Query Schemas
export const AttendanceQuerySchema = z.object({
  timetableId: z.uuid().optional(),
  studentId: z.string().optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'SICK']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  classroomId: z.uuid().optional(),
  classroomGroupId: z.uuid().optional(),
  educationSubjectId: z.uuid().optional(),
  createdByUserType: z.enum(['teacher', 'staff']).optional(),
  attendanceCreatedStartDate: z.date().optional(),
  attendanceCreatedEndDate: z.date().optional(),
})

// Attendance summary schemas
export const AttendanceSummarySchema = z.object({
  timetableId: z.uuid(),
  sessionTitle: z.string(),
  sessionStartDateTime: z.date(),
  totalStudents: z.number(),
  presentCount: z.number(),
  absentCount: z.number(),
  lateCount: z.number(),
  excusedCount: z.number(),
  sickCount: z.number(),
  notMarkedCount: z.number(),
})

export const StudentAttendanceSummarySchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  studentLastName: z.string(),
  totalSessions: z.number(),
  presentCount: z.number(),
  absentCount: z.number(),
  lateCount: z.number(),
  excusedCount: z.number(),
  sickCount: z.number(),
  attendanceRate: z.number(), // Percentage
})

// Type exports
export type AttendanceSession = z.infer<typeof AttendanceSessionSchema>
export type AttendanceSessionListItem = z.infer<typeof AttendanceSessionListItemSchema>
export type Attendance = z.infer<typeof AttendanceSchema>
export type AttendanceListItem = z.infer<typeof AttendanceListItemSchema>
export type CreateAttendanceInput = z.infer<typeof CreateAttendanceInputSchema>
export type UpdateAttendanceInput = z.infer<typeof UpdateAttendanceInputSchema>
export type CreateBulkAttendanceInput = z.infer<typeof CreateBulkAttendanceInputSchema>
export type CreateAttendanceSessionInput = z.infer<typeof CreateAttendanceSessionInputSchema>
export type UpdateAttendanceSessionInput = z.infer<typeof UpdateAttendanceSessionInputSchema>
export type StudentBasicInfo = z.infer<typeof StudentBasicInfoSchema>
export type AttendanceQuery = z.infer<typeof AttendanceQuerySchema>
export type AttendanceSummary = z.infer<typeof AttendanceSummarySchema>
export type StudentAttendanceSummary = z.infer<typeof StudentAttendanceSummarySchema>