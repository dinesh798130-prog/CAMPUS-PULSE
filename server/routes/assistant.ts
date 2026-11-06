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

interface Citation {
  entry_id?: string
  room_id?: string
  faculty_id?: string
  text: string
}

router.post('/query', async (req: Request, res: Response) => {
  const result = QuerySchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid question format.'
      }
    })
    return
  }

  const { question, day, time, group, room } = result.data
  const q = question.toLowerCase()

  // 1. Room availability question
  if (q.includes('free') || q.includes('available') || q.includes('empty') || q.includes('vacant')) {
    const hasDay = day || q.match(/\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday)\b/i)
    const hasTime = time || q.match(/\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/)

    if (!hasDay || !hasTime) {
      res.json({
        status: 'clarify',
        answer: 'To check room availability, please specify both a day (e.g. MON, TUE) and a time (e.g. 10:00, 14:30).',
        citations: [],
        clarify: ['Day of the week (e.g., Monday)', 'Time of day (e.g., 09:05)']
      })
      return
    }

    const targetDay = day ? day.toUpperCase() : (hasDay ? (hasDay[0].toUpperCase().substring(0, 3)) : 'MON')
    const targetTime = time || (hasTime ? hasTime[0] : '10:00')

    const busy = await prisma.entry.findMany({
      where: {
        day: targetDay,
        is_live: true,
        roomId: { not: null },
        startTime: { lte: targetTime },
        endTime: { gt: targetTime }
      },
      select: { id: true, roomId: true, subject: true, startTime: true, endTime: true }
    })

    const busySet = new Set(busy.map(b => b.roomId!))
    const freeRooms = await prisma.room.findMany({
      where: { id: { notIn: Array.from(busySet) } },
      select: { id: true, blockId: true, floor_num: true, confidence: true },
      take: 20
    })

    const citations: Citation[] = busy.slice(0, 3).map(b => ({
      entry_id: b.id,
      room_id: b.roomId || undefined,
      text: `Room ${b.roomId} occupied: ${b.subject || 'Class'} (${b.startTime}-${b.endTime})`
    }))

    res.json({
      status: 'answered',
      answer: `On ${targetDay} at ${targetTime}, ${freeRooms.length} rooms are free (including ${freeRooms.slice(0, 5).map(r => r.id).join(', ')}).`,
      citations,
      clarify: []
    })
    return
  }

  // 2. Group timetable inquiry
  if (group || q.includes('timetable') || q.includes('schedule') || q.includes('class') || q.includes('section') || q.includes('where is')) {
    let targetGroup = group
    if (!targetGroup) {
      if (q.includes('aiml-j') || q.includes('aiml j') || q.includes('ii aiml-j')) {
        targetGroup = 'II AIML-J'
      } else {
        const match = question.match(/(?:section|group|for|where is)\s+([A-Za-z0-9\s-]+?)(?:\s+(?:on|at|in)\b|\?|$)/i)
        targetGroup = match ? match[1].trim() : (q.includes('aiml') ? 'II AIML-J' : 'Unknown')
      }
    }

    const dbGroup = await prisma.group.findUnique({
      where: { name: targetGroup },
      include: { department: true }
    })

    if (!dbGroup) {
      res.json({
        status: 'no_data',
        answer: `Timetable data for "${targetGroup}" is not covered in the loaded department timetables (only ACSE / II AIML-J is currently imported).`,
        citations: [],
        clarify: ['Check spelling of group (e.g., II AIML-J)']
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

    const citations: Citation[] = entries.slice(0, 5).map(e => ({
      entry_id: e.id,
      room_id: e.roomId || undefined,
      text: `${e.day} ${e.startTime}-${e.endTime}: ${e.subject || 'Class'} in Room ${e.roomId || 'TBD'}`
    }))

    res.json({
      status: 'answered',
      answer: `Group ${dbGroup.name} has ${entries.length} scheduled classes across the week in the ACSE department timetable.`,
      citations,
      clarify: []
    })
    return
  }

  // 3. Room timetable inquiry
  if (room || q.includes('room')) {
    const match = question.match(/([A-Z]{1,6}-\d{1,4}|\b\d{3}\b)/i)
    const targetRoomId = room ? room.trim() : (match ? match[0].toUpperCase() : 'N-604')
    const dbRoom = await prisma.room.findUnique({ where: { id: targetRoomId } })

    if (!dbRoom) {
      res.json({
        status: 'no_data',
        answer: `Room "${targetRoomId}" is not present in the confirmed campus room directory.`,
        citations: [],
        clarify: ['Verify room code prefix (e.g. VBFF-1, N-604)']
      })
      return
    }

    const entries = await prisma.entry.findMany({
      where: { roomId: targetRoomId, is_live: true },
      include: { group: true },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
    })

    const citations: Citation[] = entries.slice(0, 5).map(e => ({
      entry_id: e.id,
      room_id: targetRoomId,
      text: `${e.day} ${e.startTime}-${e.endTime} assigned to ${e.group?.name || 'Academic Class'}`
    }))

    res.json({
      status: 'answered',
      answer: `Room ${targetRoomId} is scheduled for ${entries.length} class periods weekly.`,
      citations,
      clarify: []
    })
    return
  }

  res.json({
    status: 'clarify',
    answer: 'Please specify a room, student group (e.g. "II AIML-J"), or a day and time to check timetable availability.',
    citations: [],
    clarify: ['Specify section (e.g. II AIML-J)', 'Specify day & time (e.g. MON 10:05)', 'Specify room code (e.g. N-217)']
  })
})

export default router
