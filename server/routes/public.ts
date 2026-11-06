import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { campusNow } from '../lib/time.js'

const router = Router()

// GET /health (and /api/health when mounted on /api)
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'campuspulse-backend',
    version: '1.0.0',
    time: new Date().toISOString()
  })
})

// GET /api/campus/blocks
router.get('/campus/blocks', async (_req: Request, res: Response) => {
  const blocks = await prisma.block.findMany({
    include: {
      floors: {
        orderBy: { number: 'asc' }
      }
    },
    orderBy: { id: 'asc' }
  })
  res.json({ blocks })
})

// GET /api/campus/blocks/:code/floors
router.get('/campus/blocks/:code/floors', async (req: Request, res: Response) => {
  const code = req.params.code.toUpperCase()
  const block = await prisma.block.findUnique({
    where: { id: code },
    include: {
      floors: {
        orderBy: { number: 'asc' }
      }
    }
  })

  if (!block) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Block "${code}" not found.`
      }
    })
    return
  }

  res.json({ blockId: block.id, blockName: block.name, floors: block.floors })
})

// GET /api/campus/floors/:floorId - rooms on floor with real-time status
router.get('/campus/floors/:floorId', async (req: Request, res: Response) => {
  const { floorId } = req.params
  const floor = await prisma.floor.findUnique({
    where: { id: floorId },
    include: {
      rooms: true
    }
  })

  if (!floor) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Floor "${floorId}" not found.`
      }
    })
    return
  }

  const now = new Date()
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const queryDay = days[now.getDay()]
  const queryTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const roomIds = floor.rooms.map(r => r.id)

  const activeEntries = await prisma.entry.findMany({
    where: {
      roomId: { in: roomIds },
      day: queryDay,
      is_live: true,
      startTime: { lte: queryTime },
      endTime: { gt: queryTime }
    }
  })

  const occupiedSet = new Set(activeEntries.map(e => e.roomId))

  const roomsWithStatus = floor.rooms.map(room => ({
    ...room,
    status: occupiedSet.has(room.id) ? 'OCCUPIED' : 'FREE'
  }))

  res.json({
    floor: {
      id: floor.id,
      blockId: floor.blockId,
      number: floor.number,
      label: floor.label,
      rooms: roomsWithStatus
    }
  })
})

// GET /api/availability/now?at=
router.get('/availability/now', async (req: Request, res: Response) => {
  const { at, day, time } = req.query as { at?: string; day?: string; time?: string }

  // Everything here is campus-local time (Asia/Kolkata). Using the server's own
  // clock would read the wrong day and hour on a UTC host.
  let queryDay: string
  let queryTime: string

  const explicitTime = time || null

  if (at) {
    const d = new Date(at)
    if (isNaN(d.getTime())) {
      const c = campusNow()
      queryDay = day ? day.toUpperCase() : c.day
      queryTime = explicitTime || c.time
    } else {
      const c = campusNow(d)
      queryDay = day ? day.toUpperCase() : c.day
      queryTime = explicitTime || c.time
    }
  } else {
    const c = campusNow()
    queryDay = day ? day.toUpperCase() : c.day
    queryTime = explicitTime || c.time
  }

  const LATER_WINDOW_MINUTES = 60
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(n => parseInt(n, 10))
    return h * 60 + m
  }

  const liveEntries = await prisma.entry.findMany({
    where: { day: queryDay, is_live: true },
    select: { roomId: true, startTime: true, endTime: true, subject: true }
  })

  const disruptions = await prisma.disruption.findMany({
    where: { affectedDay: queryDay, status: 'open' },
    select: { roomId: true, startTime: true, endTime: true, type: true }
  })

  const rooms = await prisma.room.findMany({
    select: {
      id: true,
      blockId: true,
      floorId: true,
      floor_num: true,
      type: true,
      capacity: true,
      confidence: true,
      is_mock: true
    }
  })

  const disruptedRooms = new Set(
    disruptions
      .filter(d => d.roomId && d.startTime <= queryTime && d.endTime > queryTime)
      .map(d => d.roomId!)
  )

  const occupiedRooms = new Map(
    liveEntries
      .filter(e => e.roomId && e.startTime <= queryTime && e.endTime > queryTime)
      .map(e => [e.roomId!, e.subject])
  )

  const queryMinutes = toMinutes(queryTime)
  const laterRooms = new Map(
    liveEntries
      .filter(
        e =>
          e.roomId &&
          e.startTime > queryTime &&
          toMinutes(e.startTime) - queryMinutes <= LATER_WINDOW_MINUTES
      )
      .map(e => [e.roomId!, e.startTime])
  )

  const result = rooms.map(r => {
    let status: 'FREE' | 'OCCUPIED' | 'LATER' | 'UNAVAILABLE' = 'FREE'
    let detail: string | undefined

    if (disruptedRooms.has(r.id)) {
      status = 'UNAVAILABLE'
      detail = 'Room unavailable (active disruption)'
    } else if (occupiedRooms.has(r.id)) {
      status = 'OCCUPIED'
      detail = occupiedRooms.get(r.id) || 'Class in session'
    } else if (laterRooms.has(r.id)) {
      status = 'LATER'
      detail = `Free until ${laterRooms.get(r.id)}`
    } else {
      status = 'FREE'
      detail = 'Free all day'
    }

    return {
      ...r,
      status,
      detail
    }
  })

  res.json({ day: queryDay, time: queryTime, rooms: result })
})

