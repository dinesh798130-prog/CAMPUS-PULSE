import { Router, Request, Response } from 'express'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { log } from '../lib/logger.js'
import multer from 'multer'
import fs from 'fs'
import crypto from 'crypto'
import { z } from 'zod'
import { findRepairOptions, CandidateRoom } from '../../src/engine/repairSearch.js'
import { ScheduledEntry, DisruptionRecord } from '../../src/engine/intervalSearch.js'

const router = Router()
router.use(requireAuth)
router.use(requireRole('admin'))

const uploadDir = 'uploads'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.toLowerCase().endsWith('.xlsx')
    ) {
      cb(null, true)
    } else {
      cb(new Error('Only .xlsx files are permitted'))
    }
  }
})

const DAY_MAP_TO_NUM: Record<string, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7
}

function getPagination(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

// POST /api/admin/timetable/import
router.post('/timetable/import', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: { code: 'NO_FILE_UPLOADED', message: 'No file uploaded.' } })
    return
  }

  // Magic bytes check for zip/xlsx (PK\x03\x04)
  const fd = fs.openSync(req.file.path, 'r')
  const header = Buffer.alloc(4)
  fs.readSync(fd, header, 0, 4, 0)
  fs.closeSync(fd)

  if (header[0] !== 0x50 || header[1] !== 0x4b) {
    fs.unlinkSync(req.file.path)
    res.status(400).json({
      error: { code: 'INVALID_FILE_TYPE', message: 'Uploaded file is not a valid Excel (.xlsx) file.' }
    })
    return
  }

  const fileBytes = fs.readFileSync(req.file.path)
  const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex')

  const existing = await prisma.sourceFile.findUnique({ where: { sha256 } })
  if (existing) {
    fs.unlinkSync(req.file.path)
    res.status(409).json({
      error: { code: 'FILE_ALREADY_EXISTS', message: 'This file has already been imported.' },
      sourceFileId: existing.id,
      status: existing.status
    })
    return
  }

  const report = {
    filename: req.file.originalname,
    sha256,
    sizeBytes: req.file.size,
    status: 'staged',
    note: 'Staged successfully outside web root. Use /commit to publish to live schedule.'
  }

  const sourceFile = await prisma.sourceFile.create({
    data: {
      filename: req.file.originalname,
      sha256,
      status: 'staged',
      report: JSON.stringify(report)
    }
  })

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'timetable.import',
      entity: 'SourceFile',
      entityId: sourceFile.id,
      detail: `Staged timetable file: ${req.file.originalname} (${req.file.size} bytes)`
    }
  })

  res.json({ sourceFileId: sourceFile.id, report })
})

// POST /api/admin/timetable/import/:id/commit
router.post('/timetable/import/:id/commit', async (req: AuthRequest, res: Response) => {
  const sourceFile = await prisma.sourceFile.findUnique({ where: { id: req.params.id } })
  if (!sourceFile) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Source file not found.' } })
    return
  }

  if (sourceFile.status === 'committed') {
    res.status(409).json({ error: { code: 'ALREADY_COMMITTED', message: 'Source file is already committed.' } })
    return
  }

  await prisma.sourceFile.update({
    where: { id: req.params.id },
    data: { status: 'committed', committedAt: new Date() }
  })

  const updatedEntries = await prisma.entry.updateMany({
    where: { sourceFileId: req.params.id },
    data: { is_live: true }
  })

  // Clean up any uploaded temp file
  const uploadedFiles = fs.readdirSync(uploadDir)
  for (const f of uploadedFiles) {
    try {
      fs.unlinkSync(`${uploadDir}/${f}`)
    } catch {}
  }

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'timetable.commit',
      entity: 'SourceFile',
      entityId: req.params.id,
      detail: `Published ${updatedEntries.count} entries to live schedule`
    }
  })

  res.json({ ok: true, sourceFileId: req.params.id, publishedEntries: updatedEntries.count })
})

