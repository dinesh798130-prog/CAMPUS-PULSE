import { Router, Response } from 'express'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'

const router = Router()
router.use(requireAuth)
router.use(requireRole('student', 'admin'))

// GET /api/me/timetable
router.get('/timetable', async (req: AuthRequest, res: Response) => {
  const group = req.user!.group
  if (!group) {
    res.status(400).json({ error: 'No group assigned to this student profile' })
    return
  }

  const groupRecord = await prisma.group.findUnique({ where: { name: group } })
  if (!groupRecord) {
    res.status(404).json({ error: 'Group record not found' })
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

// PATCH /api/me/notifications/:id/read
router.patch('/notifications/:id/read', async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.id },
    data: { read: true }
  })
  res.json({ ok: true })
})

// GET /api/me/export.ics
router.get('/export.ics', async (req: AuthRequest, res: Response) => {
  const group = req.user!.group
  if (!group) {
    res.status(400).json({ error: 'No group assigned' })
    return
  }

  const groupRecord = await prisma.group.findUnique({ where: { name: group } })
  if (!groupRecord) {
    res.status(404).json({ error: 'Group not found' })
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
    const startHourMin = entry.startTime.replace(':', '') + '00'
    const endHourMin = entry.endTime.replace(':', '') + '00'

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:campuspulse-${entry.id}@vignan.ac.in`)
    lines.push(`DTSTAMP:${stamp}`)
    lines.push(`SUMMARY:${entry.subject || 'Class'} (${group})`)
    lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`)
    lines.push(`LOCATION:${entry.roomId || 'Campus'}`)
    lines.push(`DESCRIPTION:Scheduled class for ${group} in ${entry.roomId || 'Room TBD'}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${group.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics"`)
  res.send(lines.join('\r\n'))
})

export default router
