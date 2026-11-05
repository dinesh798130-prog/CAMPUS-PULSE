import { Router, Request, Response } from 'express'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'

const router = Router()
router.use(requireAuth)
router.use(requireRole('student', 'admin'))

// GET /api/me/group
router.get('/group', async (req: AuthRequest, res: Response) => {
  res.json({ group: req.user!.group || null })
})

// PUT /api/me/group - update student's enrolled section
const GroupUpdateSchema = z.object({
  group: z.string().min(1)
})

router.put('/group', async (req: AuthRequest, res: Response) => {
  const result = GroupUpdateSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A valid group name is required.'
      }
    })
    return
  }

  const { group } = result.data
  const groupRecord = await prisma.group.findUnique({ where: { name: group } })
  if (!groupRecord) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Group "${group}" does not exist in the academic directory.`
      }
    })
    return
  }

  await prisma.user.update({
    where: { id: req.user!.id },
    data: { group }
  })

  req.user!.group = group
  res.json({ ok: true, group })
})

// GET /api/me/timetable
router.get('/timetable', async (req: AuthRequest, res: Response) => {
  const group = req.user!.group
  if (!group) {
    res.status(400).json({
      error: {
        code: 'NO_GROUP_ASSIGNED',
        message: 'No student section group is associated with this account.'
      }
    })
    return
  }

  const groupRecord = await prisma.group.findUnique({ where: { name: group } })
  if (!groupRecord) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Group "${group}" not found in system records.`
      }
    })
    return
  }

  const entries = await prisma.entry.findMany({
    where: { groupId: groupRecord.id, is_live: true },
    include: {
      room: { select: { id: true, blockId: true, floorId: true } },
      faculty: { select: { id: true, name: true } }
    },
    orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
  })

  res.json({ group: groupRecord.name, entries })
})

// GET /api/me/notifications
router.get('/notifications', async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
  res.json({ notifications })
})

// POST /api/me/notifications/:id/read
router.post('/notifications/:id/read', async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  await prisma.notification.updateMany({
    where: { id, userId: req.user!.id },
    data: { read: true }
  })
  res.json({ ok: true, id, read: true })
})

// GET /api/me/export.ics
router.get('/export.ics', async (req: AuthRequest, res: Response) => {
  const group = req.user!.group
  if (!group) {
    res.status(400).json({
      error: {
        code: 'NO_GROUP_ASSIGNED',
        message: 'No group assigned to export schedule.'
      }
    })
    return
  }

  const groupRecord = await prisma.group.findUnique({ where: { name: group } })
  if (!groupRecord) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Group not found.'
      }
    })
    return
  }

  const entries = await prisma.entry.findMany({
    where: { groupId: groupRecord.id, is_live: true },
    include: { room: true }
  })

  const dayMap: Record<string, string> = {
    MON: 'MO',
    TUE: 'TU',
    WED: 'WE',
    THU: 'TH',
    FRI: 'FR',
    SAT: 'SA'
  }

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CampusPulse//VFSTR//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-TIMEZONE:Asia/Kolkata'
  ]

  const now = new Date()
  const stamp = now.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'

  for (const entry of entries) {
    const byDay = dayMap[entry.day] || 'MO'
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:campuspulse-${entry.id}@vignan.ac.in`)
    lines.push(`DTSTAMP:${stamp}`)
    lines.push(`SUMMARY:${entry.subject || 'Class'} (${group})`)
    lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`)
    lines.push(`LOCATION:${entry.roomId || 'Campus'}`)
    lines.push(`DESCRIPTION:Scheduled session for ${group} in ${entry.roomId || 'TBD'}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${group.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics"`)
  res.send(lines.join('\r\n'))
})

export default router
