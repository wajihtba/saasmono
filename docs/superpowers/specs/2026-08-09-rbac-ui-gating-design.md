# RBAC-aware UI gating

Date: 2026-08-09

## Problem

`ddb64f4` made the API authoritative: every management route runs through
`authorized(Permission.X)` and every list is scope-filtered before it is
returned. The dashboard never learned any of it. A teacher opening
`/dashboard/institution-settings/students` sees an "add student" button that
403s; a parent sees "issue a late-pass ticket". Only the *menu* is filtered, and
only by route, through `DASHBOARD_ROUTE_ROLES`.

The goal: a role never sees a control it cannot use. Hidden, not disabled — a
disabled button still advertises a capability the user will never have.

## Decisions taken

| Question | Answer |
| --- | --- |
| Do PARENT/STUDENT use the web dashboard? | Yes, all six roles |
| How deep does hiding go? | Actions, row actions, empty-state CTAs, menus, and tabs whose whole panel is write-only. Table columns and stat cards stay |
| Teacher note ownership | Add `createdById` to the notes list response so the table can gate per row |
| While the role loads | Render nothing, but reserve the control's height so nothing jumps |

## Architecture

### 1. One permission matrix, two consumers

`Scope`, `Permission`, `ROLE_PERMISSIONS`, `scopeFor` and `can` move from
`apps/server/src/types/rbac.ts` into `packages/rbac/src/permissions.ts`.
`apps/server/src/types/rbac.ts` re-exports all of them, so the ~30 server call
sites that import `Role`/`Permission` from `../types/rbac` keep working
(invariant: server code does not import `@repo/rbac` directly).

What stays behind in the server file: `RoleSchema`, `UserTypeSchema`, the
`UserType` alias and the `db/schema/enums` import. `packages/rbac` gains no
dependency on zod or on the database schema.

### 2. The role is resolved once

`useOrgRole` currently fires `getActiveMemberRole()` per mount. With a gate on
every button that is one request per control. A `RoleProvider` in
`components/providers.tsx` resolves it once and publishes `{ role, isPending }`
through context; `useOrgRole` reads the context and keeps its current return
shape, so `app/dashboard/layout.tsx` and `app/dashboard/page.tsx` are untouched.

### 3. The gate API — `hooks/use-permissions.ts`

```ts
usePermissions(): {
  role: Role | null
  isPending: boolean
  can(permission): boolean          // scopeFor(role, p) !== Scope.NONE
  scopeOf(permission): Scope
  isOrgWide: boolean                // owner | admin
  canForOwn(permission, ownerId): boolean
}
```

`canForOwn` is the row gate. Rule, mirrored from `lib/scope.ts`: a list is
already scope-filtered server-side, so *visible implies permitted* whenever the
write scope equals the read scope. The exception is the session note, where
`assertSessionNoteAuthored` demands authorship from any non-`ORG` actor. So:
`ORG` scope → true; any other scope → `ownerId === currentUserId`.

### 4. The gate component — `components/commun/can.tsx`

```tsx
<Can permission={Permission.STUDENT_WRITE}>…</Can>
<Can permission={Permission.CLASSROOM_WRITE} reserve="h-9">…</Can>
```

Renders `null` when pending or denied. `reserve` renders an empty box of that
height instead of nothing, for header toolbars where a late-arriving button
would reflow the row. For props rather than children — a table that takes
`onCreateNew` — the page passes `can(...) ? handler : undefined`, which the
tables already treat as "do not render".

### 5. Action → permission map

| Surface | Control | Permission |
| --- | --- | --- |
| `classrooms` | create, row edit | `CLASSROOM_WRITE` |
| `classrooms` | tabs "تسجيل الطلاب", "الجداول" | `CLASSROOM_WRITE`, `TIMETABLE_WRITE` |
| `institution-settings/students` | create, row edit | `STUDENT_WRITE` |
| `institution-settings/teachers` | create, row edit | `TEACHER_WRITE` |
| `institution-settings/parents` | create, row edit | `PARENT_WRITE` |
| `institution-settings/curriculum` | create, row edit; "الإعدادات" tab | `CURRICULUM_WRITE` |
| `attendances` | create, row edit | `ATTENDANCE_WRITE` |
| `session-notes` | create | `NOTE_WRITE` |
| `session-notes` | row edit | `NOTE_WRITE` + `canForOwn` |
| `session-notes/[id]` | edit / delete | `NOTE_WRITE` / `NOTE_DELETE` + `canForOwn` |
| `late-pass-tickets` | generate | `LATEPASS_ISSUE` |
| `late-pass-tickets` | cancel row action | `LATEPASS_ISSUE` |
| `late-pass-tickets` | download PDF | ungated (implied by `LATEPASS_READ`, which the route already requires) |
| `timetable` | download image | ungated (read surface) |

