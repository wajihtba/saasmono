import { educationLevel, educationLevelSubject, educationSubject, institutionLevel } from '@/db/schema/education'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { and, eq, isNull, or } from 'drizzle-orm'

export class CurriculumManagementService {
  private db: NodePgDatabase

  constructor(db: NodePgDatabase) {
    this.db = db
  }
  async getEducationSubjectsList(orgId: string) {
    const results = await this.db
      .select({
        subjectId: educationSubject.id,
        subjectName: educationSubject.name,
        subjectDisplayNameAr: educationSubject.displayNameAr,
        subjectDisplayDescriptionAr: educationSubject.displayDescriptionAr,
        subjectInstitutionLevelId: educationSubject.institutionLevelId,
        levelId: educationLevel.id,
        levelLevel: educationLevel.level,
        levelSection: educationLevel.section,
        levelDisplayNameAr: educationLevel.displayNameAr,
        isOptional: educationLevelSubject.isOptional,
      })
      .from(educationSubject)
      .leftJoin(educationLevelSubject, eq(educationLevelSubject.educationSubjectId, educationSubject.id))
      .leftJoin(educationLevel, eq(educationLevelSubject.educationLevelId, educationLevel.id))
      .where(
        and(
          eq(educationSubject.orgId, orgId),
          or(eq(educationLevelSubject.orgId, orgId), isNull(educationLevelSubject.orgId))
        )
      )

    const subjectsMap = new Map()
    // A subject can be linked to the same level by more than one row in
    // education_level_subject, and the join then repeats that level. Track the
    // level ids already collected per subject so each one is emitted once.
    const seenLevelsBySubject = new Map<string, Set<string>>()

    results.forEach((row) => {
      const subjectId = row.subjectId

      if (!subjectsMap.has(subjectId)) {
        subjectsMap.set(subjectId, {
          id: row.subjectId,
          name: row.subjectName,
          displayNameAr: row.subjectDisplayNameAr,
          displayDescriptionAr: row.subjectDisplayDescriptionAr,
          institutionLevelId: row.subjectInstitutionLevelId,
          educationLevels: [],
        })
        seenLevelsBySubject.set(subjectId, new Set())
      }

      const seenLevels = seenLevelsBySubject.get(subjectId)!

      if (row.levelId && !seenLevels.has(row.levelId)) {
        seenLevels.add(row.levelId)
        subjectsMap.get(subjectId).educationLevels.push({
          id: row.levelId,
          level: row.levelLevel!,
          section: row.levelSection,
          displayNameAr: row.levelDisplayNameAr,
          isOptional: row.isOptional ?? false,
        })
      }
    })

    return Array.from(subjectsMap.values())
  }

  // Get single education subject by ID
  async getEducationSubjectById(subjectId: string, orgId: string) {
    const result = await this.db
      .select({
        subjectId: educationSubject.id,
        subjectName: educationSubject.name,
        subjectDisplayNameAr: educationSubject.displayNameAr,
        subjectDisplayDescriptionAr: educationSubject.displayDescriptionAr,
        subjectInstitutionLevelId: educationSubject.institutionLevelId,
        levelId: educationLevel.id,
        levelLevel: educationLevel.level,
        levelSection: educationLevel.section,
        levelDisplayNameAr: educationLevel.displayNameAr,
        isOptional: educationLevelSubject.isOptional,
      })
      .from(educationSubject)
      .leftJoin(educationLevelSubject, eq(educationLevelSubject.educationSubjectId, educationSubject.id))
      .leftJoin(educationLevel, eq(educationLevelSubject.educationLevelId, educationLevel.id))
      .where(
        and(
          eq(educationSubject.id, subjectId),
          eq(educationSubject.orgId, orgId),
          or(eq(educationLevelSubject.orgId, orgId), isNull(educationLevelSubject.orgId))
        )
      )

    if (!result[0] || result.length === 0) {
      throw new Error('Education subject not found')
    }

    const subject = {
      id: result[0].subjectId,
      name: result[0].subjectName,
      displayNameAr: result[0].subjectDisplayNameAr,
      displayDescriptionAr: result[0].subjectDisplayDescriptionAr,
      institutionLevelId: result[0].subjectInstitutionLevelId,
      // Same de-duplication as getEducationSubjectsList: duplicate link rows
      // would otherwise repeat a level here too.
      educationLevels: Array.from(
        new Map(
          result
            .filter((row) => row.levelId !== null)
            .map((row) => [
              row.levelId!,
              {
                id: row.levelId!,
                level: row.levelLevel!,
                section: row.levelSection,
                displayNameAr: row.levelDisplayNameAr,
                isOptional: row.isOptional ?? false,
              },
            ])
        ).values()
      ),
    }

    return subject
  }

