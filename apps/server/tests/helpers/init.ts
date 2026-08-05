import { faker } from '@faker-js/faker'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as authSchema from '../../src/db/schema/auth'
import * as usersSchema from '../../src/db/schema/users'
import * as educationSchema from '../../src/db/schema/education'
import { seedInstitutionLevels, seedSecondaireEducation } from '../../src/db/seeds/utils/seedEducation'
import { auth } from '../../src/lib/auth'
import { Role, type UserType } from '../../src/types/rbac'
import { testDb } from '../setup'

export interface TestUser {
  id: string
  name: string
  lastName: string
  email: string
  emailVerified: boolean
  userType: UserType
}

export interface TestAccount {
  id: string
  accountId: string
  providerId: string
  userId: string
  password: string
}

export interface TestOrganization {
  id: string
  name: string
  slug: string
  createdAt: Date
}

export interface TestMember {
  id: string
  organizationId: string
  userId: string
  role: Role
  createdAt: Date
}

export interface TestEducationLevel {
  id: string
  institutionLevelId: string
  level: number
  displayNameEn?: string
  displayNameFr?: string
  displayNameAr?: string
  orgId: string
}

export interface TestEducationSubject {
  id: string
  institutionLevelId: string
  name: string
  displayNameEn: string
  displayNameFr: string
  displayNameAr: string
  orgId: string
}

export interface SeedData {
  organization: TestOrganization
  users: TestUser[]
  admin: TestUser
  adminCookie: string
  accounts: TestAccount[]
  members: TestMember[]
  educationLevels: TestEducationLevel[]
  educationSubjects: TestEducationSubject[]
}

export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: `user_test_${faker.string.nanoid(8)}`,
  name: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
  emailVerified: true,
  userType: 'student',
  ...overrides,
})

export const createTestOrganization = (overrides: Partial<TestOrganization> = {}): TestOrganization => ({
  id: `org_test_${faker.string.nanoid(8)}`,
  name: `Test ${faker.company.name()}`,
  slug: `test-${faker.string.alphanumeric(8).toLowerCase()}`,
  createdAt: new Date(),
  ...overrides,
})

export const seedDatabase = async (customData?: Partial<SeedData>): Promise<SeedData> => {
  const testOrg = createTestOrganization(customData?.organization)

  const defaultUsers: TestUser[] = [
    createTestUser({ userType: 'staff', email: 'test-staff@example.com' }),
    createTestUser({ userType: 'parent', email: 'test-parent@example.com' }),
    createTestUser({ userType: 'teacher', email: 'test-teacher@example.com' }),
    createTestUser({ userType: 'student', email: 'test-student@example.com' }),
  ]

  const testUsers = customData?.users || defaultUsers

  // Create accounts with default password (matching seed file pattern)

  const hashedPassword = await (await auth.$context).password.hash('password1234')
  const testAccounts: TestAccount[] = testUsers.map((user) => ({
    id: `account_${user.id}`,
    accountId: user.id,
    providerId: 'credential',
    userId: user.id,
    password: hashedPassword, // In real tests, this should be properly hashed
  }))

  // set active organization
  // await auth.api.set
  // Create organization memberships
  const testMembers: TestMember[] = testUsers.map((user) => ({
    id: `member_${user.id}`,
    organizationId: testOrg.id,
    userId: user.id,
    // Staff members in tests act as organization admins so existing suites keep
    // their organization-wide access; everyone else maps one-to-one.
    role: user.userType === 'staff' ? Role.ADMIN : (user.userType as unknown as Role),
    createdAt: new Date(),
  }))

  // Create education db instance with proper schema
  const educationDb = drizzle(process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5004/manarah_test', { schema: educationSchema })

  // Seed institution levels first
  await seedInstitutionLevels(educationDb)

  // Run all operations in a transaction (following seed file pattern)
  await testDb.transaction(async (tx) => {
    // Insert organization
    await tx.insert(authSchema.organization).values(testOrg)

    // Insert users
    await tx.insert(authSchema.user).values(testUsers)

    // Insert accounts
    await tx.insert(authSchema.account).values(testAccounts)

    // Insert organization memberships
    await tx.insert(authSchema.member).values(testMembers)
  })

  // Seed education data after organization is created
  const educationData = await seedSecondaireEducation(educationDb, testOrg.id)

  let cookies: string | null = ''
  try {
    const loginAdmin = await auth.api.signInEmail({
      body: {
        email: 'test-staff@example.com',
        password: 'password1234',
      },
      asResponse: true,
    })

    cookies = loginAdmin.headers.get('set-cookie')
    // TODO: Add setActiveOrganization API call when available
    // await auth.api.setActiveOrganization({
    //   body: {
    //     organizationId: testOrg.id,
    //   },
    //   headers: {
    //     'Content-Type': 'application/json',
    //     Cookie: cookies!, // <-- pass cookie here
    //   },
    // })
  } catch (e) {
    console.log('Could not login')
    console.log(e)
    throw new Error('Could not login')
  }
  return {
    organization: testOrg,
    users: testUsers,
    // Staff is seeded with the organization admin role — see testMembers below.
    admin: testUsers.find((user) => user.userType === 'staff') as TestUser,
    adminCookie: cookies!,
    accounts: testAccounts,
    members: testMembers,
    educationLevels: educationData.educationLevels.map(level => ({
      ...level,
      displayNameEn: level.displayNameEn ?? undefined,
      displayNameFr: level.displayNameFr ?? undefined,
      displayNameAr: level.displayNameAr ?? undefined,
    })) as TestEducationLevel[],
    educationSubjects: educationData.educationSubjects,
  }
}

export const cleanupDatabase = async (): Promise<void> => {
  // Clean up test data in proper order (respecting foreign key constraints)
  // Following the same pattern as the reset.ts file
  await testDb.transaction(async (tx) => {
    // Delete in order that respects foreign key constraints
    await tx.delete(usersSchema.parentStudentRelation)
    await tx.delete(usersSchema.organizationConfig)
    await tx.delete(authSchema.invitation)
    await tx.delete(authSchema.member)
    await tx.delete(authSchema.session)
    await tx.delete(authSchema.account)
    await tx.delete(authSchema.verification)
    await tx.delete(authSchema.user)
    await tx.delete(authSchema.organization)
  })
}

export const findUserByEmail = async (email: string): Promise<TestUser | null> => {
  const result = await testDb.select().from(authSchema.user).where(eq(authSchema.user.email, email)).limit(1)

  return (result[0] as TestUser) || null
}

export const findOrganizationBySlug = async (slug: string): Promise<TestOrganization | null> => {
  const result = await testDb
    .select()
    .from(authSchema.organization)
    .where(eq(authSchema.organization.slug, slug))
    .limit(1)

  return (result[0] as TestOrganization) || null
}

// Helper to create authenticated test user with proper password hashing
export const createAuthenticatedTestUser = async (
  overrides: Partial<TestUser> = {}
): Promise<{ user: TestUser; account: TestAccount }> => {
  const user = createTestUser(overrides)

  // For tests, we use a simple password hash placeholder
  // In production tests, you would use the actual auth system to hash passwords
  const account: TestAccount = {
    id: `account_${user.id}`,
    accountId: user.id,
    providerId: 'credential',
    userId: user.id,
    password: 'test_hashed_password', // Replace with actual hashing in production
  }

  return { user, account }
}