### 6. Three categories of existing control, three fixes

1. **Guarded prop** — `students-table.tsx:190`, `session-note-header.tsx:87`,
   every `onCreateNew ? … : null`. Page passes `undefined`. No component change.
2. **Unguarded prop** — `classroms/classrooms-table.tsx:134` and
   `curriculum/education-subject-table.tsx:144` render the edit button
   unconditionally and call `onEdit?.()`. Omitting the prop leaves a dead
   button; both get a `{onEdit && …}` guard.
3. **No prop at all** — `session-notes-table.tsx:138` (internal
   `handleEditNote`), `late-pass-tickets-table.tsx:248`/`366` (internal
   `handleCancelTicket`). These gate inside the component with `usePermissions`.

### 7. Row ownership for notes

`SessionNoteListItemSchema` gains `createdById: z.string()`; the list query in
`services/managment/sessionNotes.ts` selects `createdByUserId` for it. Additive,
no migration. The web row type mirrors it and the table gates edit/delete with
`canForOwn(Permission.NOTE_WRITE, row.createdById)`.

### 8. Keeping the two matrices honest

`DASHBOARD_ROUTE_ROLES` is hand-maintained next to `ROLE_PERMISSIONS` and can
drift. A test in `packages/rbac` asserts, for every route that exists to perform
an action, that each role listed for it actually holds the matching permission —
so a menu entry and a button can never disagree.

## Verification

- `pnpm -F server exec vitest run src/types/rbac.test.ts` → 187 passing (the
  `ECONNREFUSED 127.0.0.1:5004` line is normal noise). Proves the matrix move
  was faithful.
- New `packages/rbac` permission/route-consistency test.
- Web `tsc --noEmit` compared against the 24-error baseline, server against 32.
- `pnpm build`.

## Found while building

- **`/dashboard` was a catch-all parent.** `rolesForRoute` matched by longest
  prefix, and `'/dashboard': ALL` is a prefix of everything, so any route not in
  the table — a new page, a typo'd link — resolved to all six roles instead of
  the owner/admin default. The root now matches itself only, and a test pins it.
- **The edit route is not the same question as the edit button.** The route
  table can only narrow `/session-notes/[id]/edit` to the teaching side; whether
  *this* note is editable depends on its author. The edit page repeats the
  `canForOwn` check and shows a "not your note" state rather than letting the
  form 403 on save.
- **Three drawer entries pointed nowhere.** `dashboardMobileDrawerItems` used
  `href: 'students'`, `'reports'` and `'settings'`, which resolve to
  `/dashboard/students`, `/dashboard/reports` and `/dashboard/settings` — none
  of which exist. They were visible to all six roles only because the root
  catch-all matched them. `students` is repointed at the real page; `reports`
  and `settings` have no page to point at and are now owner/admin-only, still
  404ing. They need either a page or removal — a product call, left alone.
- **`reserve` covers the `<Can>` path only.** Table header actions are gated by
  withholding the `onCreateNew` prop, which has no reserved-space equivalent
  without changing `GenericTable`. Those buttons still appear a frame late. The
  toolbar keeps its height either way, so the shift is horizontal, not vertical.
- **`pnpm build` was already failing** on `@repo/rbac`: its tsconfig inherits
  `moduleResolution: NodeNext`, which rejects the package's own extensionless
  relative imports. Switched to `Bundler`, matching how both consumers actually
  read it. The build is green again.

## Out of scope

- Table columns and dashboard stat cards (the stats are still sample data).
- `apps/raqeem-*`.
- Server-side changes beyond the additive `createdById` field.
