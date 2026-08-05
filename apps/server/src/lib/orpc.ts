import { ORPCError, os } from '@orpc/server'
import { Permission, Role, Scope, scopeFor } from '../types/rbac'
import type { Context } from './context'

export const o = os.$context<Context>()

// Configure with detailed input structure to handle path parameters properly
export const publicProcedure = o

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError('UNAUTHORIZED')
  }
  return next({
    context: {
      session: context.session,
    },
  })
})

export const protectedProcedure = publicProcedure.use(requireAuth)

const requireRole = (allowed: readonly Role[]) =>
  o.middleware(async ({ context, next }) => {
    if (!context.session?.user) {
      throw new ORPCError('UNAUTHORIZED')
    }
    if (!context.role || !allowed.includes(context.role)) {
      throw new ORPCError('FORBIDDEN', { message: 'Insufficient permissions' })
    }
    return next({ context: { ...context, role: context.role } })
  })

/**
 * Guards a procedure with a permission and hands the resolved scope to the
 * handler. `Scope.NONE` never reaches a handler — the middleware rejects first.
 */
const requirePermission = (permission: Permission) =>
  o.middleware(async ({ context, next }) => {
    if (!context.session?.user) {
      throw new ORPCError('UNAUTHORIZED')
    }
    if (!context.orgId) {
      throw new ORPCError('BAD_REQUEST', { message: 'No active organization found' })
    }
    if (!context.role) {
      throw new ORPCError('FORBIDDEN', { message: 'No role in the active organization' })
    }

    const scope = scopeFor(context.role, permission)
    if (scope === Scope.NONE) {
      throw new ORPCError('FORBIDDEN', { message: `Missing permission: ${permission}` })
    }

    return next({
      context: {
        ...context,
        role: context.role,
        orgId: context.orgId,
        scope,
        permission,
      },
    })
  })

/** Use this for every management route: `authorized(Permission.STUDENT_READ)`. */
export const authorized = (permission: Permission) => publicProcedure.use(requirePermission(permission))

export const ownerProcedure = publicProcedure.use(requireRole([Role.OWNER]))
export const adminProcedure = publicProcedure.use(requireRole([Role.OWNER, Role.ADMIN]))
export const staffProcedure = publicProcedure.use(requireRole([Role.OWNER, Role.ADMIN, Role.STAFF]))
export const teacherProcedure = publicProcedure.use(
  requireRole([Role.OWNER, Role.ADMIN, Role.STAFF, Role.TEACHER])
)