// GET /api/availability/search?day=&from=&to=&block=&type=
router.get('/availability/search', async (req: Request, res: Response) => {
  const { day, from, to, block, type } = req.query as {
    day?: string
    from?: string
    to?: string
    block?: string
    type?: string
  }

  if (!day || !from || !to) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Query parameters "day", "from", and "to" are required.'
      }
    })
    return
  }

  const queryDay = day.toUpperCase()

  const busyEntries = await prisma.entry.findMany({
    where: {
      day: queryDay,
      is_live: true,
      roomId: { not: null },
      NOT: [
        { endTime: { lte: from } },
        { startTime: { gte: to } }
      ]
    },
    select: { roomId: true }
  })

  const disruptedRooms = await prisma.disruption.findMany({
    where: {
      affectedDay: queryDay,
      status: 'open',
      roomId: { not: null },
      NOT: [
        { endTime: { lte: from } },
        { startTime: { gte: to } }
      ]
    },
    select: { roomId: true }
  })

  const busyIds = new Set([
    ...busyEntries.map(e => e.roomId!),
    ...disruptedRooms.map(d => d.roomId!)
  ])

  const freeRooms = await prisma.room.findMany({
    where: {
      id: { notIn: Array.from(busyIds) },
      ...(block ? { blockId: block.toUpperCase() } : {}),
      ...(type ? { type: { contains: type } } : {})
    },
    include: { floor: true },
    orderBy: { id: 'asc' }
  })

  res.json({ day: queryDay, from, to, freeRooms })
})

// GET /api/rooms/:id/timetable?day=
router.get('/rooms/:id/timetable', async (req: Request, res: Response) => {
  const { id } = req.params
  const { day } = req.query as { day?: string }

  const room = await prisma.room.findUnique({
    where: { id },
    include: { floor: true }
  })

  if (!room) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Room "${id}" not found.`
      }
    })
    return
  }

  const entries = await prisma.entry.findMany({
    where: {
      roomId: id,
      is_live: true,
      ...(day ? { day: day.toUpperCase() } : {})
    },
    include: {
      group: true,
      faculty: { select: { id: true, name: true, code: true } } // no contact details
    },
    orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
  })

  res.json({ room, entries })
})

// GET /api/faculty/:id/timetable?day=
router.get('/faculty/:id/timetable', async (req: Request, res: Response) => {
  const { id } = req.params
  const { day } = req.query as { day?: string }

  const faculty = await prisma.faculty.findUnique({
    where: { id },
    select: { id: true, name: true, code: true, departmentId: true, department: true } // Zero contact fields!
  })

  if (!faculty) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Faculty record "${id}" not found.`
      }
    })
    return
  }

  const entries = await prisma.entry.findMany({
    where: {
      facultyId: id,
      is_live: true,
      ...(day ? { day: day.toUpperCase() } : {})
    },
    include: {
      room: { select: { id: true, blockId: true, floorId: true } },
      group: true
    },
    orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
  })

  res.json({ faculty, entries })
})

