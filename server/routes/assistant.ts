import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'

const router = Router()

const QuerySchema = z.object({
  question: z.string().min(1).max(500),
  day: z.string().optional(),
  time: z.string().optional(),
  group: z.string().optional(),
  room: z.string().optional()
})

router.post('/query', async (req: Request, res: Response) => {
  const result = QuerySchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: 'Invalid query format' })
    return
  }

  const { question, day, time, group, room } = result.data
  const q = question.toLowerCase()

  // 1. Room availability question
  if (q.includes('free') || q.includes('available') || q.includes('empty') || q.includes('vacant')) {
    const targetDay = (day ? day.toUpperCase() : 'MON')
    const targetTime = time || '09:00'

    const busy = await prisma.entry.findMany({
      where: {
        day: targetDay,
        is_live: true,
        roomId: { not: null },
        startTime: { lte: targetTime },
        endTime: { gt: targetTime }
      },
      select: { roomId: true, subject: true, startTime: true, endTime: true }
    })

    const busySet = new Set(busy.map(b => b.roomId!))
    const freeRooms = await prisma.room.findMany({
      where: { id: { notIn: Array.from(busySet) } },
      select: { id: true, blockId: true, floor_num: true, confidence: true },
      take: 20
    })

    res.json({
      answered: true,
      type: 'availability',
      message: `Found ${freeRooms.length} verified free rooms on ${targetDay} at ${targetTime}.`,
      data: { day: targetDay, time: targetTime, freeRooms },
      citations: [`Verified against ${busy.length} active scheduled slots on ${targetDay}`]
    })
    return
  }

  // 2. Group timetable inquiry
  if (group || q.includes('timetable') || q.includes('schedule') || q.includes('class') || q.includes('section')) {
    let targetGroup = group;
    if (!targetGroup) {
      if (q.includes('aiml-j') || q.includes('aiml j') || q.includes('ii aiml')) {
        targetGroup = 'II AIML-J';
      } else {
        // Extract section or other name if mentioned, e.g. "Mechanical 4B"
        const match = question.match(/(?:section|group|for)\s+([A-Za-z0-9\s-]+)/i);
        targetGroup = match ? match[1].trim() : (q.includes('aiml') ? 'II AIML-J' : 'Unknown');
      }
    }

    const dbGroup = await prisma.group.findUnique({
      where: { name: targetGroup },
      include: { department: true }
    });

    if (!dbGroup) {
      res.json({
        answered: false,
        type: 'no_data',
        message: `No timetable records found for group "${targetGroup}". The department file contains confirmed records for II AIML-J only.`,
        citations: []
      })
      return
    }

    const entries = await prisma.entry.findMany({
      where: { groupId: dbGroup.id, is_live: true },
      include: {
        room: { select: { id: true, blockId: true } },
        faculty: { select: { id: true, name: true } }
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
    })

    res.json({
      answered: true,
      type: 'group_timetable',
      message: `Showing ${entries.length} weekly classes for ${dbGroup.name} (${dbGroup.department.name}).`,
      data: { group: dbGroup.name, entries },
      citations: [`ACSE Department Timetable V7 w.e.f. 17-08-2026 (${entries.length} verified entries)`]
    })
    return
  }

  // 3. Room timetable inquiry
  if (room || q.includes('room')) {
    const targetRoomId = (room ? room.trim() : 'N-604')
    const dbRoom = await prisma.room.findUnique({ where: { id: targetRoomId } })

    if (!dbRoom) {
      res.json({
        answered: false,
        type: 'no_data',
        message: `Room "${targetRoomId}" is not in the confirmed room inventory.`,
        citations: []
      })
      return
    }

    const entries = await prisma.entry.findMany({
      where: { roomId: targetRoomId, is_live: true },
      include: { group: true },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
    })

    res.json({
      answered: true,
      type: 'room_timetable',
      message: `Room ${targetRoomId} has ${entries.length} scheduled class periods.`,
      data: { room: targetRoomId, entries },
      citations: [`Verified room allocations from department timetable`]
    })
    return
  }

  res.json({
    answered: false,
    type: 'needs_detail',
    message: 'I can only answer questions from stored department timetable data. Please specify a room, group (e.g. "II AIML-J"), or day/time to check availability.',
    citations: []
  })
})

export default router
