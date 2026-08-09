import { canAccessRoute, scopeFor, Scope, type Permission, type Role } from '@repo/rbac'

/**
 * Navigation entries are filtered from the same route table the guard uses, so
 * a page and its menu item can never disagree about who may see it.
 */

interface UrlItem {
  url: string
}

interface HrefItem {
  href: string
}

const toAbsolute = (href: string, basePath: string) =>
  href.startsWith('/') ? href : href ? `${basePath}/${href}` : basePath

/** Keeps entries whose `url` the role may open. Placeholder `#` links stay. */
export function filterByUrl<T extends UrlItem>(items: readonly T[], role: Role | null): T[] {
  return items.filter((item) => item.url === '#' || canAccessRoute(role, item.url))
}

/** Same, for the mobile nav which stores paths relative to a base. */
export function filterByHref<T extends HrefItem>(
  items: readonly T[],
  role: Role | null,
  basePath = '/dashboard'
): T[] {
  return items.filter((item) => canAccessRoute(role, toAbsolute(item.href, basePath)))
}

/**
 * Drops entries whose action the role cannot perform, whatever the route says.
 * A teacher may open the students list but not add to it, so the "add student"
 * shortcut has to go even though its destination stays.
 */
export function filterByPermission<T extends { permission: Permission }>(items: readonly T[], role: Role | null): T[] {
  return items.filter((item) => role != null && scopeFor(role, item.permission) !== Scope.NONE)
}

export function filterSidebarData<
  T extends {
    navMain: readonly UrlItem[]
    navSecondary?: readonly UrlItem[]
    documents?: readonly { url: string }[]
  },
>(sidebarData: T, role: Role | null) {
  return {
    ...sidebarData,
    navMain: filterByUrl(sidebarData.navMain, role),
    navSecondary: sidebarData.navSecondary ? filterByUrl(sidebarData.navSecondary, role) : sidebarData.navSecondary,
  }
}

export function filterDrawerItems<T extends { category: string; items: readonly HrefItem[] }>(
  groups: readonly T[],
  role: Role | null,
  basePath = '/dashboard'
): T[] {
  return groups
    .map((group) => ({ ...group, items: filterByHref(group.items, role, basePath) }))
    .filter((group) => group.items.length > 0)
}
