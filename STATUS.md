# CampusPulse: Development Status (Checked 5 Nov 2026)

## Section-by-Section Status (Prompt Sections 3 to 10)

- **Section 3 (Data Import & Real Data Pipeline):** **DONE**
  - Room code parser parses all Section 4 confirmed/inferred/unknown rules without dropping any codes.
  - Upload route `POST /api/admin/timetable/import` verifies magic bytes, SHA-256 deduplication, stages file outside web root.
  - Commit route `POST /api/admin/timetable/import/:id/commit` publishes staged entries to live with audit logging.
  - Demo section `II AIML-J` from ACSE Department (w.e.f. 17-08-2026) loaded with real classes (`is_mock = false`).

- **Section 4 (Room Code Classification Engine):** **DONE**
  - Pure functions in `src/engine/roomCodes.ts` implementing all block prefixes (A, H, U, N, P), floor deductions, library/non-room slot detection, and unknown code flagging.
  - 10 unit tests passing in Vitest covering all cases.

- **Section 5 (Database & Persistence):** **DONE**
  - Prisma ORM with SQLite database (`dev.db`).
  - Full schema implemented: User, Session, FailedLogin, Block, Floor, Room, Department, Group, Faculty, SourceFile, Entry, Disruption, Proposal, Notification, AuditLog.
  - Required composite indexes on `Entry(roomId, day, startTime)`, `Entry(facultyId, day, startTime)`, `Entry(groupId, day)`, and `AuditLog(createdAt)`.
  - Migration and automated seed script creates 5 campus blocks, 63 verified rooms, demo department (ACSE), demo section (`II AIML-J`), and 3 role-based accounts with passwords hashed via `bcrypt`.

- **Section 6 (API Contract & Public Endpoints):** **DONE**
  - `GET /api/campus/blocks` and `GET /api/campus/blocks/:blockId/rooms` with floor relations.
  - `GET /api/availability/now` with live `FREE`, `OCCUPIED`, `LATER`, `UNAVAILABLE` statuses.
  - `GET /api/availability/search` finding conflict-free rooms across arbitrary day and time intervals.
  - `GET /api/groups` and `GET /api/groups/:name/timetable`.
  - `GET /api/rooms/:roomId/timetable` and `GET /api/faculty/:id/timetable`.
  - Non-negotiable privacy rule enforced: zero faculty phone numbers or private contact fields exposed in any public response.

- **Section 7 (Search & Agentic Repair Engine):** **DONE**
  - Pure interval search in `src/engine/intervalSearch.ts` with 5-minute buffer support.
  - Pure repair search engine in `src/engine/repairSearch.ts` evaluating all 5 hard constraints:
    1. Room free for entire slot + 5-min buffer
    2. Room not under active disruption
    3. Room capacity >= group size
    4. Faculty free from other commitments
    5. Student group has no concurrent class
  - Ranking hierarchy: same block (+1000 penalty if different), same floor (+200 penalty if different), room capacity fit. Top 3 proposals returned.
  - Safe fallback: produces pre-formatted suspension/cancellation notice draft when `noSafeOption = true`.

- **Section 8 (Authentication & Role Enforcement):** **DONE**
  - Real server-side authentication (`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`).
  - Passwords hashed using `bcrypt` (10 rounds).
  - Server-side session tokens stored in database with `HttpOnly; SameSite=Lax` cookies.
  - Rate limiting enforced: max 5 failed attempts per institutional email per 15-minute window (HTTP 429).
  - Constant-time dummy hash comparison for non-existent users; identical generic error message (`Invalid email or password`).
  - Role enforcement middleware (`requireAuth`, `requireRole`) checks permissions server-side.
  - All hardcoded demo passwords removed from `src/services/authService.ts`, `src/pages/auth/RoleLoginPage.tsx`, and `README.md`.

- **Section 9 (Disruptions, Admin Approvals & Audit Trail):** **DONE**
  - `POST /api/admin/disruptions` records cancellation/closure/faculty change and automatically triggers repair search.
  - `POST /api/admin/proposals/:id/approve` re-runs hard constraint checks in real-time; if conflicted, marks proposal `stale` (HTTP 409); if valid, approves, resolves disruption, updates timetable, dispatches notifications to enrolled students, and logs to `AuditLog`.
  - `POST /api/admin/proposals/:id/reject` marks proposal rejected with audit row.
  - `GET /api/admin/audit-log` returns complete immutable change history.

- **Section 10 (Verification, Testing & Demonstrator):** **DONE**
  - 18 unit tests in `src/engine/__tests__/` covering room codes, interval search, and repair search all pass via `npm test`.
  - Production build (`npm run build`) compiles cleanly without TypeScript or bundler errors.
  - End-to-end scenario script `scripts/demo-scenario.ts` executes and passes all 7 required evaluation steps.
