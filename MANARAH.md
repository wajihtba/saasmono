# Manarah — Full Context

Monorepo `saasmono` holds two products. Manarah = school management SaaS (Arabic/RTL).
Raqeem = separate product (courts/legal), separate apps + DB.

Manarah apps: `apps/server` (backend), `apps/web` (Next.js frontend), `apps/native` (Expo, scaffold only).
Raqeem apps: `apps/raqeem-backend`, `apps/raqeem-frontend`.
Shared: `packages/ui`, `packages/eslint-config`, `packages/prettier-config`, `packages/typescript-config`.

Root `package.json` `name` is literally "manarah" — the repo was scaffolded as manarah,
raqeem was added later. Scaffolded by Better-T-Stack v2.45.3 (`bts.jsonc`).

## Stack

- pnpm 10.16.1 + Turborepo 2.5
- Backend: Node 24, Express 5, oRPC 1.8 (RPC + OpenAPI handlers), Drizzle ORM 0.44, PostgreSQL, Zod 4
- Auth: better-auth 1.3 + plugins: admin, anonymous, openAPI, username, organization, expo
- Frontend: Next.js 15.5 (App Router, Turbopack), React 19, TanStack Query + oRPC tanstack adapter,
  Tailwind 4, shadcn/radix, TipTap editor, recharts, PWA
- Tests: vitest + supertest (server only)
- PDF/QR: pdfkit, qrcode, canvas (late-pass tickets + timetable images)

## Ports

| Thing | Port |
|---|---|
| manarah server | 3000 |
| manarah web | 9001 |
| manarah postgres (docker) | 5432 |
| raqeem backend | 4000 |
| raqeem frontend | 4001 |
| raqeem postgres (docker) | 5432 ← CONFLICT with manarah |

## Run (from clean clone)

```bash
pnpm install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env   # then set NEXT_PUBLIC_SERVER_URL=http://localhost:3000
pnpm db:start          # docker compose up -d in apps/server → manarah-postgres
pnpm db:push           # drizzle-kit push (dev path, no migration files)
pnpm dev:manarah       # turbo -F web -F server dev
pnpm stop:manarah      # kill the dev servers (ports 3000 + 9001) and the turbo parent
```

`stop:manarah` kills the turbo orchestrator first, then whatever holds 3000/9001, then force-kills
anything still alive after 1s. It deliberately does NOT stop postgres — use `pnpm db:stop` for that,
mirroring `dev:manarah`, which does not start it either.

The pattern is written `[t]urbo -F web -F server dev` on purpose. Plain `pkill -f 'turbo ...'` matches
the shell running the script itself, so the script kills its own parent and dies mid-way, leaving the
`kill -9` sweep unexecuted. The bracket makes the regex match `turbo` while the literal command line
contains `[t]urbo`, so it cannot match itself.

- Web: http://localhost:9001 · API: http://localhost:3000 · health: GET / and GET /api/health
- README says `pnpm dev` — that script does NOT exist. Use `dev:manarah` / `dev:web` / `dev:server`.
- Global CLAUDE.md says yarn; repo is pnpm-only (pnpm-lock.yaml + pnpm-workspace.yaml). Use pnpm.

### Node version

Node 24 (`.nvmrc` = `24`, `engines.node: ">=24"` in root and all five app packages, Dockerfiles on
`node:24-alpine`). Migrated from 22/20 on 2026-08-04 and verified end to end — see below.

```bash
nvm use            # picks up .nvmrc
corepack enable    # puts pnpm 10.16.1 on PATH for this node version
```

`corepack enable` is required per node version, not once globally. Without it every turbo task dies:

```
x Unable to find package manager binary: cannot find binary path
```

`corepack pnpm <script>` is not a substitute — turbo shells out and re-resolves `pnpm` itself, so
`pnpm dev:manarah` only works once the shim exists on PATH.

Native deps (`canvas` 3.2.0, `bcrypt` 6.0.0) are both N-API, so they are ABI-stable across node
majors and need no rebuild on a version bump. Verified loading and functioning on 24: canvas renders
PNGs, bcrypt hashes and verifies.

Verified on Node 24.18.0 after migration, on a clean slate with `readlink /proc/<pid>/exe` confirming
v24.18.0 owned port 3000: server and web boot; `/` and `/api/health` return OK; sign-in + set-active
+ all six management endpoints 200; the canvas timetable endpoint produced a valid 1400x900 RGBA PNG
with correct Arabic RTL rendering, served from `/images/...`.

