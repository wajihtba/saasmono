import { fromNodeHeaders } from 'better-auth/node'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { member } from '../db/schema/auth'
import { Role } from '../types/rbac'
import { auth } from './auth'

export async function createContext(opts: any) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  })

  // `activeOrganizationId` comes from the organization plugin and is not part
  // of better-auth's inferred base session type.
  const orgId = (session?.session as { activeOrganizationId?: string | null } | undefined)?.activeOrganizationId ?? null
  const userId = session?.user?.id ?? null

  // The role lives on the membership, not the user, so it has to be read per
  // active organization rather than taken from the session.
  let role: Role | null = null
  if (orgId && userId) {
    const [membership] = await db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, orgId)))
      .limit(1)

    role = (membership?.role as Role | undefined) ?? null
  }

  return {
    session,
    userId,
    orgId,
    role,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
