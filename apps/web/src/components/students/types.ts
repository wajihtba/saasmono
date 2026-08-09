/**
 * The student as the list route returns it. The table and the view sheet both
 * read this row, so it lives here rather than being declared twice — the two
 * copies had already drifted apart on `classroom.capacity`.
 */

export interface StudentListEducationLevel {
  id: string
  level: number
  displayNameAr: string | null
}

export interface StudentListClassroom {
  id: string
  name: string
  code: string
  academicYear: string
  enrollmentDate: Date
  enrollmentStatus: string
  educationLevel: StudentListEducationLevel
}

export interface StudentListItem {
  id: string
  name: string
  lastName: string
  email: string
  userType: 'student'
  createdAt: Date
  updatedAt: Date
  classroom: StudentListClassroom | null
}