// GET /api/groups?year=&department=&section=
router.get('/groups', async (req: Request, res: Response) => {
  const { year, department, section } = req.query as {
    year?: string
    department?: string
    section?: string
  }

  const groups = await prisma.group.findMany({
    where: {
      ...(year ? { year: parseInt(year, 10) } : {}),
      ...(section ? { section } : {}),
      ...(department
        ? {
            department: {
              OR: [{ code: department.toUpperCase() }, { name: { contains: department } }]
            }
          }
        : {})
    },
    include: { department: true },
    orderBy: { name: 'asc' }
  })

  res.json({ groups })
})

// GET /api/groups/:id/timetable
router.get('/groups/:id/timetable', async (req: Request, res: Response) => {
  const idOrName = decodeURIComponent(req.params.id)

  const group = await prisma.group.findFirst({
    where: {
      OR: [{ id: idOrName }, { name: idOrName }]
    },
    include: { department: true }
  })

  if (!group) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Group "${idOrName}" not found.`
      }
    })
    return
  }

  const entries = await prisma.entry.findMany({
    where: { groupId: group.id, is_live: true },
    include: {
      room: { select: { id: true, blockId: true, floorId: true } },
      faculty: { select: { id: true, name: true, code: true } } // no phone or email
    },
    orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
  })

  res.json({ group, entries })
})


// ==========================================
// REST Resource Aliases for CampusPulse Client
// ==========================================

// GET /api/buildings
router.get('/buildings', async (_req: Request, res: Response) => {
  const blocks = await prisma.block.findMany({
    include: {
      floors: {
        orderBy: { number: 'asc' }
      }
    },
    orderBy: { id: 'asc' }
  })
  const buildings = blocks.map(b => ({
    id: b.id,
    name: b.name,
    originalCode: b.id,
    slug: b.id === 'N' ? 'nagarjuna-block' : b.id === 'A' ? 'vignan-bhavan' : b.id === 'U' ? 'aryabhata-bhavan' : b.id === 'H' ? 'h-block' : 'library',
    description: `${b.name} Academic Facility, VFSTR`,
    totalFloors: b.floors.length,
    floors: b.floors,
    departments: ['CSE', 'ECE', 'AIML'],
    imageUrl: `/assets/campus-images/${b.id === 'N' ? 'nagarjuna-block.webp' : b.id === 'A' ? 'vignan-bhavan.webp' : b.id === 'U' ? 'aryabhata-bhavan.webp' : b.id === 'H' ? 'h-block.webp' : 'central-library.webp'}`
  }))
  res.json(buildings)
})

// GET /api/buildings/:id
router.get('/buildings/:id', async (req: Request, res: Response) => {
  const code = req.params.id.toUpperCase()
  const block = await prisma.block.findFirst({
    where: { OR: [{ id: code }, { name: { contains: req.params.id } }] },
    include: { floors: true }
  })
  if (!block) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Building "${req.params.id}" not found.` } })
    return
  }
  res.json({
    id: block.id,
    name: block.name,
    originalCode: block.id,
    slug: block.id === 'N' ? 'nagarjuna-block' : block.id === 'A' ? 'vignan-bhavan' : block.id === 'U' ? 'aryabhata-bhavan' : block.id === 'H' ? 'h-block' : 'library',
    description: `${block.name} Academic Facility, VFSTR`,
    totalFloors: block.floors.length,
    departments: ['CSE', 'ECE', 'AIML'],
    imageUrl: `/assets/campus-images/${block.id === 'N' ? 'nagarjuna-block.webp' : block.id === 'A' ? 'vignan-bhavan.webp' : block.id === 'U' ? 'aryabhata-bhavan.webp' : block.id === 'H' ? 'h-block.webp' : 'central-library.webp'}`
  })
})

// GET /api/floors
router.get('/floors', async (req: Request, res: Response) => {
  const { buildingId } = req.query as { buildingId?: string }
  const floors = await prisma.floor.findMany({
    where: buildingId ? { blockId: buildingId.toUpperCase() } : {},
    include: { rooms: true },
    orderBy: { number: 'asc' }
  })
  res.json(floors.map(f => ({
    id: f.id,
    buildingId: f.blockId,
    floorNumber: f.number,
    name: f.label,
    roomIds: f.rooms.map(r => r.id)
  })))
})

