# CAMPUS PULSE
## Intelligent Timetable and Resource Scheduling Agent
### Vignan's Foundation for Science, Technology and Research (Deemed to be University)

> **Tagline:** *One Campus. Every Schedule. Smarter Availability.*

---

## 🏆 Hackathon Problem Statement Resolution
> *"Develop a smart campus availability platform that uses the actual academic timetable of the participating team's department to identify occupied and available classrooms, laboratories, and faculty members based on the day and time."*

Campus Pulse is an intelligent, university-grade web platform that interconnects academic timetables, faculty schedules, enrolled students, classrooms, laboratories, campus buildings, floor structures, and real-time availability into one unified system.

---

## 🏛️ Official Vignan University Branding & Campus Mapping

### Official University Logo
- **Asset Location:** `public/assets/vignan-logo.png` (and vector `public/assets/vignan-logo.svg`)
- Official Vignan emblem with full lettering and proportions preserved across all headers, role selection portals, and footers.

### Official Campus Buildings & Photography
1. **Vignan Bhavan (A Block):** `public/assets/campus-images/vignan-bhavan.webp`
2. **Aryabhata Bhavan (U Block):** `public/assets/campus-images/aryabhata-bhavan.webp`
3. **Nagarjuna Block (N Block):** `public/assets/campus-images/nagarjuna-block.webp` *(Iconic brown vertical exterior pillars, white and grey sections, and central courtyard)*
4. **H Block (H Block):** `public/assets/campus-images/h-block.webp`
5. **Central Library (NTR Central Library):** `public/assets/campus-images/central-library.webp`

---

## 🔑 Demo Access Credentials (1-Click Autofill Enabled)

| Role | Username / Institutional Email | Password | Pre-configured Profile |
|---|---|---|---|
| **Administrator** | `admin@vignan.ac.in` | `admin123` | Dr. Ch. Srinivas (Academic Affairs Cell) |
| **Faculty Member** | `k_radhakrishna@vignan.ac.in` | `faculty123` | Dr. K. Radhakrishna (Professor & Head, CSE) |
| **Enrolled Student** | `rahul.211fa04001@vignan.ac.in` | `student123` | Rahul Sharma (Reg: 211FA04001, CSE-3A) |

*Note: Public timetable searches (`/timetable`) and Campus Explorer (`/campus`) require **no authentication** whatsoever.*

---

## 🚀 Key Functional Modules

1. **Public Timetable Search (`/timetable`):**
   - 5-step filter: Department &rarr; Academic Year &rarr; Semester &rarr; Year of Study &rarr; Section.
   - Switchable Weekly Grid View and Daily Timeline.
   - Print-friendly layout and CSV export.

2. **Interactive 2D Architectural Floor Blueprints (`/campus/:slug`):**
   - Floor-by-floor interactive top-down spatial layouts.
   - **Ground Floor Protocol:** No classrooms automatically placed on ground floors; displays reception, main colonnade, and vertical conduits.
   - Clickable rectangular room blocks with real-time status colors:
     - 🟢 **Green:** Vacant / Available
     - 🔴 **Red:** Currently Occupied by Ongoing Lecture
     - 🔵 **Blue:** Class Scheduled Soon
     - ⚪ **Grey:** Facility / Common Area
   - Zoom in, Zoom out, Fit to screen, and room search controls.

3. **Synchronized Floor Resource Table:**
   - Positioned directly below blueprint.
   - Clicking a room in the table highlights it on the blueprint; clicking a room on the blueprint highlights the table row.

4. **Smart Resource Availability Engine (`/availability`):**
   - Dynamic query engine for Classrooms, Computer & Engineering Laboratories, and Faculty Members.
   - Future time slot simulation: select any day and time range to compute vacancy directly from timetable overlaps.

5. **Universal Global Search (`Ctrl + K` or Search Button):**
   - Instant search across rooms (e.g. `N-204`, `A-101`), faculty members, subjects, and buildings.

6. **Timetable Collision & Conflict Validator:**
   - Real-time detection prevents faculty double-booking, classroom double-booking, and section schedule overlaps with descriptive warnings.

7. **Role-Based Portals:**
   - **Student Dashboard (`/student/dashboard`):** Today's classes, current class, next class, free periods, weekly schedule.
   - **Faculty Dashboard (`/faculty/dashboard`):** Daily teaching schedule, consultation availability, timetable modification logs.
   - **Admin Command Suite (`/admin/dashboard`):** Full governance for Academic Years, Semesters, Departments, Classrooms, Labs, Faculty, and Recharts analytics.

---

## 💻 Tech Stack
- **Framework:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Charts:** Recharts
- **State & Storage:** LocalStorage with dynamic reactive event dispatchers

---

## 🏃 Running the Application

```bash
cd "C:\Users\vyraj\.gemini\antigravity\scratch\campus-pulse"

# Run development server
npm run dev

# Or build production preview
npm run build
npm run preview
```