Watch for stale servers when re-verifying. `tsx watch` survives having its parent killed and will
re-grab port 3000, so an old process from a previous node version can silently answer your requests.
Confirm the listener with `readlink -f /proc/$(lsof -ti:3000)/exe` rather than trusting the port.

### Verified working state (2026-08-04)

Full bring-up completed on PG 17.10 with all seeds. Sign-in returns 200 for
`admin@school.com` / `password1234`; `/api/private` 401s unauthenticated. After sign-in a session has
NO `activeOrganizationId`, so every management endpoint returns
`400 {"code":"BAD_REQUEST","message":"No active organization found"}` until the org is selected:

```bash
curl -X POST http://localhost:3000/api/auth/organization/set-active \
  -H 'Content-Type: application/json' -d '{"organizationId":"org_default_school"}'
```

Then `/api/management/{classrooms,teachers/list,students/list,session-instances,session-notes}` all 200.

## Env vars

`apps/server/.env.example`:
| Var | Value | Notes |
|---|---|---|
| NODE_ENV | development | `test` switches db to TEST_DATABASE_URL |
| DATABASE_URL | postgresql://postgres:password@localhost:5432/manarah | |
| TEST_DATABASE_URL | .../manarah_test | DB not created by docker-compose — create manually |
| CORS_ORIGIN | http://localhost:9001 | comma-separated multi-origin supported |
| BETTER_AUTH_SECRET | (checked into .env.example) | also readable from `${VAR}_FILE` (Docker Swarm secrets) |
| BETTER_AUTH_URL | http://localhost:3000 | |
| SERVER_URL | http://localhost:3000 | timetable image absolute URLs |
| JWT_SECRET | (checked into .env.example) | late-pass ticket QR tokens |
| PORT | 3000 default | |
| COOKIE_DOMAIN | unset | cookie domain in prod |
| DATABASE_URL_FILE | — | docker-entrypoint reads secret file |

`SERVER_URL` and `JWT_SECRET` are easy to omit when hand-writing `.env` — without them late-pass
ticket generation throws "JWT_SECRET environment variable is not set" and timetable images get URL
"undefined/...". Copy the full `.env.example`, don't cherry-pick.

`apps/web/.env.example`: `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_DATE_FORMAT` (default yyyy/MM/dd).
Local `apps/web/.env` only has NEXT_PUBLIC_SERVER_URL (fallback covers the other).

`.env` files are gitignored; only `.env.example` tracked — but the examples contain real-looking
secret values (BETTER_AUTH_SECRET, JWT_SECRET) committed to git.

## Database

Postgres. Docker: `apps/server/docker-compose.yml` → project `manarah`, container `manarah-postgres`,
db `manarah`, postgres/password, volume `manarah_postgres_data`.
Drizzle config: schema `./src/db/schema`, out `./src/db/migrations`.

Image pinned to `postgres:17`. It was previously untagged (`image: postgres`), which resolved to
PG 18+ and refused to start against this volume layout:

```
Error: in 18+, these Docker images are configured to store database data in a
       format which is compatible with "pg_ctlcluster" ...
       Counter to that, there appears to be PostgreSQL data in:
         /var/lib/postgresql/data (unused mount/volume)
```

`apps/raqeem-backend/docker-compose.yml` still has the untagged image and will hit the same wall.
Moving to PG 18 later means remounting the volume at `/var/lib/postgresql` (not `/data`).

Two paths:
- Dev → `pnpm db:push` (drizzle-kit push, direct schema sync)
- Prod → `pnpm db:migrate`, run automatically by `docker-entrypoint.sh` before server start; fails hard on error.

Migration state: single squashed baseline `0000_nice_penance.sql` (536 lines, 2025-10-18).
Not stale despite the lone file: its 28 `CREATE TABLE` statements match the 28 `pgTable` definitions
across the 9 schema files exactly, and `session_note` already carries keywords/notes/summary — so
push (dev) and migrate (prod) do not diverge. Earlier migrations (e.g. 0006 named in
IMPLEMENTATION_SUMMARY.md) were collapsed into this baseline.

Enums: `attendance_status` (PRESENT/ABSENT/LATE/EXCUSED/SICK), `ticket_status`
(ISSUED/USED/EXPIRED/CANCELED), `session_status` (SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED/RESCHEDULED),
`institution_level_ENUM` (JARDIN/PRIMAIRE/COLLEGE/SECONDAIRE/SUPERIEUR).

