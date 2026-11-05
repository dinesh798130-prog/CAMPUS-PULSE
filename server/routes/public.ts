import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// GET /api/campus/blocks
router.get('/campus/blocks', async (_req: Request, res: Response) => {
  const blocks = await prisma.block.findMany({
    include: {
      floors: {
        orderBy: { number: 'asc' }
      }
    }
  })
  res.json({ blocks })
})

// GET /api/campus/blocks/:blockId/rooms
router.get('/campus/blocks/:blockId/rooms', async (req: Request, res: Response) => {
  const { blockId } = req.params
  const rooms = await prisma.room.findMany({
    where: { blockId: blockId.toUpperCase() },
    include: { floor: true },
    orderBy: { id: 'asc' }
  })
  res.json({ rooms })
})

// GET /api/availability/now
router.get('/availability/now', async (req: Request, res: Response) => {
  const { day, time } = req.query as { day?: string; time?: string }
  
  const now = new Date()
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const queryDay = (day ? day.toUpperCase() : days[now.getDay()])
  const queryTime = time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

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

  const laterRooms = new Map(
    liveEntries
      .filter(e => e.roomId && e.startTime > queryTime)
      .map(e => [e.roomId!, e.startTime])
  )

  const result = rooms.map(r => {
    let status: 'FREE' | 'OCCUPIED' | 'LATER' | 'UNAVAILABLE' = 'FREE'
    let detail: string | undefined

    if (disruptedRooms.has(r.id)) {
      status = 'UNAVAILABLE'
      detail = 'Room disrupted/closed'
    } else if (occupiedRooms.has(r.id)) {
      status = 'OCCUPIED'
      detail = occupiedRooms.get(r.id) || 'Class in progress'
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

// GET /api/availability/search
router.get('/availability/search', async (req: Request, res: Response) => {
  const { day, from, to, block } = req.query as { day?: string; from?: string; to?: string; block?: string }

  if (!day || !from || !to) {
    res.status(400).json({ error: 'Parameters day, from, and to are required' })
    return
  }

  const queryDay = day.toUpperCase()

  // Find busy room IDs via overlapping entries
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

  // Find disrupted rooms
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

  const unavailableIds = new Set([
    ...busyEntries.map(e => e.roomId!),
    ...disruptedRooms.map(d => d.roomId!)
  ])

  const freeRooms = await prisma.room.findMany({
    where: {
      id: { notIn: Array.from(unavailableIds) },
      ...(block ? { blockId: block.toUpperCase() } : {})
    },
    include: { floor: true },
    orderBy: { id: 'asc' }
  })

  res.json({ day: queryDay, from, to, freeRooms })
})

// GET /api/groups
router.get('/groups', async (_req: Request, res: Response) => {
  const groups = await prisma.group.findMany({
    include: { department: true },
    orderBy: { name: 'asc' }
  })
  res.json({ groups })
})

// GET /api/groups/:name/timetable
router.get('/groups/:name/timetable', async (req: Request, res: Response) => {
  const name = decodeURIComponent(req.params.name)
  const group = await prisma.group.findUnique({
    where: { name },
    include: { department: true }
  })

  if (!group) {
    res.status(404).json({ error: 'Group not found' })
    return
  }

  const entries = await prisma.entry.findMany({
    where: { groupId: group.id, is_live: true },
    include: {
      room: { select: { id: true, blockId: true, floorId: true } },
      // Strict rule: No faculty contact fields! Only id, name, departmentId
      faculty: { select: { id: true, name: true, departmentId: true } }
    },
    orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
  })

  res.json({ group, entries })
})

// GET /api/rooms/:roomId/timetable
router.get('/rooms/:roomId/timetable', async (req: Request, res: Response) => {
  const room = await prisma.room.findUnique({
    where: { id: req.params.roomId },
    include: { floor: true }
  })

  if (!room) {
    res.status(404).json({ error: 'Room not found' })
    return
  }

  const entries = await prisma.entry.findMany({
    where: { roomId: req.params.roomId, is_live: true },
    include: {
      group: true,
      faculty: { select: { id: true, name: true } }
    },
    orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
  })

  res.json({ room, entries })
})

// GET /api/faculty/:id/timetable
router.get('/faculty/:id/timetable', async (req: Request, res: Response) => {
  const faculty = await prisma.faculty.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, code: true, department: true } // No phone or contact
  })

  if (!faculty) {
    res.status(404).json({ error: 'Faculty not found' })
    return
  }

  const entries = await prisma.entry.findMany({
    where: { facultyId: req.params.id, is_live: true },
    include: {
      room: { select: { id: true, blockId: true, floorId: true } },
      group: true
    },
    orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
  })

  res.json({ faculty, entries })
})

export default router