// GET /api/rooms
router.get('/rooms', async (req: Request, res: Response) => {
  const { buildingId, floorId, type } = req.query as { buildingId?: string; floorId?: string; type?: string }
  const rooms = await prisma.room.findMany({
    where: {
      ...(buildingId ? { blockId: buildingId.toUpperCase() } : {}),
      ...(floorId ? { floorId } : {}),
      ...(type ? { type: { contains: type } } : {})
    },
    include: { floor: true }
  })
  res.json(rooms.map(r => ({
    id: r.id,
    roomNumber: r.id,
    name: `Room ${r.id}`,
    buildingId: r.blockId,
    floorId: r.floorId || '',
    type: r.type === 'lab' ? 'laboratory' : 'classroom',
    capacity: r.capacity || 60,
    isSchedulable: true
  })))
})

// GET /api/timetables
router.get('/timetables', async (req: Request, res: Response) => {
  const { sectionId, facultyId, day } = req.query as { sectionId?: string; facultyId?: string; day?: string }
  const dayUpper = day ? day.slice(0, 3).toUpperCase() : undefined
  const entries = await prisma.entry.findMany({
    where: {
      is_live: true,
      ...(dayUpper ? { day: dayUpper } : {}),
      ...(facultyId ? { faculty: { OR: [{ id: facultyId }, { name: facultyId }] } } : {}),
      ...(sectionId ? { group: { OR: [{ id: sectionId }, { name: sectionId }] } } : {})
    },
    include: { room: true, faculty: true, group: true },
    orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
  })
  res.json(entries.map(e => ({
    id: e.id,
    academicYearId: 'ay-2026-27',
    semesterId: 'sem-even-2026',
    departmentId: e.faculty?.departmentId || 'dept-cse',
    yearOfStudy: e.group?.year || 2,
    sectionId: e.group?.name || e.groupId,
    subjectId: e.subject,
    facultyId: e.faculty?.name || e.facultyId || '',
    buildingId: e.room?.blockId || '',
    floorId: e.room?.floorId || '',
    roomId: e.roomId || '',
    day: e.day === 'MON' ? 'Monday' : e.day === 'TUE' ? 'Tuesday' : e.day === 'WED' ? 'Wednesday' : e.day === 'THU' ? 'Thursday' : e.day === 'FRI' ? 'Friday' : e.day === 'SAT' ? 'Saturday' : 'Sunday',
    startTime: e.startTime,
    endTime: e.endTime,
    isLab: e.is_lab || false,
    status: e.is_live ? 'published' : 'draft'
  })))
})

// GET /api/departments
router.get('/departments', async (_req: Request, res: Response) => {
  const depts = await prisma.department.findMany()
  res.json(depts.map(d => ({
    id: d.id,
    name: d.name,
    code: d.code
  })))
})

// GET /api/academic-years
router.get('/academic-years', async (_req: Request, res: Response) => {
  res.json([
    { id: 'ay-2026-27', yearName: '2026-2027', startDate: '2026-06-01', endDate: '2027-05-31', isActive: true }
  ])
})

// GET /api/semesters
router.get('/semesters', async (_req: Request, res: Response) => {
  res.json([
    { id: 'sem-odd-2026', academicYearId: 'ay-2026-27', semesterNumber: 1, name: 'Semester I (Odd)', isActive: false },
    { id: 'sem-even-2026', academicYearId: 'ay-2026-27', semesterNumber: 2, name: 'Semester II (Even)', isActive: true }
  ])
})

// GET /api/sections
router.get('/sections', async (_req: Request, res: Response) => {
  const groups = await prisma.group.findMany({ include: { department: true } })
  res.json(groups.map(g => ({
    id: g.name,
    departmentId: g.departmentId,
    yearOfStudy: g.year,
    name: g.name,
    totalStudents: g.strength || 65
  })))
})

// GET /api/faculty
router.get('/faculty', async (_req: Request, res: Response) => {
  const faculty = await prisma.faculty.findMany({ include: { department: true } })
  res.json(faculty.map(f => ({
    id: f.id,
    departmentId: f.departmentId,
    name: f.name,
    designation: f.code || 'Faculty',
    email: `${f.code.toLowerCase()}@vignan.ac.in`
  })))
})

// GET /api/subjects
router.get('/subjects', async (_req: Request, res: Response) => {
  const entries = await prisma.entry.findMany({ select: { subject: true }, distinct: ['subject'] })
  res.json(entries.map(e => ({
    id: e.subject,
    departmentId: 'dept-cse',
    yearOfStudy: 2,
    code: e.subject.slice(0, 6).toUpperCase(),
    name: e.subject
  })))
})

export default router