Tables (28), by schema file:

auth.ts (better-auth managed):
- user — id text PK, name, last_name, email uniq, username uniq, role, banned/ban_reason/ban_expires,
  is_anonymous, **user_type** (student|teacher|staff|parent|admin)
- session — user_id→user, active_organization_id, impersonated_by
- account — user_id→user, password hash
- verification
- organization — id text PK, name, slug uniq, logo, metadata
- member — organization_id→organization, user_id→user, role
- invitation — organization_id, inviter_id→user

users.ts:
- parent_student_relation — parent_id→user, student_id→user, relationship_type
- organization_config — org_id→organization, institution_levels text[]
- teacher_education_subject_level_assignment — teacher_id→user, education_subject_id, education_level_id, org_id

education.ts:
- institution_level — name(enum), display_name_en/ar/fr  (GLOBAL, no org_id)
- education_level — institution_level_id, section, level int, display names, is_default, org_id
- education_subject — institution_level_id, name, display names + descriptions (en/fr/ar), org_id
- education_level_subject — junction level↔subject, is_optional, idx on (level, subject)

classroom.ts:
- classroom — name, code, academic_year, capacity, education_level_id, org_id
- classroom_student_enrollment — classroom_id, student_id→user, enrollment_date, status
- classroom_teacher_assignment — classroom_id, teacher_id→user, education_subject_id, role, is_main_teacher
- classroom_group — name, code, max_capacity, is_default, classroom_id, org_id
- classroom_group_membership — classroom_group_id, student_id→user, education_subject_id (opt), is_active

room.ts:
- room — name, code, description, capacity(text), location, org_id

timetable.ts:
- timetable — title, start_datetime, end_datetime, status(enum), classroom_id OR classroom_group_id
  (both nullable, "either/or" only enforced by convention — no DB constraint),
  teacher_id, education_subject_id, room_id, org_id, actual_start/end_datetime, notes,
  additional_data json. 6 indexes (start+status, teacher+start, org+start, classroom+start, subject+start).
- timetable_images — data_hash uniq (MD5 of timetable data), image_path, classroom_id/classroom_group_id,
  org_id, last_accessed_at. Image cache for generated PNG timetables (node-canvas).

sessionNote.ts ("كراس القسم", Cornell-notes model):
- session_note — title, content, keywords, notes (rich text), summary, is_private, timetable_id, org_id
- session_note_attachment — file_name, file_url, file_size, mime_type, session_note_id, org_id

attendance.ts:
- attendance_session — timetable_id, general_notes, org_id
- attendance — status(enum), note, attendance_session_id, student_id, timetable_id, org_id,
  marked_at, arrived_at. 4 indexes.

late-pass-ticket.ts ("تذاكر الدخول"):
- late_pass_ticket — ticket_number uniq (YY + 6 digits), student_id, timetable_id, status(enum),
  issued_at, used_at, expires_at, qr_code_data (JWT)
- late_pass_config — org_id uniq, max_generation_delay_minutes(10), max_acceptance_delay_minutes(15),
  ticket_validity_days(7), allow_multiple_active_tickets(false), auto_expire_tickets(true),
  require_admin_approval(false), include_logo, include_barcode, logo_path

Conventions across all domain tables: uuid PK `gen_random_uuid()`, `org_id` FK to organization
(multi-tenant), audit columns `created_by_user_id`/`updated_by_user_id`/`deleted_by_user_id`,
`created_at`/`updated_at`/`deleted_at` (soft delete).

Experimental/unbuilt: `src/db/lesson..md` — commented-out `lesson_type` + `lesson_session` tables.
Marked "do not change".
Schema TODOs at bottom of classroom.ts: make teacher assignment classroom_id optional, classroom_group
classroom_id optional + optional links to educationLevel/levelSubject.

## Seeding

Order matters. `orgId` is argv[2] on every seed except `seed:institutionLevel`. The org id created by
`seed:users` is the literal `org_default_school`.

**`pnpm seed:users` as declared in package.json is broken.** `src/db/seeds/dev/users.ts:5` does
`import { auth }`, which ESM hoists above the `config()` call on line 8 — so `.env` is not loaded when
`lib/auth.ts` reads the secret at module init:

```
Error: Secret not found: BETTER_AUTH_SECRET or BETTER_AUTH_SECRET_FILE
    at getBetterAuthSecret (src/lib/secrets.ts:42:10)
    at <anonymous> (src/lib/auth.ts:25:11)
```

