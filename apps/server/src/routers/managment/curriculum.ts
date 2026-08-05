import { z } from 'zod'
import { db } from '../../db/index'
import { OrpcErrorHelper, getOrgId } from '../../lib/errors/orpc-errors'
import { authorized } from '../../lib/orpc'
import { Permission } from '../../types/rbac'
import { createCurriculumManagementService } from '../../services/managment/curriculum'
import {
  EducationLevelListItemSchema,
  EducationLevelSchema,
  EducationLevelSubjectSchema,
  EducationSubjectListItemSchema,
  EducationSubjectSchema,
  InstitutionLevelSchema,
} from '../../types/curriculum'

const curriculumService = createCurriculumManagementService(db)

export const curriculumManagementRouter = {
  // Education Subjects
  getEducationSubjectsList: authorized(Permission.CURRICULUM_READ)
    .output(z.array(EducationSubjectListItemSchema))
    .route({
      method: 'GET',
      path: '/management/curriculum/education-subjects',
      tags: ['Curriculum Management'],
      summary: 'List education subjects',
      description: 'Retrieves all education subjects with their associated education levels',
    })
    .handler(async ({ context }) => {
      const orgId = getOrgId(context)
      try {
        return await curriculumService.getEducationSubjectsList(orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch education subjects')
      }
    }),

  getEducationSubjectById: authorized(Permission.CURRICULUM_READ)
    .input(
      z.object({
        subjectId: z.uuid().describe('Education Subject ID'),
      })
    )
    .output(EducationSubjectSchema)
    .route({
      method: 'GET',
      path: '/management/curriculum/education-subjects/{subjectId}',
      tags: ['Curriculum Management'],
      summary: 'Get education subject',
      description: 'Retrieves a single education subject with its education levels',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      try {
        return await curriculumService.getEducationSubjectById(input.subjectId, orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch education subject')
      }
    }),

  // Education Levels
  getEducationLevelsList: authorized(Permission.CURRICULUM_READ)
    .input(z.object({}))
    .output(z.array(EducationLevelListItemSchema))
    .route({
      method: 'GET',
      path: '/management/curriculum/education-levels',
      tags: ['Curriculum Management'],
      summary: 'List education levels',
      description: 'Retrieves all education levels with their associated subjects for the organization',
    })
    .handler(async ({ context }) => {
      const orgId = getOrgId(context)
      try {
        return await curriculumService.getEducationLevelsList(orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch education levels')
      }
    }),

  getEducationLevelById: authorized(Permission.CURRICULUM_READ)
    .input(
      z.object({
        levelId: z.uuid().describe('Education Level ID'),
      })
    )
    .output(EducationLevelSchema)
    .route({
      method: 'GET',
      path: '/management/curriculum/education-levels/{levelId}',
      tags: ['Curriculum Management'],
      summary: 'Get education level',
      description: 'Retrieves a single education level by ID',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      try {
        return await curriculumService.getEducationLevelById(input.levelId, orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch education level')
      }
    }),

  // Institution Levels
  getInstitutionLevelsList: authorized(Permission.CURRICULUM_READ)
    .input(z.object({}))
    .output(z.array(InstitutionLevelSchema))
    .route({
      method: 'GET',
      path: '/management/curriculum/institution-levels',
      tags: ['Curriculum Management'],
      summary: 'List institution levels',
      description: 'Retrieves all institution levels (system-wide, not organization-specific)',
    })
    .handler(async () => {
      try {
        return await curriculumService.getInstitutionLevelsList()
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch institution levels')
      }
    }),

  getInstitutionLevelById: authorized(Permission.CURRICULUM_READ)
    .input(
      z.object({
        levelId: z.uuid().describe('Institution Level ID'),
      })
    )
    .output(InstitutionLevelSchema)
    .route({
      method: 'GET',
      path: '/management/curriculum/institution-levels/{levelId}',
      tags: ['Curriculum Management'],
      summary: 'Get institution level',
      description: 'Retrieves a single institution level by ID',
    })
    .handler(async ({ input }) => {
      try {
        return await curriculumService.getInstitutionLevelById(input.levelId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch institution level')
      }
    }),

  // Education Level-Subject Associations
  getEducationLevelSubjectsList: authorized(Permission.CURRICULUM_READ)
    .input(z.object({}))
    .output(z.array(EducationLevelSubjectSchema))
    .route({
      method: 'GET',
      path: '/management/curriculum/education-level-subjects',
      tags: ['Curriculum Management'],
      summary: 'List education level-subject associations',
      description: 'Retrieves all education level and subject associations',
    })
    .handler(async ({ context }) => {
      const orgId = getOrgId(context)
      try {
        return await curriculumService.getEducationLevelSubjectsList(orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch education level-subject associations')
      }
    }),

  getEducationLevelSubjectById: authorized(Permission.CURRICULUM_READ)
    .input(
      z.object({
        associationId: z.uuid().describe('Education Level-Subject Association ID'),
      })
    )
    .output(EducationLevelSubjectSchema)
    .route({
      method: 'GET',
      path: '/management/curriculum/education-level-subjects/{associationId}',
      tags: ['Curriculum Management'],
      summary: 'Get education level-subject association',
      description: 'Retrieves a single education level-subject association by ID',
    })
    .handler(async ({ input, context }) => {
      const orgId = getOrgId(context)
      try {
        return await curriculumService.getEducationLevelSubjectById(input.associationId, orgId)
      } catch (error) {
        throw OrpcErrorHelper.handleServiceError(error, 'Failed to fetch education level-subject association')
      }
    }),
}
