import { PrismaClient } from '@prisma/client'

/**
 * Synthetic timetable coverage for every department/section.
 *
 * The department supplied real sheets only for II AIML-J, which seed.ts imports
 * with is_mock: false. Everything produced here is clearly flagged is_mock: true
 * so it can never be mistaken for parsed source data: it exists purely so the
 * search, availability and directory screens have something to show before the
 * remaining .xlsx sheets are imported through the admin pipeline.
 */

const PERIODS = [
  { start: '08:15', end: '09:05' },
  { start: '09:05', end: '09:55' },
  { start: '10:05', end: '10:55' },
  { start: '10:55', end: '11:45' },
  { start: '11:55', end: '12:45' },
  { start: '12:45', end: '13:35' },
  { start: '14:25', end: '15:15' },
  { start: '15:15', end: '16:05' },
  { start: '16:05', end: '16:55' }
]

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const DEPARTMENTS = [
  { code: 'CSE', name: 'Computer Science and Engineering' },
  { code: 'AIML', name: 'Artificial Intelligence & Machine Learning' },
  { code: 'ECE', name: 'Electronics and Communication Engineering' },
  { code: 'EEE', name: 'Electrical and Electronics Engineering' },
  { code: 'MECH', name: 'Mechanical Engineering' },
  { code: 'CIVIL', name: 'Civil Engineering' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'BT', name: 'Biotechnology' }
]

const SECTIONS = [
  { name: 'II AIML-H', year: 2, section: 'H', dept: 'AIML', size: 62 },
  { name: 'III AIML-A', year: 3, section: 'A', dept: 'AIML', size: 64 },
  { name: 'II CSE-A', year: 2, section: 'A', dept: 'CSE', size: 66 },
  { name: 'III CSE-A', year: 3, section: 'A', dept: 'CSE', size: 68 },
  { name: 'III CSE-B', year: 3, section: 'B', dept: 'CSE', size: 65 },
  { name: 'IV CSE-A', year: 4, section: 'A', dept: 'CSE', size: 63 },
  { name: 'III ECE-A', year: 3, section: 'A', dept: 'ECE', size: 60 },
  { name: 'II EEE-A', year: 2, section: 'A', dept: 'EEE', size: 58 },
  { name: 'IV MECH-A', year: 4, section: 'A', dept: 'MECH', size: 55 },
  { name: 'III CIVIL-A', year: 3, section: 'A', dept: 'CIVIL', size: 56 },
  { name: 'II IT-A', year: 2, section: 'A', dept: 'IT', size: 61 },
  { name: 'III BT-A', year: 3, section: 'A', dept: 'BT', size: 54 }
]

const FACULTY: Array<{ code: string; name: string; dept: string }> = [
  { code: 'AIML-FAC-02', name: 'Dr. S. Rajeswari', dept: 'AIML' },
  { code: 'AIML-FAC-03', name: 'Mr. P. Naveen Kumar', dept: 'AIML' },
  { code: 'CSE-FAC-02', name: 'Dr. M. Anitha', dept: 'CSE' },
  { code: 'CSE-FAC-03', name: 'Mr. K. Srinivas', dept: 'CSE' },
  { code: 'CSE-FAC-04', name: 'Ms. T. Deepika', dept: 'CSE' },
  { code: 'CSE-FAC-05', name: 'Dr. B. Ramesh Babu', dept: 'CSE' },
  { code: 'ECE-FAC-02', name: 'Dr. G. Prasad', dept: 'ECE' },
  { code: 'ECE-FAC-03', name: 'Mr. V. Suresh', dept: 'ECE' },
  { code: 'EEE-FAC-02', name: 'Dr. Y. Lakshmi Devi', dept: 'EEE' },
  { code: 'MECH-FAC-02', name: 'Dr. N. Chandrasekhar', dept: 'MECH' },
  { code: 'CIVIL-FAC-02', name: 'Mr. A. Venkatesh', dept: 'CIVIL' },
  { code: 'IT-FAC-02', name: 'Ms. R. Harika', dept: 'IT' },
  { code: 'BT-FAC-02', name: 'Dr. J. Sudhakar', dept: 'BT' }
]