Fix properly by moving `config()` into a module imported before `auth`, or by adding `--env-file=.env`
to the script. Any seed that imports `auth` has the same defect; the others call `config()` fine.

Working sequence, run from `apps/server` (this is what was actually executed and verified):

```bash
corepack pnpm exec tsx --env-file=.env src/db/seeds/prod/institutionLevel.ts
corepack pnpm exec tsx --env-file=.env src/db/seeds/dev/users.ts
corepack pnpm exec tsx --env-file=.env src/db/seeds/prod/highSchoolEducation.ts   org_default_school
corepack pnpm exec tsx --env-file=.env src/db/seeds/dev/seedClassroomComplete.ts  org_default_school
corepack pnpm exec tsx --env-file=.env src/db/seeds/dev/timetables.ts             org_default_school
corepack pnpm exec tsx --env-file=.env src/db/seeds/dev/sessionNotes.ts           org_default_school
corepack pnpm exec tsx --env-file=.env src/db/seeds/dev/attendances.ts            org_default_school
```

`seedClassroomComplete` shells out to steps 1-5 in order: classrooms → classroomGroups →
teacherAssignments → studentEnrollments → groupMemberships.

`seed:session-notes` and `seed:attendances` require `<orgId>` too, despite their usage text implying
otherwise — they exit with "❌ Organization ID is required!" when omitted.

`seed:institutionLevel` prints "⚠️ All institution levels already exist. Skipping seed." even on an
empty database. Cosmetic only — it counts rows *after* inserting them. The 5 rows do get created.

Resulting row counts on a clean seed: 27 user · 1 organization · 19 education_level ·
28 education_subject · 14 classroom · 166 classroom_group · 10 enrollments · 10 teacher assignments ·
15 room · 20 timetable · 12 session_note · 12 attendance_session · 13 attendance.

Seeded logins (all password `password1234`; the console prints "1234" — wrong, actual literal is
`password1234` at users.ts:63, hashed then reused as `defaultPassword` at line 64):
- admin@school.com (admin), staff@school.com (staff)
- teacher1..10@school.com, student1..10@school.com, parent1..5@school.com

Destructive: `seed:reset` — interactive confirm, refuses if NODE_ENV=production or DATABASE_URL
contains prod/production/live. Deletes all rows and restarts sequences.
Also `seed:reset:testdb`, `seed:reset:testdb-full`. Inspect with `pnpm -F server db:show-tables`
or `pnpm db:studio`.

## API surface

`apps/server/src/app.ts` mounts, in order:
1. CORS (multi-origin from CORS_ORIGIN, credentials true)
2. `ALL /api/auth/*` → better-auth node handler
3. `GET /images/*` → static `src/images`
4. `GET /public/*` → static `src/public` (uploaded files live here)
5. `POST /api/management/upload-temp-file` → multer single 'file', validates type/size,
   writes to `src/public/tmp/`, returns {fileName, tempPath, fileSize, mimeType, originalName}.
   Max 5MB; PDF/DOCX/PNG/JPG.
6. oRPC RPCHandler at prefix `/rpc` — this is what the web app calls
7. oRPC OpenAPIHandler at prefix `/api` (+ Redoc reference plugin)
8. `GET /` → "OK"

Router tree `appRouter`: `healthCheck` (GET /health, public), `privateData` (GET /private, protected),
and `management.*`:

| Namespace | REST path prefix |
|---|---|
| users | /management/users, /management/users/{userId} |
| teachers | /management/teachers/list, /management/teacher-assignments |
| students | /management/students/list, /management/students/{studentId}, /management/student-enrollments, /management/student-group-memberships |
| parents | /management/parents/list, /management/parents/{parentId}, /management/parent-student-relations |
| curriculum | /management/curriculum/institution-levels, education-levels, education-subjects, education-level-subjects |
| classroom | /management/classrooms, /management/classroom-groups |
| timetables | /management/session-instances, /management/session-instances/generate-image |
| sessionNotes | /management/session-notes, /management/session-note-attachments |
| attendances | /management/attendances, /bulk, /sessions/{id}, /timetables/{id}/students, summaries |
| latePassTickets | /management/late-pass-tickets, /config, /eligible-students, /validate-qr, /use, /cancel, /expire-old |

