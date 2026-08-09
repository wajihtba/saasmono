import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { cleanupByOrganizationId } from '../../../tests/helpers/cleanup'
import { seedDatabase, type SeedData } from '../../../tests/helpers/init'
import app from '../../app'
import {
  StudentDetailedResponseSchema,
  StudentEnrollmentSchema,
  StudentGroupMembershipSchema,
  StudentListItemSchema,
  SuccessResponseSchema,
} from '../../types/user'

describe('/management/students/ API Tests', () => {
  let testData: SeedData

  beforeAll(async () => {
    // Init db with mocked data using init helper - creates new random organization
    testData = await seedDatabase()
  })

  afterAll(async () => {
    // Clean up the database data for this test organization
    if (testData.organization?.id) {
      await cleanupByOrganizationId(testData.organization.id)
    }
  })

  describe('getStudentById', () => {
    it('should return detailed student information', async () => {
      const { adminCookie } = testData
      const student = testData.users.find((u) => u.userType === 'student')

      if (!student) {
        throw new Error('Student user not found in test data')
      }

      const res = await request(app)
        .get(`/api/management/students/${student.id}`)
        .set('Cookie', adminCookie)

      expect(res.status).toBe(200)

      // Validate response structure using Zod schema
      const validationResult = StudentDetailedResponseSchema.safeParse(res.body)
      if (!validationResult.success) {
        console.error('Student detailed response validation errors:', validationResult.error.issues)
      }
      expect(validationResult.success).toBe(true)

      // Validate specific fields
      expect(res.body.id).toBe(student.id)
      expect(res.body.name).toBe(student.name)
      expect(res.body.lastName).toBe(student.lastName)
      expect(res.body.email).toBe(student.email)
      expect(res.body.userType).toBe('student')
      expect(Array.isArray(res.body.parents)).toBe(true)
      expect(Array.isArray(res.body.groups)).toBe(true)
      expect(Array.isArray(res.body.subjects)).toBe(true)
    })

    it('should return 404 for non-existent student', async () => {
      const { adminCookie } = testData

      const res = await request(app)
        .get('/api/management/students/non-existent-id')
        .set('Cookie', adminCookie)

      expect(res.status).toBe(404)
    })
  })

  describe('getStudentsList', () => {
    it('should return list of students', async () => {
      const { adminCookie } = testData

      const res = await request(app)
        .get('/api/management/students/list')
        .set('Cookie', adminCookie)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)

      if (res.body.length > 0) {
        const validationResult = StudentListItemSchema.safeParse(res.body[0])
        if (!validationResult.success) {
          console.error('Student list item validation errors:', validationResult.error.issues)
        }
        expect(validationResult.success).toBe(true)
      }
    })

    it('should filter students by classroom', async () => {
      const { adminCookie } = testData
      const classroom = testData.classrooms?.[0]

      if (!classroom) {
        console.log('No classroom found in test data, skipping test')
        return
      }

      const res = await request(app)
        .get(`/api/management/students/list?classroomId=${classroom.id}`)
        .set('Cookie', adminCookie)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('createStudentEnrollment', () => {
    it('should create student enrollment successfully', async () => {
      const { adminCookie } = testData
      const student = testData.users.find((u) => u.userType === 'student')
      const classroom = testData.classrooms?.[0]

      if (!student || !classroom) {
        throw new Error('Student or classroom not found in test data')
      }

      const enrollmentData = {
        studentId: student.id,
        classroomId: classroom.id,
      }

      const res = await request(app)
        .post('/api/management/student-enrollments')
        .send(enrollmentData)
        .set('Cookie', adminCookie)

      expect(res.status).toBe(200)

      // Validate response structure
      const validationResult = StudentEnrollmentSchema.safeParse(res.body)
      if (!validationResult.success) {
        console.error('Student enrollment validation errors:', validationResult.error.issues)
      }
      expect(validationResult.success).toBe(true)

      expect(res.body.studentId).toBe(enrollmentData.studentId)
      expect(res.body.classroomId).toBe(enrollmentData.classroomId)
      expect(res.body.status).toBe('active')
      expect(res.body.id).toBeDefined()
      expect(res.body.createdAt).toBeDefined()
    })

    it('should reject enrollment with invalid classroom ID', async () => {
      const { adminCookie } = testData
      const student = testData.users.find((u) => u.userType === 'student')

      const enrollmentData = {
        studentId: student!.id,
        classroomId: 'invalid-classroom-id',
      }

      const res = await request(app)
        .post('/api/management/student-enrollments')
        .send(enrollmentData)
        .set('Cookie', adminCookie)

      expect(res.status).toBe(400)
    })

    it('should reject enrollment with non-existent student', async () => {
      const { adminCookie } = testData
      const classroom = testData.classrooms?.[0]

      const enrollmentData = {
        studentId: 'non-existent-student-id',
        classroomId: classroom!.id,
      }

      const res = await request(app)
        .post('/api/management/student-enrollments')
        .send(enrollmentData)
        .set('Cookie', adminCookie)

      expect(res.status).toBe(404)
    })
  })

  describe('updateStudentEnrollmentStatus', () => {
    it('should update enrollment status successfully', async () => {
      const { adminCookie } = testData
      const student = testData.users.find((u) => u.userType === 'student')
      const classroom = testData.classrooms?.[0]

      if (!student || !classroom) {
        throw new Error('Student or classroom not found in test data')
      }

      // First create an enrollment
      const createRes = await request(app)
        .post('/api/management/student-enrollments')
        .send({
          studentId: student.id,
          classroomId: classroom.id,
        })
        .set('Cookie', adminCookie)

      expect(createRes.status).toBe(200)
      const enrollmentId = createRes.body.id

      // Then update its status
      const updateData = {
        enrollmentId: enrollmentId,
        status: 'inactive',
      }

      const updateRes = await request(app)
        .put(`/api/management/student-enrollments/${enrollmentId}/status`)
        .send(updateData)
        .set('Cookie', adminCookie)

      expect(updateRes.status).toBe(200)

      // Validate response structure
      const validationResult = StudentEnrollmentSchema.safeParse(updateRes.body)
      expect(validationResult.success).toBe(true)

      expect(updateRes.body.status).toBe('inactive')
      expect(updateRes.body.updatedAt).toBeDefined()
    })

    it('should return 404 for non-existent enrollment', async () => {
      const { adminCookie } = testData

      const res = await request(app)
        .put('/api/management/student-enrollments/550e8400-e29b-41d4-a716-446655440000/status')
        .send({
          enrollmentId: '550e8400-e29b-41d4-a716-446655440000',
          status: 'inactive',
        })
        .set('Cookie', adminCookie)

      expect(res.status).toBe(404)
    })
  })

  describe('createStudentGroupMembership', () => {
    it('should create group membership successfully', async () => {
      const { adminCookie } = testData
      const student = testData.users.find((u) => u.userType === 'student')
      const classroomGroup = testData.classroomGroups?.[0]

      if (!student || !classroomGroup) {
        console.log('Student or classroom group not found in test data, skipping test')
        return
      }

      const membershipData = {
        studentId: student.id,
        classroomGroupId: classroomGroup.id,
      }

      const res = await request(app)
        .post('/api/management/student-group-memberships')
        .send(membershipData)
        .set('Cookie', adminCookie)

      expect(res.status).toBe(200)

      // Validate response structure
      const validationResult = StudentGroupMembershipSchema.safeParse(res.body)
      if (!validationResult.success) {
        console.error('Group membership validation errors:', validationResult.error.issues)
      }
      expect(validationResult.success).toBe(true)

      expect(res.body.studentId).toBe(membershipData.studentId)
      expect(res.body.classroomGroupId).toBe(membershipData.classroomGroupId)
      expect(res.body.isActive).toBe(true)
      expect(res.body.id).toBeDefined()
      expect(res.body.createdAt).toBeDefined()
    })
  })

  describe('updateStudentGroupMembershipStatus', () => {
    it('should update group membership status successfully', async () => {
      const { adminCookie } = testData
      const student = testData.users.find((u) => u.userType === 'student')
      const classroomGroup = testData.classroomGroups?.[0]

      if (!student || !classroomGroup) {
        console.log('Student or classroom group not found in test data, skipping test')
        return
      }

      // First create a membership
      const createRes = await request(app)
        .post('/api/management/student-group-memberships')
        .send({
          studentId: student.id,
          classroomGroupId: classroomGroup.id,
        })
        .set('Cookie', adminCookie)

      expect(createRes.status).toBe(200)
      const membershipId = createRes.body.id

      // Then update its status
      const updateData = {
        membershipId: membershipId,
        isActive: false,
      }

      const updateRes = await request(app)
        .put(`/api/management/student-group-memberships/${membershipId}/status`)
        .send(updateData)
        .set('Cookie', adminCookie)

      expect(updateRes.status).toBe(200)

      // Validate response structure
      const validationResult = StudentGroupMembershipSchema.safeParse(updateRes.body)
      expect(validationResult.success).toBe(true)

      expect(updateRes.body.isActive).toBe(false)
      expect(updateRes.body.updatedAt).toBeDefined()
    })
  })

  describe('getStudentsByClassroom', () => {
    it('should return students in specific classroom', async () => {
      const { adminCookie } = testData
      const classroom = testData.classrooms?.[0]

      if (!classroom) {
        console.log('No classroom found in test data, skipping test')
        return
      }

      const res = await request(app)
        .get(`/api/management/classrooms/${classroom.id}/students`)
        .set('Cookie', adminCookie)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('getStudentsByEducationLevel', () => {
    it('should return students by education level', async () => {
      const { adminCookie } = testData
      const educationLevel = testData.educationLevels?.[0]

      if (!educationLevel) {
        console.log('No education level found in test data, skipping test')
        return
      }

      const res = await request(app)
        .get(`/api/management/education-levels/${educationLevel.id}/students`)
        .set('Cookie', adminCookie)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for all student endpoints', async () => {
      const student = testData.users.find((u) => u.userType === 'student')
      const classroom = testData.classrooms?.[0]

      // Test all endpoints without authentication
      const endpoints = [
        { method: 'get', path: `/api/management/students/${student?.id}` },
        { method: 'get', path: '/api/management/students/list' },
        { method: 'post', path: '/api/management/student-enrollments' },
        { method: 'put', path: '/api/management/student-enrollments/some-id/status' },
        { method: 'post', path: '/api/management/student-group-memberships' },
        { method: 'put', path: '/api/management/student-group-memberships/some-id/status' },
        { method: 'get', path: `/api/management/classrooms/${classroom?.id}/students` },
      ]

      for (const endpoint of endpoints) {
        const agent = request(app)
        const res = await (endpoint.method === 'get'
          ? agent.get(endpoint.path)
          : endpoint.method === 'post'
            ? agent.post(endpoint.path)
            : agent.put(endpoint.path))
        expect(res.status).toBe(401)
      }
    })
  })
})