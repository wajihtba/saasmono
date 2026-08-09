import { z } from 'zod'
import { USER_TYPE_VALUES } from '../db/schema/enums'

// User Types — single source of truth is the `user_type` Postgres enum.
export type UserType = (typeof USER_TYPE_VALUES)[number]

export const UserTypeSchema = z.enum(USER_TYPE_VALUES)

// Input Schemas
export const UserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  userType: UserTypeSchema.optional(),
})

export const CreateParentStudentRelationSchema = z.object({
  parentId: z.string().min(1),
  studentId: z.string().min(1),
  relationshipType: z.string().optional().default('parent'),
})

export const CreateTeacherAssignmentSchema = z.object({
  teacherId: z.string().min(1),
  educationSubjectId: z.uuid(),
  educationLevelId: z.uuid(),
})

export const UpdateTeacherAssignmentSchema = z.object({
  educationSubjectId: z.uuid().optional(),
  educationLevelId: z.uuid().optional(),
})

export const CreateStudentEnrollmentSchema = z.object({
  studentId: z.string().min(1),
  classroomId: z.uuid(),
  enrollmentDate: z.coerce.date().optional(),
})

export const CreateStudentGroupMembershipSchema = z.object({
  studentId: z.string().min(1),
  classroomGroupId: z.uuid(),
  educationSubjectId: z.uuid().optional(),
})

export const UpdateStudentEnrollmentStatusSchema = z.object({
  enrollmentId: z.uuid(),
  status: z.enum(['active', 'inactive', 'transferred']),
})

export const UpdateStudentGroupMembershipStatusSchema = z.object({
  membershipId: z.uuid(),
  isActive: z.boolean(),
})

// Output Schemas - Using coerce for date strings from API
/**
 * The relation row as the create/update routes and `parentChildrenRelations`
 * actually return it. It carries ids only — the names of the two people are
 * read through the parent and student routes, which join them.
 */
export const ParentStudentRelationSchema = z.object({
  id: z.string(),
  parentId: z.string(),
  studentId: z.string(),
  relationshipType: z.string(),
  createdAt: z.coerce.date(),
})

export const TeacherAssignmentSchema = z.object({
  id: z.string(),
  teacherId: z.string(),
  educationSubjectId: z.string(),
  educationLevelId: z.string(),
  orgId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  deletedAt: z.coerce.date().optional().nullable(),
})

export const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastName: z.string(),
  email: z.email(),
  userType: UserTypeSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  parentChildrenRelations: z.array(ParentStudentRelationSchema),
  teacherAssignments: z.array(TeacherAssignmentSchema),
})

export const UserListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastName: z.string(),
  email: z.email(),
  userType: UserTypeSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
})

// Enhanced Teacher schemas with nested classroom and subject data
export const TeacherSubjectAssignmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayNameAr: z.string(),
  role: z.string(),
  isMainTeacher: z.boolean(),
  assignmentId: z.string(),
})

export const TeacherClassroomSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  academicYear: z.string(),
  educationLevel: z.object({
    id: z.string(),
    level: z.number(),
    displayNameAr: z.string().nullable(),
  }),
  subjects: z.array(TeacherSubjectAssignmentSchema),
})

export const TeacherWithAssignmentsSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastName: z.string(),
  email: z.email(),
  userType: z.literal('teacher'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  classrooms: z.array(TeacherClassroomSchema),
})

// Student schemas
export const StudentParentSchema = z.object({
  relationId: z.string(),
  parentId: z.string(),
  parentName: z.string(),
  parentLastName: z.string(),
  parentemail: z.email(),
  relationshipType: z.string(),
  createdAt: z.coerce.date(),
})

export const StudentEducationLevelSchema = z.object({
  id: z.string(),
  level: z.number(),
  displayNameAr: z.string().nullable(),
  displayNameEn: z.string().nullable(),
  displayNameFr: z.string().nullable(),
  section: z.string().nullable(),
})

export const StudentClassroomSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  academicYear: z.string(),
  capacity: z.number().nullable(),
  enrollmentDate: z.coerce.date(),
  enrollmentStatus: z.string(),
  educationLevel: StudentEducationLevelSchema,
})

export const StudentSubjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayNameAr: z.string().nullable(),
  displayNameEn: z.string().nullable(),
  displayNameFr: z.string().nullable(),
})

export const StudentTeacherSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastName: z.string(),
  email: z.email(),
  role: z.string(),
  isMainTeacher: z.boolean(),
  assignmentId: z.string(),
})

export const StudentSubjectWithTeachersSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayNameAr: z.string().nullable(),
  displayNameEn: z.string().nullable(),
  displayNameFr: z.string().nullable(),
  teachers: z.array(StudentTeacherSchema),
})