  // Get all education levels
  async getEducationLevelsList(orgId: string) {
    const results = await this.db
      .select({
        levelId: educationLevel.id,
        levelLevel: educationLevel.level,
        levelSection: educationLevel.section,
        levelDisplayNameAr: educationLevel.displayNameAr,
        levelDisplayNameEn: educationLevel.displayNameEn,
        levelDisplayNameFr: educationLevel.displayNameFr,
        levelInstitutionLevelId: educationLevel.institutionLevelId,
        levelIsDefault: educationLevel.isDefault,
        levelCreatedAt: educationLevel.createdAt,
        subjectId: educationSubject.id,
        subjectName: educationSubject.name,
        subjectDisplayNameAr: educationSubject.displayNameAr,
        subjectDisplayDescriptionAr: educationSubject.displayDescriptionAr,
        isOptional: educationLevelSubject.isOptional,
      })
      .from(educationLevel)
      .leftJoin(educationLevelSubject, eq(educationLevelSubject.educationLevelId, educationLevel.id))
      .leftJoin(educationSubject, eq(educationLevelSubject.educationSubjectId, educationSubject.id))
      .where(
        and(
          eq(educationLevel.orgId, orgId),
          or(eq(educationLevelSubject.orgId, orgId), isNull(educationLevelSubject.orgId))
        )
      )
      .orderBy(educationLevel.level)

    const levelsMap = new Map()

    results.forEach((row) => {
      const levelId = row.levelId

      if (!levelsMap.has(levelId)) {
        levelsMap.set(levelId, {
          id: row.levelId,
          level: row.levelLevel,
          section: row.levelSection,
          displayNameAr: row.levelDisplayNameAr,
          displayNameEn: row.levelDisplayNameEn,
          displayNameFr: row.levelDisplayNameFr,
          institutionLevelId: row.levelInstitutionLevelId,
          isDefault: row.levelIsDefault,
          createdAt: row.levelCreatedAt,
          educationSubjects: [],
        })
      }

      if (row.subjectId) {
        levelsMap.get(levelId).educationSubjects.push({
          id: row.subjectId,
          name: row.subjectName!,
          displayNameAr: row.subjectDisplayNameAr!,
          displayDescriptionAr: row.subjectDisplayDescriptionAr,
          isOptional: row.isOptional ?? false,
        })
      }
    })

    return Array.from(levelsMap.values())
  }

  // Get single education level by ID
  async getEducationLevelById(levelId: string, orgId: string) {
    const result = await this.db
      .select({
        levelId: educationLevel.id,
        levelLevel: educationLevel.level,
        levelSection: educationLevel.section,
        levelDisplayNameAr: educationLevel.displayNameAr,
        levelDisplayNameEn: educationLevel.displayNameEn,
        levelDisplayNameFr: educationLevel.displayNameFr,
        levelInstitutionLevelId: educationLevel.institutionLevelId,
        levelIsDefault: educationLevel.isDefault,
        levelCreatedAt: educationLevel.createdAt,
        subjectId: educationSubject.id,
        subjectName: educationSubject.name,
        subjectDisplayNameAr: educationSubject.displayNameAr,
        subjectDisplayDescriptionAr: educationSubject.displayDescriptionAr,
        isOptional: educationLevelSubject.isOptional,
      })
      .from(educationLevel)
      .leftJoin(educationLevelSubject, eq(educationLevelSubject.educationLevelId, educationLevel.id))
      .leftJoin(educationSubject, eq(educationLevelSubject.educationSubjectId, educationSubject.id))
      .where(
        and(
          eq(educationLevel.id, levelId),
          eq(educationLevel.orgId, orgId),
          or(eq(educationLevelSubject.orgId, orgId), isNull(educationLevelSubject.orgId))
        )
      )

    if (!result[0] || result.length === 0) {
      throw new Error('Education level not found')
    }

    const level = {
      id: result[0].levelId,
      level: result[0].levelLevel,
      section: result[0].levelSection,
      displayNameAr: result[0].levelDisplayNameAr,
      displayNameEn: result[0].levelDisplayNameEn,
      displayNameFr: result[0].levelDisplayNameFr,
      institutionLevelId: result[0].levelInstitutionLevelId,
      isDefault: result[0].levelIsDefault,
      createdAt: result[0].levelCreatedAt,
      educationSubjects: result
        .filter((row) => row.subjectId)
        .map((row) => ({
          id: row.subjectId!,
          name: row.subjectName!,
          displayNameAr: row.subjectDisplayNameAr!,
          displayDescriptionAr: row.subjectDisplayDescriptionAr,
          isOptional: row.isOptional ?? false,
        })),
    }

    return level
  }