// GET /api/admin/entries?group=&day=
router.get('/entries', async (req: Request, res: Response) => {
  const { group, day } = req.query as { group?: string; day?: string }
  const { limit, skip, page } = getPagination(req)

  const where: any = {}
  if (day) where.day = day.toUpperCase()
  if (group) {
    const g = await prisma.group.findFirst({ where: { OR: [{ id: group }, { name: group }] } })
    if (g) where.groupId = g.id
  }

  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where,
      include: {
        room: true,
        faculty: { select: { id: true, name: true, code: true } },
        group: true
      },
      skip,
      take: limit,
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
    }),
    prisma.entry.count({ where })
  ])

  res.json({ entries, pagination: { total, page, limit } })
})

// POST /api/admin/entries/:id/change - direct admin change
const DirectChangeSchema = z.object({
  roomId: z.string().optional(),
  day: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().optional()
})

router.post('/entries/:id/change', async (req: AuthRequest, res: Response) => {
  const parsed = DirectChangeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message } })
    return
  }

  const entry = await prisma.entry.findUnique({ where: { id: req.params.id } })
  if (!entry) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Timetable entry not found.' } })
    return
  }

  const updated = await prisma.entry.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.roomId ? { roomId: parsed.data.roomId } : {}),
      ...(parsed.data.day ? { day: parsed.data.day.toUpperCase() } : {}),
      ...(parsed.data.startTime ? { startTime: parsed.data.startTime } : {}),
      ...(parsed.data.endTime ? { endTime: parsed.data.endTime } : {})
    }
  })

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'entry.change',
      entity: 'Entry',
      entityId: entry.id,
      detail: `Direct schedule update: ${parsed.data.reason || 'Admin modification'}`
    }
  })

  res.json({ ok: true, entry: updated })
})

// GET /api/admin/disruptions
router.get('/disruptions', async (_req: Request, res: Response) => {
  const disruptions = await prisma.disruption.findMany({
    include: {
      proposals: { include: { room: true } },
      entry: { include: { group: true } },
      room: true
    },
    orderBy: { createdAt: 'desc' }
  })
  res.json({ disruptions })
})

// POST /api/admin/disruptions
const DisruptionSchema = z.object({
  entryId: z.string().optional(),
  roomId: z.string().optional(),
  type: z.enum(['cancellation', 'room_closure', 'faculty_change']),
  reason: z.string().optional(),
  affectedDay: z.string(),
  startTime: z.string(),
  endTime: z.string()
})