export const StudentGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  maxCapacity: z.number().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  subject: StudentSubjectSchema.nullable(),
  membershipId: z.string(),
})

export const StudentDetailedResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastName: z.string(),
  email: z.email(),
  userType: z.literal('student'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  parents: z.array(StudentParentSchema),
  classroom: StudentClassroomSchema.nullable(),
  groups: z.array(StudentGroupSchema),
  subjects: z.array(StudentSubjectWithTeachersSchema),
})

export const StudentListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastName: z.string(),
  email: z.email(),
  userType: z.literal('student'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  classroom: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    academicYear: z.string(),
    enrollmentDate: z.coerce.date(),
    enrollmentStatus: z.string(),
    educationLevel: z.object({
      id: z.string(),
      level: z.number(),
      displayNameAr: z.string().nullable(),
    }),
  }).nullable(),
})

export const StudentEnrollmentSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  classroomId: z.string(),
  enrollmentDate: z.coerce.date(),
  status: z.string(),
  orgId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
})

export const StudentGroupMembershipSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  classroomGroupId: z.string(),
  educationSubjectId: z.string().nullable(),
  isActive: z.boolean(),
  orgId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
})

// Parent schemas - following teacher pattern
export const ParentChildSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastName: z.string(),
  email: z.email(),
  createdAt: z.coerce.date(),
  relationshipType: z.string(),
  relationId: z.string(),
  relationCreatedAt: z.coerce.date(),
  classroom: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    academicYear: z.string(),
    enrollmentStatus: z.string(),
    enrollmentDate: z.coerce.date(),
    educationLevel: z.object({
      id: z.string(),
      level: z.number(),
      displayNameAr: z.string().nullable(),
    }),
  }).nullable(),
})

export const ParentWithChildrenSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastName: z.string(),
  email: z.email(),
  userType: z.literal('parent'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  children: z.array(ParentChildSchema),
})

export const ParentDetailedResponseSchema = ParentWithChildrenSchema

export const UpdateParentStudentRelationSchema = z.object({
  relationId: z.uuid(),
  relationshipType: z.string().optional(),
})

// Type exports
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>
export type CreateParentStudentRelationInput = z.infer<typeof CreateParentStudentRelationSchema>
export type CreateTeacherAssignmentInput = z.infer<typeof CreateTeacherAssignmentSchema>
export type UpdateTeacherAssignmentInput = z.infer<typeof UpdateTeacherAssignmentSchema>
export type CreateStudentEnrollmentInput = z.infer<typeof CreateStudentEnrollmentSchema>
export type CreateStudentGroupMembershipInput = z.infer<typeof CreateStudentGroupMembershipSchema>
export type UpdateStudentEnrollmentStatusInput = z.infer<typeof UpdateStudentEnrollmentStatusSchema>
export type UpdateStudentGroupMembershipStatusInput = z.infer<typeof UpdateStudentGroupMembershipStatusSchema>
export type UserResponse = z.infer<typeof UserResponseSchema>
export type UserListItem = z.infer<typeof UserListItemSchema>
export type ParentStudentRelation = z.infer<typeof ParentStudentRelationSchema>
export type TeacherAssignment = z.infer<typeof TeacherAssignmentSchema>
export type TeacherWithAssignments = z.infer<typeof TeacherWithAssignmentsSchema>
export type TeacherClassroom = z.infer<typeof TeacherClassroomSchema>
export type TeacherSubjectAssignment = z.infer<typeof TeacherSubjectAssignmentSchema>
export type StudentDetailedResponse = z.infer<typeof StudentDetailedResponseSchema>
export type StudentListItem = z.infer<typeof StudentListItemSchema>
export type StudentParent = z.infer<typeof StudentParentSchema>
export type StudentClassroom = z.infer<typeof StudentClassroomSchema>
export type StudentGroup = z.infer<typeof StudentGroupSchema>
export type StudentSubject = z.infer<typeof StudentSubjectSchema>
export type StudentTeacher = z.infer<typeof StudentTeacherSchema>
export type StudentSubjectWithTeachers = z.infer<typeof StudentSubjectWithTeachersSchema>
export type StudentEnrollment = z.infer<typeof StudentEnrollmentSchema>
export type StudentGroupMembership = z.infer<typeof StudentGroupMembershipSchema>
export type ParentChild = z.infer<typeof ParentChildSchema>
export type ParentWithChildren = z.infer<typeof ParentWithChildrenSchema>
export type ParentDetailedResponse = z.infer<typeof ParentDetailedResponseSchema>
export type UpdateParentStudentRelationInput = z.infer<typeof UpdateParentStudentRelationSchema>