GOTCHA: `src/routers/managment/rooms.ts` and `services/managment/rooms.ts` exist and define
`/management/rooms` routes, but `rooms` is NOT exported in `routers/managment/index.ts` — the
rooms endpoints are unreachable. Rooms are still required by `timetable.room_id`.

Note the directory is spelled `managment` (missing 'e') — both in routers/ and services/.

Layering: router (oRPC + zod schemas from `src/types/*.ts`) → service class in
`src/services/managment/*.ts` (factory `createXService(db)`) → drizzle.

Docs: `pnpm -F server docs:generate` → `docs/openapi.json`; `pnpm -F server docs:serve`
(redoc, port 8383 despite README saying 8080).

## Auth model

better-auth, drizzle adapter, email+password enabled. No email verification flow wired.
Additional user fields: `userType` (required), `lastName` (required).
Plugins: admin, anonymous, openAPI, username, organization, expo.
Trusted origins = CORS_ORIGIN list + `mybettertapp://` + `exp://`.
Cookies: sameSite none + secure in production, httpOnly, domain from COOKIE_DOMAIN.

oRPC context = `{ session }` from `auth.api.getSession(headers)`.
`protectedProcedure` = publicProcedure + middleware throwing ORPCError('UNAUTHORIZED') if no
`session.user`. That is the ONLY authorization layer — there is no role/userType check and no
org-scoping in the middleware. Any authenticated user can call every management endpoint;
org scoping is done ad hoc inside services. Session-note `is_private` is a flag with no enforcement
(noted in IMPLEMENTATION_SUMMARY.md).

Frontend: `apps/web/src/middleware.ts` guards `/dashboard/:path*` by presence of the better-auth
session cookie only (no server-side validation), redirects to `/login?redirect=...`.
It also `console.log`s the cookie and all request headers on every dashboard request — noise, and
leaks headers into server logs.

## Frontend (apps/web)

Next 15 App Router, `<html lang="ar" dir="rtl">`, Noto Sans/Serif Arabic from Google Fonts,
Inter + JetBrains Mono via next/font. PWA manifest at `src/app/manifest.ts`.
`next.config.js` sets `typedRoutes: true` and **ignores ESLint and TS errors during builds** —
run `pnpm -F web typecheck` separately.

Routes:
- `/login`
- `/dashboard`
- `/dashboard/classrooms`
- `/dashboard/timetable`
- `/dashboard/session-notes` + `/new` + `/[noteId]` + `/[noteId]/edit`
- `/dashboard/attendances` + `/new` + `/[sessionId]` + `/[sessionId]/edit`
- `/dashboard/late-pass-tickets` + `/generate`
- `/dashboard/institution-settings/{teachers,students,parents,curriculum}`
- `/dashboard/user/settings`

Sidebar defined in `src/config/dashboard.ts` (Arabic labels).
Data layer: `src/utils/orpc.ts` builds an RPCLink to `${NEXT_PUBLIC_SERVER_URL}/rpc` with
`credentials: 'include'`, forwards `next/headers` on the server, wraps in TanStack Query with a
global error toast. Types imported directly from `../../../server/src/routers/index` — the web app
type-depends on server source, so server type errors surface in web typecheck.

Components by domain: attendances, classroms (sic), commun, curriculum, late-pass-tickets, parents,
sessionNotes, students, teachers, timetable.
Editor migrated Quill → TipTap (`TIPTAP_MIGRATION.md`); IMPLEMENTATION_SUMMARY.md still describes Quill.

## Native (apps/native)

Expo + better-auth expo client, scheme `mybettertapp`, storagePrefix `manarah`, SecureStore.
Env: `EXPO_PUBLIC_SERVER_URL`. Run `pnpm dev:native`. Essentially untouched scaffold.

## Tests

`pnpm -F server test` (vitest). `tests/setup.ts` forces NODE_ENV=test, then runs
`npx drizzle-kit push` against TEST_DATABASE_URL before the suite.
Fallback URL in setup.ts is `postgresql://postgres:password@localhost:5004/manarah_test` — port 5004
is copy-pasted from raqeem's `.env.example` and is not published by any compose file (raqeem's compose
also publishes 5432). Nothing listens on 5004. Set TEST_DATABASE_URL explicitly.
The `manarah_test` database is not created by docker-compose; create it:
`docker exec -it manarah-postgres createdb -U postgres manarah_test`.
Test files: routers/managment/{students,teachers,user}.test.ts, services/managment/users.test.ts.
`tests/helpers/init.ts` seeds org/users/education via better-auth + seedEducation utils.