router.post('/disruptions', async (req: AuthRequest, res: Response) => {
  const parsed = DisruptionSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message } })
    return
  }

  const { entryId, roomId, type, reason, affectedDay, startTime, endTime } = parsed.data
  const dayUpper = affectedDay.toUpperCase()
  const dayNum = DAY_MAP_TO_NUM[dayUpper] || 1

  const disruption = await prisma.disruption.create({
    data: {
      entryId: entryId || null,
      roomId: roomId || null,
      type,
      reason: reason || null,
      affectedDay: dayUpper,
      startTime,
      endTime,
      status: 'open',
      createdBy: req.user!.id
    }
  })

  const allEntries = await prisma.entry.findMany({ where: { is_live: true } })

  const engineEntries: ScheduledEntry[] = allEntries.map(e => ({
    id: e.id,
    roomId: e.roomId,
    facultyId: e.facultyId,
    groupId: e.groupId,
    subject: e.subject || undefined,
    day: DAY_MAP_TO_NUM[e.day] || 1,
    start: e.startTime,
    end: e.endTime
  }))

  const allDisruptions = await prisma.disruption.findMany({ where: { status: 'open' } })

  const engineDisruptions: DisruptionRecord[] = allDisruptions.map(d => ({
    id: d.id,
    roomId: d.roomId,
    day: DAY_MAP_TO_NUM[d.affectedDay] || 1,
    start: d.startTime,
    end: d.endTime,
    status: 'active'
  }))

  const allRooms = await prisma.room.findMany()
  const candidateRooms: CandidateRoom[] = allRooms.map(r => ({
    id: r.id,
    code: r.id,
    blockCode: r.blockId,
    floor: r.floor_num ?? 1,
    capacity: r.capacity || 60
  }))

  const allRoomEntries = new Map<string, ScheduledEntry[]>()
  for (const e of engineEntries) {
    if (e.roomId) {
      if (!allRoomEntries.has(e.roomId)) allRoomEntries.set(e.roomId, [])
      allRoomEntries.get(e.roomId)!.push(e)
    }
  }

  const allRoomDisruptions = new Map<string, DisruptionRecord[]>()
  for (const d of engineDisruptions) {
    if (d.roomId) {
      if (!allRoomDisruptions.has(d.roomId)) allRoomDisruptions.set(d.roomId, [])
      allRoomDisruptions.get(d.roomId)!.push(d)
    }
  }

  let affectedEntry: ScheduledEntry | null = null
  let currentCandidateRoom: CandidateRoom | null = null

  if (entryId) {
    const dbEntry = await prisma.entry.findUnique({ where: { id: entryId } })
    if (dbEntry) {
      affectedEntry = {
        id: dbEntry.id,
        roomId: dbEntry.roomId,
        facultyId: dbEntry.facultyId,
        groupId: dbEntry.groupId,
        subject: dbEntry.subject || undefined,
        day: DAY_MAP_TO_NUM[dbEntry.day] || 1,
        start: dbEntry.startTime,
        end: dbEntry.endTime
      }
    }
  }

  if (!affectedEntry) {
    affectedEntry = {
      id: `disrupted-slot-${disruption.id}`,
      roomId: roomId || null,
      day: dayNum,
      start: startTime,
      end: endTime
    }
  }

  if (affectedEntry.roomId) {
    const r = allRooms.find(rm => rm.id === affectedEntry!.roomId)
    if (r) {
      currentCandidateRoom = {
        id: r.id,
        code: r.id,
        blockCode: r.blockId,
        floor: r.floor_num ?? 1
      }
    }
  }

  const facultyEntries = affectedEntry.facultyId
    ? engineEntries.filter(e => e.facultyId === affectedEntry!.facultyId)
    : []

  const groupEntries = affectedEntry.groupId
    ? engineEntries.filter(e => e.groupId === affectedEntry!.groupId)
    : []

  const repairResult = findRepairOptions({
    affectedEntry,
    currentRoom: currentCandidateRoom,
    candidateRooms,
    groupSize: 50,
    allRoomEntries,
    allRoomDisruptions,
    facultyEntries,
    groupEntries
  })

  const savedProposals = []
  for (let i = 0; i < repairResult.options.length; i++) {
    const opt = repairResult.options[i]
    const p = await prisma.proposal.create({
      data: {
        disruptionId: disruption.id,
        roomId: opt.roomId,
        newDay: dayUpper,
        newStartTime: startTime,
        newEndTime: endTime,
        rank: i + 1,
        score: opt.score,
        status: 'pending'
      },
      include: { room: true }
    })
    savedProposals.push(p)
  }

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'disruption.create',
      entity: 'Disruption',
      entityId: disruption.id,
      detail: `Created ${type} disruption on ${dayUpper} ${startTime}-${endTime}. Generated ${savedProposals.length} repair proposals.`
    }
  })

  res.json({
    disruption,
    proposals: savedProposals,
    noSafeOption: repairResult.noSafeOption,
    noticeDraft: repairResult.cancellationNoticeDraft
  })
})

// GET /api/admin/proposals?status=
router.get('/proposals', async (req: Request, res: Response) => {
  const { status } = req.query as { status?: string }
  const proposals = await prisma.proposal.findMany({
    where: status ? { status } : {},
    include: {
      disruption: true,
      room: true
    },
    orderBy: { createdAt: 'desc' }
  })
  res.json({ proposals })
})

