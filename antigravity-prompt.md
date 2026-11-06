# CampusPulse: development and research document
Nov 5, 2026 · @Sripavan

CampusPulse shows which rooms, labs and faculty are free, and repairs the timetable when a class is disrupted. It is our entry for Agentic AI Hackathon 2.0, Track 1, Problem 3, at VFSTR. The submission is due tonight.

## 1. Overview
CampusPulse is an agentic timetable assistant. It watches the department timetable, answers availability questions, and proposes conflict-free repairs when a class is disrupted. A person approves every change.
The agent works only on the timetable data it is given. It needs no API keys and no external model to make decisions. Search and constraint checks decide every answer and repair. A language model, if used, only phrases the result.

The agent loop:
1. Observe: load timetable rows and approved changes.
2. Detect: find a cancellation, a room closure or a clash.
3. Search: enumerate candidate rooms and slots for the affected class.
4. Verify: reject any candidate that breaks a hard constraint.
5. Propose: rank the survivors and show them to the administrator.
6. Act: apply the approved option, notify students and faculty, and log it.

Out of scope: payments, student records, and any data not supplied by the department.

## 2. Requirements
IDs follow the order of the event brief (Track 1, Problem 3), then our added features.
R1 Use the department's own real timetable. No dummy data in the demo.
R2 Web app is the primary deliverable. Android is optional.
R3 Show live status for each room, lab and faculty member: FREE, OCCUPIED, LATER, UNAVAILABLE.
R4 Find free rooms or faculty for a given day and time range.
R5 Record a disruption (cancellation, room closure, faculty change) and propose conflict-free repairs.
R6 Administrator approves each change before it applies.
R7 AI has a real role: an agent that searches, verifies and proposes. Not a chatbot wrapper.
R8 Secure student, faculty and location data: role-based access, hashed passwords, no phone numbers shown publicly.
R9 Working prototype and a live demo.
R10 Agent works on supplied data only. No external API keys are needed to run it.
R11 Search algorithm finds candidate repairs and answers availability queries.
R12 Student group selection (year, department, section) with a personal timetable, change alerts and calendar export.
R13 Assistant answers only from stored rows, cites them, and says when data does not cover a question.
R14 Audit log of every change, with who made it and when.
R15 Public campus map: four blocks (A, H, U, N), floors, and rooms, read-only without login.
R16 Faculty see their own timetable and changes.

## 3. Users and permissions
Three roles. Browsing needs no login.
- Visitor or student: Optional login. Browse the map, free rooms, any timetable. A student who signs in saves a year, department and section and gets alerts.
- Faculty: Signs in. See own timetable and changes. Cannot edit the timetable.
- Administrator (HOD level): Signs in. Import timetables, record disruptions, approve or reject repairs, make direct changes, read the audit log.

Rules: Passwords are hashed. Sessions are server-side. Faculty phone numbers in source timetables are never shown. Every administrator action writes an audit row.

## 4. Data sources
All data comes from files the department supplied. The agent reads them offline. Not used: chat-shared links, which we did not open.
The demo uses only the sections we have parsed and verified. Other departments are shown as not yet loaded.
- Section 26 AIML-H timetable (.xlsx, w.e.f. 13.08.26)
- Section 29 AIML timetable (.xlsx, w.e.f. 22.10.26)
- Other AIML, CSE and BI/BT sheets (.xlsx)
- Third-year revised timetable (.xlsx, 2 to 9 Nov 2026)
- Architect's plan set (20 pages)

## 5. Room code rules
A room code has three parts: block prefix, floor code and room number. The agent maps each code to block, floor and room with a rule table, then checks the result against the timetable.

| Prefix in code | Block | Floor |
|---|---|---|
| VBFF, VBSF, VBTF | A (Administrative) | 1, 2, 3 |
| VBFTF, VBFTTF | A | 4 (VBFTTF confirmed as VBFTF) |
| VBFFTF, VBFFT | A | 5 |
| VFF | H | 1 |
| VGF | H | Ground |
| AFF | U | 1 (only AFF confirmed) |
| NB, N + 3 digits | N (Nagarjuna Bhavan) | First digit of room |
| VPSF, VPTF, VPFTF | P | 2, 3, 4 |

Coverage: 119 codes, 1,294 occurrences. 1,240 confirmed or labelled, 54 inferred, 0 unknown.
Inferred rules to confirm with the department: VBFFT, N + 3 digits, VPFTF.
Rooms: 75 distinct rooms across the blocks.

## 6. Data model and API
Backend: Node with Express.
Database: SQLite through Prisma. Sessions are server-side.

Entities:
- Block (code, name)
- Floor (block, number)
- Room (code, floor, type, capacity)
- Faculty (name, department; no phone in public responses)
- Group (year, department, section)
- Entry (group, subject, faculty, room, day, start, end, source file, row, is_mock)
- Change (entry, kind, new room or faculty, reason, status: proposed, approved, rejected, applied)
- Proposal (change, option list, passed checks, chosen option)
- AuditLog (actor, action, before, after, time)

Endpoints:
Auth:
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

Public:
- GET /api/campus/blocks
- GET /api/campus/blocks/:code/floors
- GET /api/campus/floors/:floorId
- GET /api/availability/now
- GET /api/availability/search
- GET /api/rooms/:id/timetable
- GET /api/faculty/:id/timetable
- GET /api/groups
- GET /api/groups/:id/timetable

Student:
- GET /api/me/group
- GET /api/me/timetable
- GET /api/me/export.ics
- GET /api/me/notifications

Faculty:
- GET /api/faculty/me/timetable
- GET /api/faculty/me/changes

Admin:
- POST /api/admin/timetable/import
- POST /api/admin/timetable/import/:id/commit
- GET /api/admin/entries
- POST /api/admin/entries/:id/change
- GET /api/admin/disruptions
- POST /api/admin/proposals/:id/approve
- POST /api/admin/proposals/:id/reject
- GET /api/admin/audit-log

Assistant:
- POST /api/assistant/query (status: answered, no_data, or clarify, with citations)

All times are stored and shown in Asia/Kolkata.

## 7. Business rules and search
Hard constraints. A candidate repair is rejected if any of these fails:
1. The room is free for the whole slot, including buffer time.
2. The room type matches the class (lab for lab, classroom for lecture).
3. Room capacity is at least the group size.
4. The faculty member is free for the whole slot.
5. No student group has a second class in that slot.
6. The room is not closed or under an approved change.

Search algorithm for a repair:
Build the candidate set: every room of the required type on the same or nearby floors.
Filter by the hard constraints above. Each check is an interval overlap test on sorted slot lists.
Rank the survivors: same floor first, then the smallest room that fits, then the least change to students.
Return the top three. If none survive, widen to other blocks, then report NO SAFE OPTION.

Availability query: an interval search over each resource's sorted entries. A resource is FREE if no entry overlaps the requested range.
Status rules: FREE, OCCUPIED (now inside an entry), LATER (free now, booked within a set window), UNAVAILABLE (closed or cancelled with no safe option).
All searches are deterministic and use only stored rows. The same input always gives the same result. Each result lists the rows that support it.
Time zone: Asia/Kolkata. Timetable weeks follow the w.e.f. date of each source file.

