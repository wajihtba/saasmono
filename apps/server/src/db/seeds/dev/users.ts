import { faker } from '@faker-js/faker'
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import pkg from 'pg'
import { auth } from '../../../lib/auth'
import * as authSchema from '../../schema/auth'
import * as usersSchema from '../../schema/users'
import { Role, type UserType } from '../../../types/rbac'
config()
const { Pool } = pkg

interface SeedUser {
  id: string
  name: string
  lastName: string
  email: string
  emailVerified: boolean
  /** Domain label. */
  userType: UserType
  /** Organization role — the authorization source of truth. */
  orgRole: Role
}

interface SeedAccount {
  id: string
  accountId: string
  providerId: string
  userId: string
  password: string
}

interface SeedOrganization {
  id: string
  name: string
  slug: string
  createdAt: Date
}

interface SeedMember {
  id: string
  organizationId: string
  userId: string
  role: Role
  createdAt: Date
}

interface SeedParentStudentRelation {
  parentId: string
  studentId: string
  relationshipType: string
}

interface SeedOrganizationConfig {
  orgId: string
  institutionLevels: string[]
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
  })

  const db = drizzle(pool, { schema: { ...authSchema, ...usersSchema } })

  // Hash the default password "1234" using Node.js scrypt (same as Better Auth uses)
  const hashedPassword = await (await auth.$context).password.hash('password1234')
  const defaultPassword = hashedPassword

  // Create organization
  const organization: SeedOrganization = {
    id: 'org_default_school',
    name: 'Default School Organization',
    slug: 'default-school',
    createdAt: new Date(),
  }

  // Create users, one per organization role so every role is testable
  const users: SeedUser[] = [
    // Institution owner
    {
      id: 'user_admin_001',
      name: 'Admin',
      lastName: 'User',
      email: 'admin@school.com',
      emailVerified: true,
      userType: 'staff',
      orgRole: Role.OWNER,
    },
    // School director
    {
      id: 'user_director_001',
      name: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: 'director@school.com',
      emailVerified: true,
      userType: 'staff',
      orgRole: Role.ADMIN,
    },
    // 1 Staff user
    {
      id: 'user_staff_001',
      name: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: 'staff@school.com',
      emailVerified: true,
      userType: 'staff',
      orgRole: Role.STAFF,
    },
    // 10 Teachers
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `user_teacher_${String(i + 1).padStart(3, '0')}`,
      name: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: `teacher${i + 1}@school.com`,
      emailVerified: true,
      userType: 'teacher' as const,
      orgRole: Role.TEACHER,
    })),
    // 10 Students
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `user_student_${String(i + 1).padStart(3, '0')}`,
      name: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: `student${i + 1}@school.com`,
      emailVerified: true,
      userType: 'student' as const,
      orgRole: Role.STUDENT,
    })),
    // 5 Parents (10 students / 2 = 5 parents)
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `user_parent_${String(i + 1).padStart(3, '0')}`,
      name: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: `parent${i + 1}@school.com`,
      emailVerified: true,
      userType: 'parent' as const,
      orgRole: Role.PARENT,
    })),
  ]

  // Create accounts for password authentication
  const accounts: SeedAccount[] = users.map((user) => ({
    id: `account_${user.id}`,
    accountId: user.id,
    providerId: 'credential',
    userId: user.id,
    password: defaultPassword,
  }))

  // Create organization memberships
  const members: SeedMember[] = users.map((user) => ({
    id: `member_${user.id}`,
    organizationId: organization.id,
    userId: user.id,
    role: user.orgRole,
    createdAt: new Date(),
  }))

  // Create parent-student relationships (each parent has 2 students)
  const parentStudentRelations: SeedParentStudentRelation[] = []
  const studentUsers = users.filter((user) => user.userType === 'student')
  const parentUsers = users.filter((user) => user.userType === 'parent')

  parentUsers.forEach((parent, parentIndex) => {
    // Each parent gets 2 students (studentIndex * 2 and studentIndex * 2 + 1)
    const student1Index = parentIndex * 2
    const student2Index = parentIndex * 2 + 1

    if (student1Index < studentUsers.length) {
      const student1 = studentUsers[student1Index]
      if (student1) {
        parentStudentRelations.push({
          parentId: parent.id,
          studentId: student1.id,
          relationshipType: 'parent',
        })
      }
    }

    if (student2Index < studentUsers.length) {
      const student2 = studentUsers[student2Index]
      if (student2) {
        parentStudentRelations.push({
          parentId: parent.id,
          studentId: student2.id,
          relationshipType: 'parent',
        })
      }
    }
  })

  // Create organization config
  const organizationConfig: SeedOrganizationConfig = {
    orgId: organization.id,
    institutionLevels: ['HIGH'],
  }

  try {
    console.log('🌱 Starting seed process...')

    // Run all operations in a transaction
    await db.transaction(async (tx) => {
      // Insert organization
      await tx.insert(authSchema.organization).values(organization)
      console.log('✅ Created organization')

      // Insert users
      await tx.insert(authSchema.user).values(users)
      console.log(`✅ Created ${users.length} users`)

      // Insert accounts with hashed passwords
      await tx.insert(authSchema.account).values(accounts)
      console.log(`✅ Created ${accounts.length} accounts with encrypted passwords`)

      // Insert organization memberships
      await tx.insert(authSchema.member).values(members)
      console.log(`✅ Created ${members.length} organization memberships`)

      // Insert parent-student relationships
      await tx.insert(usersSchema.parentStudentRelation).values(parentStudentRelations)
      console.log(`✅ Created ${parentStudentRelations.length} parent-student relationships`)

      // Insert organization config
      await tx.insert(usersSchema.organizationConfig).values(organizationConfig)
      console.log(
        `✅ Created organization config with institution levels: ${organizationConfig.institutionLevels.join(', ')}`
      )
    })

    console.log('\n🎉 Seed completed successfully!')
    console.log('\nCreated users:')
    console.log('- 1 Admin: admin@school.com (password: 1234)')
    console.log('- 1 Staff: staff@school.com (password: 1234)')
    console.log('- 10 Teachers: teacher1-10@school.com (password: 1234)')
    console.log('- 10 Students: student1-10@school.com (password: 1234)')
    console.log('- 5 Parents: parent1-5@school.com (password: 1234)')
    console.log(`\nAll users are members of: ${organization.name}`)
    console.log('\nParent-Student Relationships:')
    parentStudentRelations.forEach((relation, index) => {
      const parentEmail = parentUsers.find((p) => p.id === relation.parentId)?.email
      const studentEmail = studentUsers.find((s) => s.id === relation.studentId)?.email
      console.log(`- ${parentEmail} -> ${studentEmail}`)
    })
  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the seed
main().catch((error) => {
  console.error('❌ Seed process failed:', error)
  process.exit(1)
})
