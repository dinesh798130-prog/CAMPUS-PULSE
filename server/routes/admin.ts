import { Router, Request, Response } from 'express'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { log } from '../lib/logger.js'
import multer from 'multer'
import path from 'path'
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

const DAY_MAP_FROM_NUM: Record<number, string> = {
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
  7: 'SUN'
}

// POST /api/admin/timetable/import
router.post('/timetable/import', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }

  // Magic bytes check for zip/xlsx (PK\x03\x04)
  const fd = fs.openSync(req.file.path, 'r')
  const header = Buffer.alloc(4)
  fs.readSync(fd, header, 0, 4, 0)
  fs.closeSync(fd)

  if (header[0] !== 0x50 || header[1] !== 0x4b) {
    fs.unlinkSync(req.file.path)
    res.status(400).json({ error: 'Uploaded file is not a valid Excel (.xlsx) file (invalid magic bytes)' })
    return
  }

  const fileBytes = fs.readFileSync(req.file.path)
  const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex')

  const existing = await prisma.sourceFile.findUnique({ where: { sha256 } })
  if (existing) {
    fs.unlinkSync(req.file.path)
    res.status(409).json({
      error: 'This file has already been imported',
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
    note: 'Staged successfully. Call /commit to publish to live schedule.'
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
    res.status(404).json({ error: 'Source file not found' })
    return
  }

  if (sourceFile.status === 'committed') {
    res.status(409).json({ error: 'Source file is already committed' })
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

const DisruptionSchema = z.object({
  entryId: z.string().optional(),
  roomId: z.string().optional(),
  type: z.enum(['cancellation', 'room_closure', 'faculty_change']),
  reason: z.string().optional(),
  affectedDay: z.string(),
  startTime: z.string(),
  endTime: z.string()
})

// POST /api/admin/disruptions
router.post('/disruptions', async (req: AuthRequest, res: Response) => {
  const parsed = DisruptionSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors })
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

  // Load all live entries
  const allEntries = await prisma.entry.findMany({
    where: { is_live: true }
  })

  // Build scheduled entries for engine
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

  const allDisruptions = await prisma.disruption.findMany({
    where: { status: 'open' }
  })

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
    capacity: 60
  }))

  // Map to candidate rooms
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

// POST /api/admin/proposals/:id/approve
router.post('/proposals/:id/approve', async (req: AuthRequest, res: Response) => {
  const proposal = await prisma.proposal.findUnique({
    where: { id: req.params.id },
    include: { disruption: true }
  })

  if (!proposal) {
    res.status(404).json({ error: 'Proposal not found' })
    return
  }

  if (proposal.status !== 'pending') {
    res.status(409).json({ error: `Proposal is already ${proposal.status}` })
    return
  }

  // Hard re-check constraint: ensure proposed room is currently free!
  const targetDay = proposal.newDay || proposal.disruption.affectedDay
  const targetStart = proposal.newStartTime || proposal.disruption.startTime
  const targetEnd = proposal.newEndTime || proposal.disruption.endTime

  if (proposal.roomId) {
    const conflict = await prisma.entry.findFirst({
      where: {
        roomId: proposal.roomId,
        day: targetDay,
        is_live: true,
        NOT: [
          { endTime: { lte: targetStart } },
          { startTime: { gte: targetEnd } }
        ]
      }
    })

    if (conflict) {
      await prisma.proposal.update({
        where: { id: req.params.id },
        data: { status: 'stale' }
      })
      res.status(409).json({
        error: 'Hard constraint check failed: Room has become occupied since proposal was generated',
        status: 'stale'
      })
      return
    }
  }

  // Apply approval
  await prisma.proposal.update({
    where: { id: req.params.id },
    data: {
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: req.user!.id
    }
  })

  // Mark other proposals for this disruption as rejected
  await prisma.proposal.updateMany({
    where: {
      disruptionId: proposal.disruptionId,
      id: { not: req.params.id }
    },
    data: { status: 'rejected' }
  })

  // Resolve disruption
  await prisma.disruption.update({
    where: { id: proposal.disruptionId },
    data: { status: 'resolved' }
  })

  // If disruption was linked to an entry, update room on entry
  if (proposal.disruption.entryId && proposal.roomId) {
    await prisma.entry.update({
      where: { id: proposal.disruption.entryId },
      data: { roomId: proposal.roomId }
    })
  }

  // Notify students
  let notifiedCount = 0
  if (proposal.disruption.entryId) {
    const entry = await prisma.entry.findUnique({
      where: { id: proposal.disruption.entryId },
      include: { group: true }
    })
    if (entry?.group?.name) {
      const students = await prisma.user.findMany({
        where: { group: entry.group.name }
      })
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

  // Audit log
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
    res.status(404).json({ error: 'Proposal not found' })
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

// GET /api/admin/audit-log
router.get('/audit-log', async (_req: Request, res: Response) => {
  const logs = await prisma.auditLog.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })
  res.json({ logs })
})

export default router