const SUBJECTS: Record<string, { name: string; lab?: boolean }[]> = {
  CSE: [
    { name: 'Compiler Design' },
    { name: 'Computer Networks' },
    { name: 'Software Engineering' },
    { name: 'Theory of Computation' },
    { name: 'Web Technologies' },
    { name: 'Cloud Computing' },
    { name: 'Computer Networks Lab', lab: true },
    { name: 'Web Technologies Lab', lab: true }
  ],
  AIML: [
    { name: 'Deep Learning' },
    { name: 'Natural Language Processing' },
    { name: 'Reinforcement Learning' },
    { name: 'Computer Vision' },
    { name: 'Big Data Analytics' },
    { name: 'Deep Learning Lab', lab: true },
    { name: 'NLP Lab', lab: true }
  ],
  ECE: [
    { name: 'Digital Signal Processing' },
    { name: 'VLSI Design' },
    { name: 'Microprocessors & Microcontrollers' },
    { name: 'Antenna & Wave Propagation' },
    { name: 'Embedded Systems' },
    { name: 'VLSI Design Lab', lab: true },
    { name: 'DSP Lab', lab: true }
  ],
  EEE: [
    { name: 'Power Systems' },
    { name: 'Electrical Machines' },
    { name: 'Control Systems' },
    { name: 'Power Electronics' },
    { name: 'Electrical Machines Lab', lab: true }
  ],
  MECH: [
    { name: 'Thermodynamics' },
    { name: 'Fluid Mechanics' },
    { name: 'Machine Design' },
    { name: 'Heat Transfer' },
    { name: 'CAD/CAM' },
    { name: 'Fluid Mechanics Lab', lab: true }
  ],
  CIVIL: [
    { name: 'Structural Analysis' },
    { name: 'Geotechnical Engineering' },
    { name: 'Transportation Engineering' },
    { name: 'Environmental Engineering' },
    { name: 'Concrete Technology Lab', lab: true }
  ],
  IT: [
    { name: 'Information Security' },
    { name: 'Data Warehousing & Mining' },
    { name: 'Mobile Application Development' },
    { name: 'Distributed Systems' },
    { name: 'Information Security Lab', lab: true }
  ],
  BT: [
    { name: 'Molecular Biology' },
    { name: 'Bioprocess Engineering' },
    { name: 'Genetic Engineering' },
    { name: 'Bioinformatics' },
    { name: 'Genetics Lab', lab: true }
  ]
}

