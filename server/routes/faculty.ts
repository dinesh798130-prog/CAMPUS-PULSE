import { Router, Response } from 'express'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'

const router = Router()
router.use(requireAuth)
router.use(requireRole('faculty', 'admin'))

// GET /api/faculty/me/timetable
router.get('/timetable', async (req: AuthRequest, res: Response) => {
  const facultyId = req.user!.facultyId
  if (!facultyId && req.user!.role !== 'admin') {
    res.status(400).json({ error: 'No faculty record linked to this account' })
    return
  }

  const entries = await prisma.entry.findMany({
    where: {
      ...(facultyId ? { facultyId } : {}),
      is_live: true
    },
    include: {
      room: { select: { id: true, blockId: true, floorId: true } },
      group: true
    },
    orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
  })

  res.json({ entries })
})

// GET /api/faculty/me/changes
router.get('/changes', async (req: AuthRequest, res: Response) => {
  const facultyId = req.user!.facultyId

  const disruptions = await prisma.disruption.findMany({
    where: {
      ...(facultyId ? { entry: { facultyId } } : {}),
      status: { in: ['open', 'resolved'] }
    },
    include: {
      entry: true,
      proposals: true
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json({ changes: disruptions })
})

export default router