  // Get all institution levels
  async getInstitutionLevelsList() {
    const levels = await this.db
      .select({
        id: institutionLevel.id,
        name: institutionLevel.name,
        displayNameAr: institutionLevel.displayNameAr,
        displayNameEn: institutionLevel.displayNameEn,
        displayNameFr: institutionLevel.displayNameFr,
      })
      .from(institutionLevel)

    return levels
  }

  // Get single institution level by ID
  async getInstitutionLevelById(levelId: string) {
    const result = await this.db
      .select({
        id: institutionLevel.id,
        name: institutionLevel.name,
        displayNameAr: institutionLevel.displayNameAr,
        displayNameEn: institutionLevel.displayNameEn,
        displayNameFr: institutionLevel.displayNameFr,
      })
      .from(institutionLevel)
      .where(eq(institutionLevel.id, levelId))

    if (result.length === 0) {
      throw new Error('Institution level not found')
    }

    const institutionLevelRecord = result[0]
    if (!institutionLevelRecord) {
      throw new Error('Institution level not found in result')
    }

    return institutionLevelRecord
  }

  // Get education level-subject associations
  async getEducationLevelSubjectsList(orgId: string) {
    const associations = await this.db
      .select({
        id: educationLevelSubject.id,
        educationLevelId: educationLevelSubject.educationLevelId,
        educationSubjectId: educationLevelSubject.educationSubjectId,
        isOptional: educationLevelSubject.isOptional,
        createdAt: educationLevelSubject.createdAt,
        levelDisplayNameAr: educationLevel.displayNameAr,
        levelLevel: educationLevel.level,
        levelSection: educationLevel.section,
        subjectName: educationSubject.name,
        subjectDisplayNameAr: educationSubject.displayNameAr,
      })
      .from(educationLevelSubject)
      .innerJoin(educationLevel, eq(educationLevelSubject.educationLevelId, educationLevel.id))
      .innerJoin(educationSubject, eq(educationLevelSubject.educationSubjectId, educationSubject.id))
      .where(eq(educationLevelSubject.orgId, orgId))
      .orderBy(educationLevel.level, educationSubject.name)

    return associations
  }

  // Get single education level-subject association by ID
  async getEducationLevelSubjectById(associationId: string, orgId: string) {
    const result = await this.db
      .select({
        id: educationLevelSubject.id,
        educationLevelId: educationLevelSubject.educationLevelId,
        educationSubjectId: educationLevelSubject.educationSubjectId,
        isOptional: educationLevelSubject.isOptional,
        createdAt: educationLevelSubject.createdAt,
        levelDisplayNameAr: educationLevel.displayNameAr,
        levelLevel: educationLevel.level,
        levelSection: educationLevel.section,
        subjectName: educationSubject.name,
        subjectDisplayNameAr: educationSubject.displayNameAr,
      })
      .from(educationLevelSubject)
      .innerJoin(educationLevel, eq(educationLevelSubject.educationLevelId, educationLevel.id))
      .innerJoin(educationSubject, eq(educationLevelSubject.educationSubjectId, educationSubject.id))
      .where(and(eq(educationLevelSubject.id, associationId), eq(educationLevelSubject.orgId, orgId)))

    if (result.length === 0) {
      throw new Error('Education level-subject association not found')
    }

    const association = result[0]
    if (!association) {
      throw new Error('Education level-subject association not found in result')
    }

    return association
  }
}

// Factory function to create service instance
export function createCurriculumManagementService(db: NodePgDatabase) {
  return new CurriculumManagementService(db)
}