// POST /api/admin/proposals/:id/approve
router.post('/proposals/:id/approve', async (req: AuthRequest, res: Response) => {
  const proposal = await prisma.proposal.findUnique({
    where: { id: req.params.id },
    include: { disruption: true }
  })

  if (!proposal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Proposal not found.' } })
    return
  }

  if (proposal.status !== 'pending') {
    res.status(409).json({ error: { code: 'NOT_PENDING', message: `Proposal is already ${proposal.status}.` } })
    return
  }

  // Real-time hard constraint re-check: verify proposed room is still vacant
  const targetDay = proposal.newDay || proposal.disruption.affectedDay
  const targetStart = proposal.newStartTime || proposal.disruption.startTime
  const targetEnd = proposal.newEndTime || proposal.disruption.endTime

  if (proposal.roomId) {
    const conflict = await prisma.entry.findFirst({
      where: {
        roomId: proposal.roomId,
        day: targetDay,
        is_live: true,
        NOT: [{ endTime: { lte: targetStart } }, { startTime: { gte: targetEnd } }]
      }
    })

    if (conflict) {
      await prisma.proposal.update({
        where: { id: req.params.id },
        data: { status: 'stale' }
      })
      res.status(409).json({
        error: {
          code: 'STALE_PROPOSAL',
          message: 'Hard constraint check failed: Room became occupied since proposal generation.'
        }
      })
      return
    }
  }

  await prisma.proposal.update({
    where: { id: req.params.id },
    data: {
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: req.user!.id
    }
  })

  await prisma.proposal.updateMany({
    where: {
      disruptionId: proposal.disruptionId,
      id: { not: req.params.id }
    },
    data: { status: 'rejected' }
  })

  await prisma.disruption.update({
    where: { id: proposal.disruptionId },
    data: { status: 'resolved' }
  })

  if (proposal.disruption.entryId && proposal.roomId) {
    await prisma.entry.update({
      where: { id: proposal.disruption.entryId },
      data: { roomId: proposal.roomId }
    })
  }

  let notifiedCount = 0
  if (proposal.disruption.entryId) {
    const entry = await prisma.entry.findUnique({
      where: { id: proposal.disruption.entryId },
      include: { group: true }
    })
    if (entry?.group?.name) {
      const students = await prisma.user.findMany({ where: { group: entry.group.name } })
      for (const st of students) {
        await prisma.notification.create({
          data: {
            userId: st.id,
            type: 'proposal_approved',
            title: 'Schedule Change Approved',
            body: `Your class on ${targetDay} ${targetStart}-${targetEnd} has been moved to room ${proposal.roomId || 'Online/TBD'}.`
          }
        })
        notifiedCount++
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'proposal.approve',
      entity: 'Proposal',
      entityId: proposal.id,
      detail: `Approved repair option assigning room ${proposal.roomId} on ${targetDay}. Notified ${notifiedCount} students.`
    }
  })

  res.json({ ok: true, approvedProposalId: proposal.id, notifiedStudents: notifiedCount })
})

// POST /api/admin/proposals/:id/reject
router.post('/proposals/:id/reject', async (req: AuthRequest, res: Response) => {
  const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id } })
  if (!proposal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Proposal not found.' } })
    return
  }

  await prisma.proposal.update({
    where: { id: req.params.id },
    data: { status: 'rejected' }
  })

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'proposal.reject',
      entity: 'Proposal',
      entityId: req.params.id,
      detail: `Rejected proposal ${req.params.id}`
    }
  })

  res.json({ ok: true })
})

// GET /api/admin/audit-log?from=&to=
router.get('/audit-log', async (req: Request, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string }
  const { limit, skip, page } = getPagination(req)

  const where: any = {}
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {})
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ])

  res.json({ logs, pagination: { total, page, limit } })
})

