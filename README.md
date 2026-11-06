# CAMPUS PULSE
## Intelligent Timetable and Resource Scheduling Agent
### Vignan's Foundation for Science, Technology and Research (Deemed to be University)

> **Tagline:** *One Campus. Every Schedule. Smarter Availability.*

---

## 🏆 Hackathon Problem Statement Resolution
> *"Develop a smart campus availability platform that uses the actual academic timetable of the participating team's department to identify occupied and available classrooms, laboratories, and faculty members based on the day and time."*

Campus Pulse is an intelligent, university-grade web and mobile platform that interconnects academic timetables, faculty schedules, enrolled students, classrooms, laboratories, campus buildings, floor structures, and real-time availability into one unified system.

---

## 🏗️ Production Architecture

Campus Pulse operates a decoupled, cloud-native architecture:

```
┌─────────────────────────────────────────┐
│     Client Layer: React 18 SPA          │
│   (Hosted on Vercel Edge Network)       │
│  https://campus-pulse-two-gilt.vercel.app│
└───────────────────┬─────────────────────┘
                    │ REST / HTTPS + SameSite Cookies & Bearer Tokens
                    ▼
┌─────────────────────────────────────────┐
│       Backend Service: Express 5        │
│      (Hosted on Render Cloud)           │
│   https://campuspulse-api-788f.onrender.com │
└───────────────────┬─────────────────────┘
                    │ Prisma ORM 6.4
                    ▼
┌─────────────────────────────────────────┐
│     Relational Database: SQLite         │
│  (Indexed Academic Timetables & Users)  │
└─────────────────────────────────────────┘
```

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts. Deployed on **Vercel**.
- **Backend:** Node.js, Express 5, TypeScript (`tsx`), Prisma ORM, Helmet security headers, CSRF token validation, bcryptjs, Zod schema validation. Deployed on **Render**.
- **Database:** Prisma SQLite with composite indexes on `(roomId, day, startTime)`, `(facultyId, day, startTime)`, and `(groupId, day)`.
- **API Documentation:** Interactive OpenAPI 3.1 / Swagger UI live at `/api/docs`.
- **Mobile Client:** Android app powered by Capacitor 8 with secure Bearer authentication.

---

## 🏛️ Official Vignan University Campus Mapping

### Official University Logo & Photography
1. **Vignan Bhavan (A Block):** Floors 1 to 5 (VBFF, VBSF, VBTF).
2. **Aryabhata Bhavan (U Block):** Floors 1, 2, 4.
3. **Nagarjuna Block (N Block):** Floors 1 to 6 (Floors 4 & 5 CSE wings).
4. **H Block (H Block):** Ground to Floor 3.
5. **Central Library (NTR Central Library):** 2nd Floor Digital Labs & Reading Halls.

---

## 🔑 Authentication & Access Control

Authentication supports dual-client operation:
- **Web SPA:** `cp_session` HttpOnly, SameSite cookies with CSRF token verification via `X-CSRF-Token`.
- **Android App:** Bearer tokens passed via `Authorization: Bearer <token>`, stored securely in `@capacitor/preferences`.
- **Security Protections:** Rate-limiting lockout (5 failed attempts per 15 minutes), SHA-256 session token hashing, timing-safe credential verification.

Public timetable searches (`/timetable`), Availability queries (`/availability`), and Campus Explorer (`/campus`) require **no authentication**.

Demo role accounts are provisioned via environment variables (never committed to git):
- **Admin:** `admin@vignan.ac.in` (governance, timetable imports, disruption approval)
- **Faculty:** `faculty@vignan.ac.in` (teaching schedule, leave requests, consultations)
- **Student:** `student@vignan.ac.in` (personal timetable, class alerts, enrolled section `II AIML-J`)

---

## 🚀 Key Functional Modules

1. **Public Timetable Search (`/timetable`):**
   - 5-step filter: Department &rarr; Academic Year &rarr; Semester &rarr; Year of Study &rarr; Section.
   - Switchable Weekly Grid View and Daily Timeline.
   - Export timetable to iCalendar (`.ics`), Print layout, and CSV download.

