'use client'

import { usePermissions } from '@/hooks/use-permissions'
import type { Permission } from '@repo/rbac'

interface CanProps {
  /** The action behind the control. Hidden unless the role holds it. */
  permission: Permission
  /**
   * Author of the row the control acts on. Pass it for actions the API limits
   * to their author, so the control follows the same rule.
   */
  ownerId?: string | null
  /**
   * Height to hold while the role resolves, e.g. `h-9` for a toolbar button.
   * Without it a late-arriving control reflows the row it sits in.
   */
  reserve?: string
  children: React.ReactNode
}

/**
 * Hides a control the signed-in role may not use. Disabling it would keep
 * advertising a capability the user will never get, so it renders nothing.
 */
export function Can(props: CanProps) {
  const { permission, reserve, children } = props
  const { can, canForOwn, isPending } = usePermissions()

  if (isPending) {
    return reserve ? <div className={reserve} aria-hidden /> : null
  }

  // Presence of the prop, not its value: an owner id that arrives undefined has
  // to fail the ownership check, not skip it.
  const allowed = 'ownerId' in props ? canForOwn(permission, props.ownerId) : can(permission)

  return allowed ? <>{children}</> : null
}