Vitest does not load `.env`, so the suite needs env exported first:

```bash
cd apps/server
set -a && . ./.env && set +a
export TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/manarah_test
pnpm exec vitest run
```

**The suite is currently red and flaky, on both Node 20 and 24.** `services/managment/users.test.ts`
passes; the three router suites (students, teachers, user) fail. Failures are assertion mismatches
(e.g. expected 404, got 400), not runtime errors. Per-test counts differ between identical runs
because a failing `beforeAll` cascades into different skip counts, so compare at file level, not test
count. Baselined against Node 20 on a freshly recreated `manarah_test` — identical file-level
outcome, so this predates the Node 24 migration.

### Typecheck is also red pre-existing

`pnpm check-types` fails. Counts on Node 24: server 32, web 57, raqeem-backend 5, raqeem-frontend 93,
native 0. None reference node globals or `@types/node`. The dominant web/raqeem-frontend cause is
TS2305 `Module '@repo/ui' has no exported member ...` (37 of web's 57); the rest are drizzle insert
overloads, oRPC output-schema mismatches, and implicit `any`. `apps/web/next.config.js` sets
`typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`, so builds pass regardless.

## Deployment

`apps/server/Dockerfile` — multi-stage node:22-alpine, alpine build deps for node-canvas
(cairo/pango/jpeg/giflib/pixman), pnpm via corepack, `pnpm --filter server build` (tsdown),
copies dist + src + drizzle.config.ts. Entrypoint runs `pnpm db:migrate` then `node dist/index.js`.
Exposes 3000.
`apps/web/Dockerfile` also present.
`MIGRATION_GUIDE.md` describes the deploy workflow but is written for raqeem paths
(`apps/raqeem-backend/...`, `raqeem-deployment/docker-compose.local.yml`, `./deploy-stack.sh`);
the referenced deployment dir/script are not in this repo.

## Gotchas summary

1. `pnpm dev` doesn't exist → `pnpm dev:manarah`.
2. Every turbo task dies with `Unable to find package manager binary` when the active nvm node has no
   `pnpm` on PATH. Run `corepack enable` once per node version.
3. `pnpm seed:users` fails with `Secret not found: BETTER_AUTH_SECRET` — ESM hoists `import { auth }`
   above `config()` in users.ts. Run with `tsx --env-file=.env`.
4. Omitting SERVER_URL / JWT_SECRET from `.env` → late-pass tickets throw, timetable image URLs
   become `undefined/...`. Copy the whole `.env.example`.
5. `docker-compose.yml` was untagged `image: postgres`; PG 18+ refuses the `/var/lib/postgresql/data`
   volume layout. Pinned to `postgres:17` here — raqeem's compose is still untagged and will break.
6. Both docker-compose files bind host 5432 → can't run manarah + raqeem postgres simultaneously.
   Raqeem's `.env.example` expects 5004 but its compose publishes 5432 — raqeem is already inconsistent.
7. `tests/setup.ts` default TEST_DATABASE_URL points at port 5004 — a stale copy-paste from
   raqeem's env; nothing publishes 5004.
8. `manarah_test` DB not created by docker-compose.
9. Fresh sign-in leaves `session.activeOrganizationId` null → every management endpoint 400s with
   "No active organization found" until `POST /api/auth/organization/set-active`.
10. `rooms` router written but not registered → `/management/rooms` 404s.
11. `seed:institutionLevel` reports "already exist / skipping" on an empty DB. Cosmetic; rows are created.
12. `seed:session-notes` and `seed:attendances` need `<orgId>` despite usage text suggesting otherwise.
13. `next.config.js` ignores TS + ESLint errors on build.
14. Only one auth layer: authenticated-or-not. No RBAC, no org check in middleware.
15. `middleware.ts` logs cookies + all headers on every /dashboard request.
16. Seed console says password `1234`; real password is `password1234`.
17. Directory spelled `managment` throughout.
18. Real-looking secrets committed in `.env.example` files.
19. IMPLEMENTATION_SUMMARY.md is stale (Quill, migration 0006); README is unmodified BTS boilerplate.
20. `pnpm check-types` and `pnpm -F server test` are both red before you touch anything. Don't read
    either as caused by your change — diff against these baselines.
21. Vitest doesn't load `.env`; export it manually or the suite dies on `BETTER_AUTH_SECRET`.