2. **Interactive 2D Architectural Floor Blueprints (`/campus/:slug`):**
   - Floor-by-floor interactive top-down spatial layouts for 5 campus buildings.
   - Real-time room status indicators:
     - 🟢 **Green:** Vacant / Available
     - 🔴 **Red:** Currently Occupied by Ongoing Lecture
     - 🔵 **Blue:** Class Scheduled Soon
     - ⚪ **Grey:** Facility / Common Area
   - Zoom, Pan, Fit-to-screen, and Room code search.

3. **Smart Resource Availability Engine (`/availability`):**
   - Live query engine across all classrooms, laboratories, and faculty members.
   - Future time slot search: query any future day and time slot to find vacant resources.

4. **Universal Global Search (`Ctrl + K`):**
   - Instant search across rooms, faculty, departments, sections, and subjects.

5. **Timetable Collision & Conflict Engine:**
   - Real-time detection preventing double-booking across faculty, rooms, and sections.

6. **Interactive OpenAPI / Swagger Documentation (`/api/docs`):**
   - Complete specification of all public, authenticated, and administrative endpoints.

---

## 🔐 Environment Variables

Configure the following environment variables in `.env` (backend) or `.env.production`:

| Variable | Description |
|---|---|
| `PORT` | Backend listening port (default: `3001` locally, set by Render in production) |
| `NODE_ENV` | Environment (`development` or `production`) |
| `DATABASE_URL` | SQLite database file path (e.g., `file:./dev.db` or `file:/data/campuspulse.db`) |
| `SESSION_SECRET` | Secret key used for cryptographic signing of session cookies |
| `CORS_ORIGIN` | Allowed client origin (`https://campus-pulse-two-gilt.vercel.app` or `http://localhost:5173`) |
| `VITE_API_BASE` | Frontend base URL for backend API calls |
| `ADMIN_SEED_EMAIL` | Default administrator account email |
| `ADMIN_SEED_PASSWORD` | Default administrator account password |
| `FACULTY_SEED_EMAIL` | Default faculty account email |
| `FACULTY_SEED_PASSWORD` | Default faculty account password |
| `STUDENT_SEED_EMAIL` | Default student account email |
| `STUDENT_SEED_PASSWORD` | Default student account password |

*Note: Never commit secrets, tokens, or plaintext passwords to version control.*

---

## 💻 Local Development & Setup

### Prerequisites
- Node.js (v20+ recommended)
- npm (v10+)

### Installation
```bash
# Clone the repository
git clone https://github.com/vyrajavallineelam-dotcom/CAMPUS-PULSE.git
cd CAMPUS-PULSE

# Install dependencies
npm install

# Initialize Prisma Database & Seed Department Timetables
npx prisma generate
npx prisma db push
npm run db:seed
```

### Running Locally
```bash
# Run both Frontend (Vite) and Backend (Express) concurrently
npm run dev

# Or run separately:
npm run dev:frontend   # Starts Vite SPA on http://localhost:5173
npm run dev:backend    # Starts Express API on http://localhost:3001
```

### Running Tests
```bash
# Run full Vitest test suite (69 tests covering engine, parser, API, and contracts)
npm test
```

### Production Build
```bash
# Type check and build frontend production assets
npm run build
```

---

## 📱 Android Build (Capacitor)

```bash
# Build frontend web assets
npm run build

# Synchronize assets and plugins to the native Android project
npx cap sync android

# Open in Android Studio to build APK
npx cap open android
```

---

## 🌐 Live Deployments

- **Frontend Application (Vercel):** [https://campus-pulse-two-gilt.vercel.app](https://campus-pulse-two-gilt.vercel.app)
- **Backend API Server (Render):** [https://campuspulse-api-788f.onrender.com](https://campuspulse-api-788f.onrender.com)
- **API Health Check:** [https://campuspulse-api-788f.onrender.com/api/health](https://campuspulse-api-788f.onrender.com/api/health)
- **Interactive Swagger Documentation:** [https://campuspulse-api-788f.onrender.com/api/docs](https://campuspulse-api-788f.onrender.com/api/docs)