// GET /api/admin/conflicts - detect double-booked rooms or faculty
router.get('/conflicts', async (_req: Request, res: Response) => {
  const live = await prisma.entry.findMany({
    where: { is_live: true },
    include: { room: true, faculty: true, group: true }
  })

  const conflicts: Array<{ type: string; description: string; entries: any[] }> = []

  // Check room conflicts
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i]
      const b = live[j]

      if (a.day === b.day) {
        const overlap = !(a.endTime <= b.startTime || a.startTime >= b.endTime)
        if (overlap) {
          if (a.roomId && a.roomId === b.roomId) {
            conflicts.push({
              type: 'ROOM_CLASH',
              description: `Room ${a.roomId} double-booked on ${a.day} ${a.startTime}-${a.endTime}`,
              entries: [a, b]
            })
          }
          if (a.facultyId && a.facultyId === b.facultyId) {
            conflicts.push({
              type: 'FACULTY_CLASH',
              description: `Faculty ${a.faculty?.name} double-booked on ${a.day} ${a.startTime}-${a.endTime}`,
              entries: [a, b]
            })
          }
        }
      }
    }
  }

  res.json({ count: conflicts.length, conflicts })
})

// --- CRUD Endpoints for Academic Entities ---

// Rooms CRUD
router.get('/rooms', async (_req: Request, res: Response) => {
  const rooms = await prisma.room.findMany({ include: { floor: true } })
  res.json({ rooms })
})

router.post('/rooms', async (req: AuthRequest, res: Response) => {
  const room = await prisma.room.create({ data: req.body })
  res.status(201).json({ room })
})

router.put('/rooms/:id', async (req: AuthRequest, res: Response) => {
  const room = await prisma.room.update({ where: { id: req.params.id }, data: req.body })
  res.json({ room })
})

router.delete('/rooms/:id', async (req: AuthRequest, res: Response) => {
  await prisma.room.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// Faculty CRUD
router.get('/faculty', async (_req: Request, res: Response) => {
  const faculty = await prisma.faculty.findMany({ include: { department: true } })
  res.json({ faculty })
})

router.post('/faculty', async (req: AuthRequest, res: Response) => {
  const faculty = await prisma.faculty.create({ data: req.body })
  res.status(201).json({ faculty })
})

router.put('/faculty/:id', async (req: AuthRequest, res: Response) => {
  const faculty = await prisma.faculty.update({ where: { id: req.params.id }, data: req.body })
  res.json({ faculty })
})

router.delete('/faculty/:id', async (req: AuthRequest, res: Response) => {
  await prisma.faculty.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// Groups CRUD
router.get('/groups-crud', async (_req: Request, res: Response) => {
  const groups = await prisma.group.findMany({ include: { department: true } })
  res.json({ groups })
})

router.post('/groups-crud', async (req: AuthRequest, res: Response) => {
  const group = await prisma.group.create({ data: req.body })
  res.status(201).json({ group })
})

router.put('/groups-crud/:id', async (req: AuthRequest, res: Response) => {
  const group = await prisma.group.update({ where: { id: req.params.id }, data: req.body })
  res.json({ group })
})

router.delete('/groups-crud/:id', async (req: AuthRequest, res: Response) => {
  await prisma.group.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// Departments CRUD
router.get('/departments', async (_req: Request, res: Response) => {
  const departments = await prisma.department.findMany()
  res.json({ departments })
})

router.post('/departments', async (req: AuthRequest, res: Response) => {
  const department = await prisma.department.create({ data: req.body })
  res.status(201).json({ department })
})

router.put('/departments/:id', async (req: AuthRequest, res: Response) => {
  const department = await prisma.department.update({ where: { id: req.params.id }, data: req.body })
  res.json({ department })
})

router.delete('/departments/:id', async (req: AuthRequest, res: Response) => {
  await prisma.department.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// Blocks CRUD
router.get('/blocks-crud', async (_req: Request, res: Response) => {
  const blocks = await prisma.block.findMany({ include: { floors: true } })
  res.json({ blocks })
})

router.post('/blocks-crud', async (req: AuthRequest, res: Response) => {
  const block = await prisma.block.create({ data: req.body })
  res.status(201).json({ block })
})

router.put('/blocks-crud/:id', async (req: AuthRequest, res: Response) => {
  const block = await prisma.block.update({ where: { id: req.params.id }, data: req.body })
  res.json({ block })
})

router.delete('/blocks-crud/:id', async (req: AuthRequest, res: Response) => {
  await prisma.block.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