export async function seedDemoSections(prisma: PrismaClient): Promise<void> {
  // Synthetic rows are regenerated on every seed so the grid is deterministic
  // and never accumulates stale slots. Real (is_mock: false) rows are untouched.
  const removed = await prisma.entry.deleteMany({ where: { is_mock: true } })
  if (removed.count > 0) {
    console.log(`- Cleared ${removed.count} previous synthetic entries`)
  }

  const deptIds = new Map<string, string>()
  for (const d of DEPARTMENTS) {
    const row = await prisma.department.upsert({
      where: { code: d.code },
      update: {},
      create: { code: d.code, name: d.name }
    })
    deptIds.set(d.code, row.id)
  }

  const facultyIds = new Map<string, string>()
  for (const f of FACULTY) {
    const row = await prisma.faculty.upsert({
      where: { code: f.code },
      update: { name: f.name, departmentId: deptIds.get(f.dept) },
      create: {
        code: f.code,
        name: f.name,
        departmentId: deptIds.get(f.dept),
        is_mock: true
      }
    })
    facultyIds.set(f.code, row.id)
  }

  const sourceFile = await prisma.sourceFile.upsert({
    where: { sha256: 'synthetic-demo-sections-v1' },
    update: {},
    create: {
      filename: 'SYNTHETIC_DEMO_DATA.txt',
      sha256: 'synthetic-demo-sections-v1',
      status: 'committed',
      committedAt: new Date('2026-11-05'),
      report: JSON.stringify({
        synthetic: true,
        note: 'Generated placeholder coverage. Not parsed from department sheets.',
        sections: SECTIONS.map(s => s.name)
      })
    }
  })

  const rooms = await prisma.room.findMany({ select: { id: true, type: true, capacity: true } })
  const classrooms = rooms.filter(r => r.type === 'Classroom').map(r => r.id)
  const labs = rooms.filter(r => r.type === 'Laboratory').map(r => r.id)

  // Room and faculty occupancy for the whole week, primed with the real
  // II AIML-J rows so synthetic entries never double-book a real slot.
  const roomBusy = new Set<string>()
  const facultyBusy = new Set<string>()
  const groupBusy = new Set<string>()
  const existing = await prisma.entry.findMany({
    select: { roomId: true, facultyId: true, groupId: true, day: true, startTime: true }
  })
  for (const e of existing) {
    if (e.roomId) roomBusy.add(`${e.roomId}|${e.day}|${e.startTime}`)
    if (e.facultyId) facultyBusy.add(`${e.facultyId}|${e.day}|${e.startTime}`)
    if (e.groupId) groupBusy.add(`${e.groupId}|${e.day}|${e.startTime}`)
  }

  let created = 0
  let skipped = 0

  for (const sec of SECTIONS) {
    const group = await prisma.group.upsert({
      where: { name: sec.name },
      update: { size: sec.size },
      create: {
        name: sec.name,
        year: sec.year,
        section: sec.section,
        size: sec.size,
        departmentId: deptIds.get(sec.dept)!
      }
    })

    const pool = SUBJECTS[sec.dept]
    const groupFaculty = FACULTY.filter(f => f.dept === sec.dept)
    let facultyCursor = 0

    const already = await prisma.entry.count({ where: { groupId: group.id, is_mock: true } })
    if (already > 0) {
      skipped += 1
      continue
    }

    let subjectIdx = 0
    for (const day of DAYS) {
      // Five teaching periods per day, two of them afternoon.
      const periodIdx = [0, 2, 3, 6, 7]
      for (const pIdx of periodIdx) {
        const period = PERIODS[pIdx]
        if (groupBusy.has(`${group.id}|${day}|${period.start}`)) continue

        const subject = pool[subjectIdx % pool.length]
        subjectIdx += 1
        const wantLab = !!subject.lab

        // Rotate through the department's staff so no single member is the
        // bottleneck for every section in that department.
        let facultyId: string | undefined
        for (let i = 0; i < groupFaculty.length; i++) {
          const candidate = facultyIds.get(groupFaculty[(facultyCursor + i) % groupFaculty.length].code)!
          if (!facultyBusy.has(`${candidate}|${day}|${period.start}`)) {
            facultyId = candidate
            facultyCursor = (facultyCursor + i + 1) % groupFaculty.length
            break
          }
        }
        if (!facultyId) continue

        const candidateRooms = wantLab ? [...labs, ...classrooms] : classrooms
        const roomId = candidateRooms.find(r => !roomBusy.has(`${r}|${day}|${period.start}`))
        if (!roomId) {
          skipped += 1
          continue
        }

        await prisma.entry.create({
          data: {
            sourceFileId: sourceFile.id,
            groupId: group.id,
            facultyId,
            roomId,
            day,
            startTime: period.start,
            endTime: period.end,
            subject: subject.name,
            entryType: wantLab ? 'lab' : 'class',
            is_mock: true,
            is_live: true
          }
        })

        roomBusy.add(`${roomId}|${day}|${period.start}`)
        facultyBusy.add(`${facultyId}|${day}|${period.start}`)
        groupBusy.add(`${group.id}|${day}|${period.start}`)
        created += 1
      }
    }
  }

  console.log(`- Synthetic sections: ${SECTIONS.length - skipped} seeded, ${created} mock entries (is_mock: true)`)
}
